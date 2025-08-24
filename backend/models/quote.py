from datetime import datetime
from backend.app import db

class Quote(db.Model):
    __tablename__ = 'quotes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Input data (JSON field for flexibility)
    input_data = db.Column(db.JSON, nullable=False)
    
    # Prediction results
    risk_score = db.Column(db.Integer, nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)  # Low, Medium, High
    quote_amount = db.Column(db.Integer, nullable=False)  # in KES
    
    # Enhanced risk factors (optional)
    credit_score = db.Column(db.Integer, nullable=True)
    driving_patterns = db.Column(db.JSON, nullable=True)  # speeding, harsh braking, etc.

    # Motor insurance specific metadata
    vehicle_category = db.Column(db.String(20), nullable=True)  # private, commercial, psv, motorcycle, special
    cover_type = db.Column(db.String(20), nullable=True)  # tpo, tpft, comprehensive
    add_ons = db.Column(db.JSON, nullable=True)  # list/dict of extensions e.g., excess_protector, pv&t, etc.
    term_months = db.Column(db.Integer, nullable=False, default=12)

    # KYC and pre-issuance flags (for downstream policy binding)
    kyc_status = db.Column(db.String(20), nullable=False, default='pending')  # pending, verified
    valuation_required = db.Column(db.Boolean, nullable=False, default=False)
    mechanical_assessment_required = db.Column(db.Boolean, nullable=False, default=False)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    email_sent = db.Column(db.Boolean, default=False)
    pdf_generated = db.Column(db.Boolean, default=False)
    pdf_path = db.Column(db.String(255), nullable=True)
    
    def to_dict(self):
        """Convert quote to dictionary for JSON responses"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'input_data': self.input_data,
            'risk_score': self.risk_score,
            'risk_level': self.risk_level,
            'quote_amount': self.quote_amount,
            'credit_score': self.credit_score,
            'driving_patterns': self.driving_patterns,
            'vehicle_category': self.vehicle_category,
            'cover_type': self.cover_type,
            'add_ons': self.add_ons,
            'term_months': self.term_months,
            'kyc_status': self.kyc_status,
            'valuation_required': self.valuation_required,
            'mechanical_assessment_required': self.mechanical_assessment_required,
            'created_at': self.created_at.isoformat(),
            'email_sent': self.email_sent,
            'pdf_generated': self.pdf_generated,
            'pdf_path': self.pdf_path
        }
    
    def __repr__(self):
        return f'<Quote {self.id} - User {self.user_id} - {self.quote_amount} KES>'