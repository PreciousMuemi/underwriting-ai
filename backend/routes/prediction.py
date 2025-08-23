from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
import pickle
import numpy as np
import os
import shap
from backend.app import db
from backend.models.user import User
from backend.models.quote import Quote
from backend.services.feature_mapping import extract_features, EXPECTED_FEATURES
from backend.services.pricing_service import calculate_premium
from backend.routes.email import send_quote_email
from backend.routes.pdf import create_quote_pdf

prediction_bp = Blueprint('prediction', __name__)

# Load the trained XGBoost model
model_path = os.path.join('models', 'xgboost_risk_model.pkl')
try:
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    print("✅ XGBoost model loaded successfully")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

def _risk_level_from_score(score: int) -> str:
    mapping = {0: 'Low', 1: 'Medium', 2: 'High'}
    return mapping.get(score, 'Unknown')

@prediction_bp.route('/predict', methods=['POST'])
def predict():
    """
    Make insurance prediction - AUTH REQUIRED.
    Saves quote to user's history and can email it (optionally attaching a PDF).
    Request body supports flags:
      - email_send: bool (default True)
      - attach_pdf: bool (default False)
    """
    try:
        # Enforce authentication for demo: no unauthenticated quotes
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()

        if model is None:
            return jsonify({
                'error': 'Model not loaded',
                'status': 'error'
            }), 500
        
        data = request.get_json()
        data = data or {}
        
        # Extract & validate features
        feature_values, missing = extract_features(data)
        if missing:
            return jsonify({'error': f"Missing required field(s): {', '.join(missing)}", 'status': 'error'}), 400
        
        # Convert to numpy array and reshape for prediction
        X = np.array(feature_values).reshape(1, -1)
        
        # Make prediction
        risk_prediction = model.predict(X)[0]
        risk_score = int(risk_prediction)

        # Confidence (best-effort)
        confidence = None
        try:
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba(X)
                if proba is not None and len(proba.shape) == 2:
                    confidence = float(np.max(proba[0]))
        except Exception:
            confidence = None
        
        # Extract enhanced risk factors if provided
        credit_score = data.get('credit_score')
        driving_patterns = data.get('driving_patterns')
        
        # Pricing engine breakdown
        pricing = calculate_premium(risk_score, data, credit_score, driving_patterns)
        quote = pricing['total']
        risk_level = _risk_level_from_score(risk_score)
        
        response_data = {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'quote': quote,
            'status': 'success',
            'pricing_breakdown': pricing['breakdown']
        }
        if confidence is not None:
            response_data['confidence'] = confidence
        
        # Save quote to authenticated user's history and optionally email/PDF
        user = User.query.get(int(current_user_id))
        if not user:
            return jsonify({'error': 'User not found', 'status': 'error'}), 404

        email_send = bool(data.get('email_send', True))
        attach_pdf = bool(data.get('attach_pdf', False))

        # Save quote to database
        quote_record = Quote(
            user_id=user.id,
            input_data=data,
            risk_score=risk_score,
            risk_level=risk_level,
            quote_amount=quote,
            credit_score=credit_score,
            driving_patterns=driving_patterns
        )
        db.session.add(quote_record)
        db.session.commit()

        response_data['quote_id'] = quote_record.id
        response_data['saved_to_history'] = True

        # Optionally generate PDF and send email
        pdf_path = None
        if attach_pdf:
            try:
                pdf_path = create_quote_pdf(user, quote_record, user.language_preference)
                if pdf_path:
                    quote_record.pdf_generated = True
                    quote_record.pdf_path = pdf_path
                    db.session.commit()
                    response_data['pdf_generated'] = True
                else:
                    response_data['pdf_generated'] = False
            except Exception as e:
                print(f"PDF generation failed: {e}")
                response_data['pdf_generated'] = False

        if email_send:
            try:
                # extend email helper to attach pdf when available
                success = send_quote_email(user, quote_record, user.language_preference, attachment_path=pdf_path)
                response_data['email_sent'] = bool(success)
            except Exception as e:
                print(f"Email send failed: {e}")
                response_data['email_sent'] = False
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@prediction_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'service': 'prediction'
    })

@prediction_bp.route('/risk/explain', methods=['POST'])
def explain():
    """Return SHAP explanations for a single payload."""
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded', 'status': 'error'}), 500
        payload = request.get_json() or {}
        values, missing = extract_features(payload)
        if missing:
            return jsonify({'error': f"Missing required field(s): {', '.join(missing)}", 'status': 'error'}), 400

        X = np.array(values).reshape(1, -1)
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)
        base_value = explainer.expected_value

        # Handle multi-class vs single output
        if isinstance(shap_values, list):
            # pick the class with max predicted logit/score for simplicity
            class_index = int(np.argmax([np.dot(sv, X[0]) for sv in shap_values]))
            sv = shap_values[class_index][0]
            base = base_value[class_index] if isinstance(base_value, (list, np.ndarray)) else base_value
        else:
            sv = shap_values[0]
            base = base_value if not isinstance(base_value, (list, np.ndarray)) else float(base_value[0])

        contribs = [{'feature': name, 'shap_value': float(val), 'abs': float(abs(val))}
                    for name, val in zip(EXPECTED_FEATURES, sv)]
        top = sorted(contribs, key=lambda x: x['abs'], reverse=True)[:5]

        return jsonify({
            'status': 'success',
            'base_value': float(base),
            'top_contributions': top
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500