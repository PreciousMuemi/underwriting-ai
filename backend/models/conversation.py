from datetime import datetime
from uuid import uuid4
from backend.app import db


class Conversation(db.Model):
    __tablename__ = 'conversations'

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    data = db.Column(db.JSON, default=dict)
    questions = db.Column(db.JSON, default=list)
    index = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='in_progress')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not getattr(self, 'id', None):
            self.id = str(uuid4())

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'data': self.data or {},
            'questions': self.questions or [],
            'index': self.index,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
