from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import pickle
import numpy as np
import os
import shap
from backend.app import db
from backend.models.user import User
from backend.models.quote import Quote
from backend.services.feature_mapping import extract_features, EXPECTED_FEATURES
from backend.services.pricing_service import calculate_premium

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
    Make insurance prediction - works with or without authentication
    If authenticated, saves quote to user's history
    """
    try:
        if model is None:
            return jsonify({
                'error': 'Model not loaded',
                'status': 'error'
            }), 500
        
        data = request.get_json()
        
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
        
        # If user is authenticated, save quote to history
        try:
            # Check if request has JWT token (optional)
            from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
            
            if current_user_id:
                user = User.query.get(int(current_user_id))
                if user:
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
        except Exception as e:
            # JWT verification failed or user not found - continue without saving
            print(f"Note: Could not save to user history: {e}")
            response_data['saved_to_history'] = False
        
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