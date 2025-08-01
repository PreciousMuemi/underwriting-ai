from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import pickle
import numpy as np
import pandas as pd
import os
from backend.app import db
from backend.models.user import User
from backend.models.quote import Quote

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

def generate_enhanced_quote(risk_score, user_data, credit_score=None, driving_patterns=None):
    """
    Enhanced quote generation with additional risk factors
    """
    # Base premium (KES)
    base_premium = 8000
    
    # Risk multipliers
    if risk_score == 0:  # Low risk
        risk_multiplier = 0.8
    elif risk_score == 1:  # Medium risk
        risk_multiplier = 1.2
    else:  # High risk
        risk_multiplier = 1.8
    
    # Age factor
    age_factor = 1.0
    if user_data.get('AGE', 25) < 25:
        age_factor = 1.3  # Young drivers pay more
    elif user_data.get('AGE', 25) > 50:
        age_factor = 0.9  # Experienced drivers pay less
    
    # Car value factor
    car_value = user_data.get('BLUEBOOK', 7000)
    if car_value > 15000:
        car_value_factor = 1.2
    elif car_value < 5000:
        car_value_factor = 0.9
    else:
        car_value_factor = 1.0
    
    # Previous claims factor
    claims_factor = 1.0 + (user_data.get('CLM_FREQ', 0) * 0.2)
    
    # Credit score factor (new enhancement)
    credit_factor = 1.0
    if credit_score is not None:
        if credit_score >= 750:
            credit_factor = 0.9  # Excellent credit reduces premium
        elif credit_score >= 650:
            credit_factor = 1.0  # Good credit neutral
        elif credit_score >= 550:
            credit_factor = 1.1  # Fair credit increases premium
        else:
            credit_factor = 1.3  # Poor credit significantly increases premium
    
    # Driving patterns factor (new enhancement)
    driving_factor = 1.0
    if driving_patterns:
        speeding_incidents = driving_patterns.get('speeding_incidents', 0)
        harsh_braking = driving_patterns.get('harsh_braking_freq', 0)
        aggressive_acceleration = driving_patterns.get('aggressive_acceleration', 0)
        
        # Each negative driving behavior adds to the factor
        driving_factor += (speeding_incidents * 0.05)  # 5% per speeding incident
        driving_factor += (harsh_braking * 0.03)       # 3% per harsh braking event
        driving_factor += (aggressive_acceleration * 0.02)  # 2% per aggressive acceleration
        
        # Cap the driving factor at 1.5 (50% increase max)
        driving_factor = min(driving_factor, 1.5)
    
    # Calculate final quote
    quote = int(base_premium * risk_multiplier * age_factor * car_value_factor * 
                claims_factor * credit_factor * driving_factor)
    
    return max(quote, 5000)  # Minimum premium of KES 5,000

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
        
        # Define expected features in the correct order
        features = [
            'KIDSDRIV', 'BIRTH', 'AGE', 'HOMEKIDS', 'YOJ', 'INCOME', 'PARENT1',
            'HOME_VAL', 'MSTATUS', 'GENDER', 'EDUCATION', 'OCCUPATION', 'TRAVTIME',
            'CAR_USE', 'BLUEBOOK', 'TIF', 'CAR_TYPE', 'RED_CAR', 'OLDCLAIM',
            'CLM_FREQ', 'REVOKED', 'MVR_PTS', 'CLM_AMT', 'CAR_AGE', 'URBANICITY'
        ]
        
        # Extract features from the request data
        feature_values = []
        for feature in features:
            if feature in data:
                feature_values.append(data[feature])
            else:
                return jsonify({
                    'error': f'Missing required field: {feature}',
                    'status': 'error'
                }), 400
        
        # Convert to numpy array and reshape for prediction
        X = np.array(feature_values).reshape(1, -1)
        
        # Make prediction
        risk_prediction = model.predict(X)[0]
        risk_score = int(risk_prediction)
        
        # Extract enhanced risk factors if provided
        credit_score = data.get('credit_score')
        driving_patterns = data.get('driving_patterns')
        
        # Generate enhanced quote
        quote = generate_enhanced_quote(risk_score, data, credit_score, driving_patterns)
        
        # Risk level mapping
        risk_levels = {0: 'Low', 1: 'Medium', 2: 'High'}
        risk_level = risk_levels.get(risk_score, 'Unknown')
        
        response_data = {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'quote': quote,
            'status': 'success'
        }
        
        # If user is authenticated, save quote to history
        try:
            # Check if request has JWT token (optional)
            from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
            
            if current_user_id:
                user = User.query.get(current_user_id)
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