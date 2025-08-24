from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc

from backend.app import db
from backend.models.user import User
from backend.models.quote import Quote
from backend.models.policy import Policy

users_bp = Blueprint('users', __name__)

@users_bp.route('/users/kyc/submit', methods=['POST'])
@jwt_required()
def submit_kyc():
    """
    Save KYC details to the latest quote belonging to the current user
    and mark the quote's kyc_status as 'pending'.

    Body (min required): { national_id: str, dob: str (YYYY-MM-DD) }
    Optional fields: kra_pin, address, email, phone
    """
    data = request.get_json() or {}
    national_id = (data.get('national_id') or '').strip()
    dob = (data.get('dob') or '').strip()
    kra_pin = (data.get('kra_pin') or '').strip()
    address = (data.get('address') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()

    if not national_id or not dob:
        return jsonify({'error': 'national_id and dob are required'}), 400

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Find the latest quote for this user
    quote = Quote.query.filter_by(user_id=user.id).order_by(desc(Quote.created_at)).first()
    if not quote:
        return jsonify({'error': 'No quote found to attach KYC to'}), 404

    # Update quote input_data with KYC block and mark status pending
    input_data = quote.input_data or {}
    kyc_block = input_data.get('kyc') or {}
    kyc_block.update({
        'national_id': national_id,
        'dob': dob,
    })
    # Attach optional fields when provided
    if kra_pin:
        kyc_block['kra_pin'] = kra_pin
    if address:
        kyc_block['address'] = address
    if email:
        kyc_block['email'] = email
    if phone:
        kyc_block['phone'] = phone
    input_data['kyc'] = kyc_block
    quote.input_data = input_data
    quote.kyc_status = 'pending'

    db.session.commit()

    return jsonify({'status': 'success', 'quote': quote.to_dict()}), 200


@users_bp.route('/users/kyc/verify', methods=['POST'])
@jwt_required()
def verify_kyc_dev():
    """
    DEV-ONLY: Mark the current user's latest quote and policy KYC as 'verified'.
    This is intended for demos to unblock policy issuance.
    """
    user_id = int(get_jwt_identity())
    body = request.get_json() or {}
    policy_id = body.get('policy_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    policy = None
    quote = None
    if policy_id:
        policy = Policy.query.get(policy_id)
        if not policy or policy.user_id != user.id:
            return jsonify({'error': 'Policy not found'}), 404
        policy.kyc_status = 'verified'
        quote = Quote.query.get(policy.quote_id)
        if quote and quote.user_id == user.id:
            quote.kyc_status = 'verified'
    else:
        # Fallback: latest records
        quote = Quote.query.filter_by(user_id=user.id).order_by(desc(Quote.created_at)).first()
        if quote:
            quote.kyc_status = 'verified'
        policy = Policy.query.filter_by(user_id=user.id).order_by(desc(Policy.created_at)).first()
        if policy:
            policy.kyc_status = 'verified'

    db.session.commit()

    return jsonify({'status': 'success', 'message': 'KYC marked as verified (dev)', 'policy_id': getattr(policy, 'id', None)}), 200
