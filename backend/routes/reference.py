from flask import Blueprint, jsonify
from backend.services.reference.loader import get_motor_reference

reference_bp = Blueprint('reference', __name__)

@reference_bp.route('/reference/motor', methods=['GET'])
def get_motor_reference_route():
    return jsonify(get_motor_reference()), 200
