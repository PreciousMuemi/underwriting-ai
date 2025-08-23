from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from email_validator import validate_email, EmailNotValidError
from backend.app import db
from backend.models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        app_logger = getattr(__import__('flask').current_app, 'logger', None)
        if app_logger:
            app_logger.debug("Register request JSON: %r", data)
        if not data or not all(k in data for k in ("email", "password", "name")):
            return jsonify({"error": "Missing required fields: email, password, name"}), 400

        email = data["email"].lower().strip()
        password = data["password"]
        name = data["name"].strip()
        language_preference = data.get("language_preference", "en")

        # Validate email format (return actual message)
        try:
            valid = validate_email(email)
            email = valid.email
        except EmailNotValidError as e:
            # return the validator message to the client and log it
            if app_logger:
                app_logger.warning("Email validation failed for %r: %s", email, str(e))
            return jsonify({"error": "Invalid email format", "detail": str(e)}), 400

        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "User with this email already exists"}), 409

        # Validate password strength
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400

        # Create new user
        user = User(email=email, name=name, language_preference=language_preference)

        # set password helper if available
        if hasattr(user, "set_password"):
            user.set_password(password)
        else:
            # fallback: try password_hash attribute
            if hasattr(user, "password_hash"):
                from werkzeug.security import generate_password_hash
                user.password_hash = generate_password_hash(password)
            else:
                # last resort (dev only) — do not store plaintext in production
                user.password = password

        db.session.add(user)
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        return (
            jsonify(
                {
                    "message": "User registered successfully",
                    "user": user.to_dict(),
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                }
            ),
            201,
        )
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login user and return JWT tokens"""
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ("email", "password")):
            return jsonify({"error": "Missing email or password"}), 400

        email = data["email"].lower().strip()
        password = data["password"]

        user = User.query.filter_by(email=email).first()
        if not user or not getattr(user, "check_password", lambda p: False)(password):
            return jsonify({"error": "Invalid email or password"}), 401

        if hasattr(user, "is_active") and not user.is_active:
            return jsonify({"error": "Account is deactivated"}), 401

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        return (
            jsonify(
                {
                    "message": "Login successful",
                    "user": user.to_dict(),
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/ensure", methods=["POST"])
def ensure_user():
    """Ensure a user exists; if not, auto-register (guest or provided email) and return JWTs."""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()

        if email:
            # Validate provided email
            try:
                valid = validate_email(email)
                email = valid.email
            except EmailNotValidError as e:
                return jsonify({"error": "Invalid email format", "detail": str(e)}), 400
        else:
            # Create guest email if none provided
            from uuid import uuid4
            email = f"guest-{uuid4().hex[:10]}@guest.local"

        # Find existing or create new user
        user = User.query.filter_by(email=email).first()
        if not user:
            from secrets import token_urlsafe
            password = token_urlsafe(16)
            name = (data.get("name") or f"Guest {email.split('@')[0][-4:]}" ).strip()
            language_preference = data.get("language_preference", "en")

            user = User(email=email, name=name, language_preference=language_preference)
            if hasattr(user, "set_password"):
                user.set_password(password)
            else:
                from werkzeug.security import generate_password_hash
                user.password_hash = generate_password_hash(password)

            db.session.add(user)
            db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        return jsonify({
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        if not user or (hasattr(user, "is_active") and not user.is_active):
            return jsonify({"error": "User not found or inactive"}), 404

        new_token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": new_token}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    """Get current user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"user": user.to_dict()}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json() or {}
        if "name" in data:
            user.name = data["name"].strip()
        if "language_preference" in data:
            if data["language_preference"] in ("en", "sw"):
                user.language_preference = data["language_preference"]
            else:
                return jsonify({"error": "Invalid language preference"}), 400

        db.session.commit()
        return jsonify({"message": "Profile updated successfully", "user": user.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500