from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import pandas as pd
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Load the trained XGBoost model
model_path = os.path.join('models', 'xgboost_risk_model.pkl')
try:
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    print("✅ XGBoost model loaded successfully")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

def generate_quote(risk_score, user_data):
    """
    Generate insurance quote based on risk score and user data
    Lower risk = lower premium, higher risk = higher premium
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
    
    # Additional factors
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
    
    # Calculate final quote
    quote = int(base_premium * risk_multiplier * age_factor * car_value_factor * claims_factor)
    
    return max(quote, 5000)  # Minimum premium of KES 5,000

@app.route('/predict', methods=['POST'])
def predict():
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
        
        # Generate quote based on risk and user data
        quote = generate_quote(risk_score, data)
        
        # Risk level mapping
        risk_levels = {0: 'Low', 1: 'Medium', 2: 'High'}
        risk_level = risk_levels.get(risk_score, 'Unknown')
        
        return jsonify({
            'risk_score': risk_score,
            'risk_level': risk_level,
            'quote': quote,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)