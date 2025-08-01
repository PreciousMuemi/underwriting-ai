import pickle
import numpy as np
import os
from typing import Dict, Any, Optional, Tuple

class MLService:
    """Machine Learning service for risk prediction"""
    
    def __init__(self, model_path: str = None):
        self.model = None
        self.model_path = model_path or os.path.join('models', 'xgboost_risk_model.pkl')
        self.load_model()
    
    def load_model(self):
        """Load the trained XGBoost model"""
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            print("✅ XGBoost model loaded successfully")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            self.model = None
    
    def validate_features(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate that all required features are present"""
        required_features = [
            'KIDSDRIV', 'BIRTH', 'AGE', 'HOMEKIDS', 'YOJ', 'INCOME', 'PARENT1',
            'HOME_VAL', 'MSTATUS', 'GENDER', 'EDUCATION', 'OCCUPATION', 'TRAVTIME',
            'CAR_USE', 'BLUEBOOK', 'TIF', 'CAR_TYPE', 'RED_CAR', 'OLDCLAIM',
            'CLM_FREQ', 'REVOKED', 'MVR_PTS', 'CLM_AMT', 'CAR_AGE', 'URBANICITY'
        ]
        
        missing_features = [f for f in required_features if f not in data]
        
        if missing_features:
            return False, f"Missing required fields: {', '.join(missing_features)}"
        
        return True, None
    
    def predict_risk(self, data: Dict[str, Any]) -> Tuple[bool, Optional[int], Optional[str]]:
        """
        Predict risk score for given input data
        
        Returns:
            (success, risk_score, error_message)
        """
        if self.model is None:
            return False, None, "Model not loaded"
        
        # Validate features
        is_valid, error_msg = self.validate_features(data)
        if not is_valid:
            return False, None, error_msg
        
        try:
            # Extract features in the correct order
            features = [
                'KIDSDRIV', 'BIRTH', 'AGE', 'HOMEKIDS', 'YOJ', 'INCOME', 'PARENT1',
                'HOME_VAL', 'MSTATUS', 'GENDER', 'EDUCATION', 'OCCUPATION', 'TRAVTIME',
                'CAR_USE', 'BLUEBOOK', 'TIF', 'CAR_TYPE', 'RED_CAR', 'OLDCLAIM',
                'CLM_FREQ', 'REVOKED', 'MVR_PTS', 'CLM_AMT', 'CAR_AGE', 'URBANICITY'
            ]
            
            feature_values = [data[feature] for feature in features]
            
            # Convert to numpy array and reshape for prediction
            X = np.array(feature_values).reshape(1, -1)
            
            # Make prediction
            risk_prediction = self.model.predict(X)[0]
            risk_score = int(risk_prediction)
            
            return True, risk_score, None
            
        except Exception as e:
            return False, None, f"Prediction error: {str(e)}"
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded and ready"""
        return self.model is not None

# Global ML service instance
ml_service = MLService()