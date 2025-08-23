from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from backend.app import db

debug_bp = Blueprint("debug", __name__)

@debug_bp.route("/debug/db-info", methods=["GET"])
@jwt_required()
def db_info():
    engine = db.get_engine()
    with engine.connect() as conn:
        # List tables
        tables = [r[0] for r in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()]
        # Row counts
        counts = {}
        for t in tables:
            try:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                counts[t] = cnt
            except Exception:
                counts[t] = "n/a"
    user_id = get_jwt_identity()
    return jsonify({"current_user_id": user_id, "tables": tables, "row_counts": counts}), 200