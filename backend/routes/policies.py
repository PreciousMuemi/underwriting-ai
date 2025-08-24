from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from backend.app import db
from backend.services.validators import issuance_prechecks, compute_vehicle_age
from backend.services.reference.loader import get_motor_reference
from backend.models.user import User
from backend.models.quote import Quote
from backend.models.policy import Policy

policies_bp = Blueprint('policies', __name__)


def _gen_policy_number(user_id: int, quote_id: int) -> str:
    ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    return f"POL-{user_id}-{quote_id}-{ts}"


@policies_bp.route('/policies/bind', methods=['POST'])
@jwt_required()
def bind_policy():
    """
    Bind a policy from an existing quote (must belong to the current user).
    Body: { quote_id: int, effective_date?: ISO str, term_days?: int, coverage?: json }
    Returns the created Policy.
    """
    data = request.get_json() or {}
    quote_id = data.get('quote_id')
    if not quote_id:
        return jsonify({'error': "'quote_id' is required"}), 400

    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    quote = Quote.query.filter_by(id=quote_id, user_id=user.id).first()
    if not quote:
        return jsonify({'error': 'Quote not found'}), 404

    # Dates
    term_days = int(data.get('term_days', 365))
    eff_str = data.get('effective_date')
    effective_date = None
    if eff_str:
        try:
            effective_date = datetime.fromisoformat(eff_str)
        except Exception:
            return jsonify({'error': 'Invalid effective_date format; use ISO-8601'}), 400
    if not effective_date:
        effective_date = datetime.utcnow()
    expiry_date = effective_date + timedelta(days=term_days)

    # Create policy
    ref = get_motor_reference()
    rules = ref.get('issuance_rules', {})
    # Snapshot motor fields from quote if present
    vehicle_category = quote.vehicle_category
    cover_type = quote.cover_type
    add_ons = quote.add_ons
    term_months = quote.term_months or 12

    # Pre-issuance flags (computed)
    # Valuation required for certain cover types
    val_rule = rules.get('valuation', {})
    valuation_required = bool(cover_type in set(val_rule.get('required_for_cover_types', [])))
    # Mechanical assessment required for older vehicles
    mech_rule = rules.get('mechanical_assessment', {})
    min_age = mech_rule.get('min_age')
    veh_age = compute_vehicle_age(data.get('coverage') or {})
    mechanical_assessment_required = bool(isinstance(min_age, int) and min_age > 0 and veh_age >= min_age)

    policy = Policy(
        user_id=user.id,
        quote_id=quote.id,
        policy_number=_gen_policy_number(user.id, quote.id),
        status='bound',
        premium=quote.quote_amount,
        coverage=data.get('coverage') or {},
        effective_date=effective_date,
        expiry_date=expiry_date,
        # snapshot
        vehicle_category=vehicle_category,
        cover_type=cover_type,
        add_ons=add_ons,
        term_months=term_months,
        kyc_status=quote.kyc_status or 'pending',
        valuation_required=valuation_required,
        mechanical_assessment_required=mechanical_assessment_required,
    )
    db.session.add(policy)
    db.session.commit()

    return jsonify({'status': 'success', 'policy': policy.to_dict()}), 201


@policies_bp.route('/policies/<int:policy_id>', methods=['GET'])
@jwt_required()
def get_policy(policy_id: int):
    current_user_id = int(get_jwt_identity())
    policy = Policy.query.get(policy_id)
    if not policy or policy.user_id != current_user_id:
        return jsonify({'error': 'Policy not found'}), 404
    return jsonify({'status': 'success', 'policy': policy.to_dict()}), 200


@policies_bp.route('/policies/<int:policy_id>/issue', methods=['POST'])
@jwt_required()
def issue_policy(policy_id: int):
    current_user_id = int(get_jwt_identity())
    policy = Policy.query.get(policy_id)
    if not policy or policy.user_id != current_user_id:
        return jsonify({'error': 'Policy not found'}), 404

    if policy.status == 'issued':
        return jsonify({'status': 'success', 'policy': policy.to_dict()}), 200

    # KYC check (still enforced)
    if (policy.kyc_status or 'pending') != 'verified':
        return jsonify({'error': 'KYC not complete', 'kyc_status': policy.kyc_status}), 400

    # Issuance prechecks from reference rules (always enforced)
    ok, details = issuance_prechecks(policy.coverage or {}, policy.cover_type or '')
    if not ok:
        return jsonify({'error': 'Issuance requirements not met', **details}), 400

    policy.status = 'issued'
    policy.issued_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'status': 'success', 'policy': policy.to_dict()}), 200
