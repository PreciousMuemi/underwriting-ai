from flask import Blueprint, request, jsonify
from datetime import datetime
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, exceptions as jwt_exceptions
from backend.app import db
from backend.models.conversation import Conversation

conversation_bp = Blueprint('conversation', __name__)

DEFAULT_QUESTIONS = [
    {'field': 'AGE', 'question': 'What is your age?', 'type': 'number'},
    {'field': 'CAR_USE', 'question': 'Is the car for commercial(1) or private(0) use?', 'type': 'select', 'options': [0, 1]},
    {'field': 'BLUEBOOK', 'question': 'Estimated car value (USD)?', 'type': 'number'},
]


def _try_get_user_id() -> int | None:
    """Return user id if a valid JWT is present; otherwise None (anonymous session)."""
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        return int(uid) if uid is not None else None
    except jwt_exceptions.NoAuthorizationError:
        return None
    except Exception:
        return None


@conversation_bp.route('/conversation/start', methods=['POST'])
def start():
    payload = request.get_json(silent=True) or {}
    prefill = payload.get('prefill') or {}

    user_id = _try_get_user_id()
    conv = Conversation(
        user_id=user_id,
        data=prefill,
        questions=DEFAULT_QUESTIONS,
        index=0,
        status='in_progress',
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.session.add(conv)
    db.session.commit()

    next_q = conv.questions[0] if conv.questions else None
    return jsonify({'conversation_id': conv.id, 'next_question': next_q, 'state': conv.to_dict()}), 200


@conversation_bp.route('/conversation/respond', methods=['POST'])
def respond():
    data = request.get_json() or {}
    conv_id = data.get('conversation_id')
    answer = data.get('answer')

    if not conv_id:
        return jsonify({'error': 'conversation_id is required'}), 400

    conv: Conversation | None = Conversation.query.get(conv_id)
    if not conv:
        return jsonify({'error': 'Invalid conversation_id'}), 400

    idx = conv.index
    if idx >= len(conv.questions or []):
        conv.status = 'completed'
        db.session.commit()
        return jsonify({'message': 'Conversation already completed', 'state': conv.to_dict()}), 200

    # Save answer
    field = (conv.questions or [])[idx]['field']
    data_map = conv.data or {}
    data_map[field] = answer
    conv.data = data_map
    conv.index = idx + 1
    conv.updated_at = datetime.utcnow()

    if conv.index < len(conv.questions or []):
        next_q = conv.questions[conv.index]
        db.session.commit()
        return jsonify({'next_question': next_q, 'state': conv.to_dict()}), 200

    conv.status = 'ready_for_risk'
    db.session.commit()
    return jsonify({'message': 'Collected required info', 'state': conv.to_dict()}), 200


@conversation_bp.route('/conversation/status/<conv_id>', methods=['GET'])
def status(conv_id: str):
    conv: Conversation | None = Conversation.query.get(conv_id)
    if not conv:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'state': conv.to_dict()}), 200


@conversation_bp.route('/conversation/message', methods=['POST'])
def append_message():
    """Append a chat message into Conversation.data.messages.
    Body: { conversation_id: str, sender: 'user'|'bot', text: str }
    Returns: { state }
    """
    body = request.get_json() or {}
    conv_id = body.get('conversation_id')
    sender = (body.get('sender') or '').strip()
    text = (body.get('text') or '').strip()

    if not conv_id:
        return jsonify({'error': 'conversation_id is required'}), 400
    if sender not in ('user', 'bot'):
        return jsonify({'error': "sender must be 'user' or 'bot'"}), 400
    if not text:
        return jsonify({'error': 'text is required'}), 400

    conv: Conversation | None = Conversation.query.get(conv_id)
    if not conv:
        return jsonify({'error': 'Invalid conversation_id'}), 400

    # Ensure messages array exists in data
    data_map = conv.data or {}
    msgs = data_map.get('messages') or []
    if not isinstance(msgs, list):
        msgs = []

    msgs.append({
        'sender': sender,
        'text': text,
        'ts': datetime.utcnow().isoformat() + 'Z',
    })
    data_map['messages'] = msgs
    conv.data = data_map
    conv.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'state': conv.to_dict()}), 200
