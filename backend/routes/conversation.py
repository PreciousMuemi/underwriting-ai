from flask import Blueprint, request, jsonify
from uuid import uuid4
from datetime import datetime

conversation_bp = Blueprint('conversation', __name__)

# In-memory store for demo; replace with DB for production
_CONV_STORE: dict[str, dict] = {}

DEFAULT_QUESTIONS = [
    {'field': 'AGE', 'question': 'What is your age?', 'type': 'number'},
    {'field': 'CAR_USE', 'question': 'Is the car for commercial(1) or private(0) use?', 'type': 'select', 'options': [0, 1]},
    {'field': 'BLUEBOOK', 'question': 'Estimated car value (USD)?', 'type': 'number'},
]


def _new_session(initial: dict | None = None) -> dict:
    return {
        'id': str(uuid4()),
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat(),
        'index': 0,
        'data': initial or {},
        'questions': DEFAULT_QUESTIONS,
        'status': 'in_progress'
    }


@conversation_bp.route('/conversation/start', methods=['POST'])
def start():
    payload = request.get_json(silent=True) or {}
    session = _new_session(payload.get('prefill'))
    _CONV_STORE[session['id']] = session
    next_q = session['questions'][0] if session['questions'] else None
    return jsonify({'conversation_id': session['id'], 'next_question': next_q, 'state': session}), 200


@conversation_bp.route('/conversation/respond', methods=['POST'])
def respond():
    data = request.get_json() or {}
    conv_id = data.get('conversation_id')
    answer = data.get('answer')

    if not conv_id or conv_id not in _CONV_STORE:
        return jsonify({'error': 'Invalid conversation_id'}), 400

    session = _CONV_STORE[conv_id]
    idx = session['index']
    if idx >= len(session['questions']):
        session['status'] = 'completed'
        return jsonify({'message': 'Conversation already completed', 'state': session}), 200

    # Save answer
    field = session['questions'][idx]['field']
    session['data'][field] = answer
    session['index'] += 1
    session['updated_at'] = datetime.utcnow().isoformat()

    if session['index'] < len(session['questions']):
        next_q = session['questions'][session['index']]
        return jsonify({'next_question': next_q, 'state': session}), 200

    session['status'] = 'ready_for_risk'
    return jsonify({'message': 'Collected required info', 'state': session}), 200


@conversation_bp.route('/conversation/status/<conv_id>', methods=['GET'])
def status(conv_id: str):
    if conv_id not in _CONV_STORE:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'state': _CONV_STORE[conv_id]}), 200
