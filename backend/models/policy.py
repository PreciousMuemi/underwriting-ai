from datetime import datetime, timedelta
from backend.app import db

class Policy(db.Model):
    __tablename__ = 'policies'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    quote_id = db.Column(db.Integer, db.ForeignKey('quotes.id'), nullable=False)

    policy_number = db.Column(db.String(64), unique=True, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='bound')  # quoted -> bound -> issued

    premium = db.Column(db.Integer, nullable=False)
    coverage = db.Column(db.JSON, nullable=True)

    # Motor insurance specific metadata (snapshot at bind/issue time)
    vehicle_category = db.Column(db.String(20), nullable=True)  # private, commercial, psv, motorcycle, special
    cover_type = db.Column(db.String(20), nullable=True)  # tpo, tpft, comprehensive
    add_ons = db.Column(db.JSON, nullable=True)  # selected extensions
    term_months = db.Column(db.Integer, nullable=False, default=12)

    # KYC and pre-issuance flags
    kyc_status = db.Column(db.String(20), nullable=False, default='pending')  # pending, verified
    valuation_required = db.Column(db.Boolean, nullable=False, default=False)
    mechanical_assessment_required = db.Column(db.Boolean, nullable=False, default=False)

    effective_date = db.Column(db.DateTime, nullable=False)
    expiry_date = db.Column(db.DateTime, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    issued_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'policy_number': self.policy_number,
            'status': self.status,
            'user_id': self.user_id,
            'quote_id': self.quote_id,
            'premium': self.premium,
            'coverage': self.coverage,
            'vehicle_category': self.vehicle_category,
            'cover_type': self.cover_type,
            'add_ons': self.add_ons,
            'term_months': self.term_months,
            'kyc_status': self.kyc_status,
            'valuation_required': self.valuation_required,
            'mechanical_assessment_required': self.mechanical_assessment_required,
            'effective_date': self.effective_date.isoformat(),
            'expiry_date': self.expiry_date.isoformat(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'issued_at': self.issued_at.isoformat() if self.issued_at else None,
        }
