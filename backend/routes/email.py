from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_mail import Message
from backend.app import db, mail
from backend.models.user import User
from backend.models.quote import Quote
import threading
import os

email_bp = Blueprint('email', __name__)

def send_async_email(app, msg):
    """Send email asynchronously"""
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as e:
            print(f"Error sending email: {e}")

def send_quote_email(user, quote, language='en', attachment_path: str | None = None):
    """Send quote email to user"""
    try:
        # Email content based on language
        if language == 'sw':
            subject = f"Nukuu yako ya Bima kutoka AutoUnderwriter"
            greeting = f"Hujambo {user.name},"
            intro = "Hapa ni nukuu yako ya bima:"
            risk_label = "Kiwango cha Hatari:"
            amount_label = "Kiasi cha Nukuu:"
            footer = "Asante kwa kutumia AutoUnderwriter!"
            closing = "Heshima,"
        else:
            subject = f"Your Insurance Quote from AutoUnderwriter"
            greeting = f"Hello {user.name},"
            intro = "Here is your insurance quote:"
            risk_label = "Risk Level:"
            amount_label = "Quote Amount:"
            footer = "Thank you for using AutoUnderwriter!"
            closing = "Best regards,"
        
        # Create email content
        email_body = f"""
{greeting}

{intro}

{risk_label} {quote.risk_level}
{amount_label} KES {quote.quote_amount:,}

Quote ID: {quote.id}
Date: {quote.created_at.strftime('%B %d, %Y at %I:%M %p')}

{footer}

{closing}
AutoUnderwriter Team
        """
        
        # Create message
        msg = Message(
            subject=subject,
            recipients=[user.email],
            body=email_body
        )
        # Attach PDF if provided and exists
        try:
            if attachment_path and os.path.exists(attachment_path):
                with open(attachment_path, 'rb') as f:
                    data = f.read()
                msg.attach(
                    filename=os.path.basename(attachment_path),
                    content_type='application/pdf',
                    data=data
                )
        except Exception as e:
            print(f"Warning: could not attach PDF: {e}")
        
        # Send email in background thread
        thread = threading.Thread(
            target=send_async_email,
            args=(current_app._get_current_object(), msg)
        )
        thread.start()
        
        return True
        
    except Exception as e:
        print(f"Error preparing email: {e}")
        return False

@email_bp.route('/send-quote/<int:quote_id>', methods=['POST'])
@jwt_required()
def send_quote_email_endpoint(quote_id):
    """Send quote email to authenticated user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find quote that belongs to the user
        quote = Quote.query.filter_by(id=quote_id, user_id=user.id).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        # Send email
        success = send_quote_email(user, quote, user.language_preference)
        
        if success:
            # Update quote record
            quote.email_sent = True
            db.session.commit()
            
            return jsonify({
                'message': 'Quote email sent successfully',
                'email': user.email
            }), 200
        else:
            return jsonify({
                'error': 'Failed to send email'
            }), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@email_bp.route('/send-latest-quote', methods=['POST'])
@jwt_required()
def send_latest_quote_email():
    """Send the most recent quote email to authenticated user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find the latest quote for the user
        latest_quote = Quote.query.filter_by(user_id=user.id).order_by(Quote.created_at.desc()).first()
        
        if not latest_quote:
            return jsonify({'error': 'No quotes found for user'}), 404
        
        # Send email
        success = send_quote_email(user, latest_quote, user.language_preference)
        
        if success:
            # Update quote record
            latest_quote.email_sent = True
            db.session.commit()
            
            return jsonify({
                'message': 'Latest quote email sent successfully',
                'email': user.email,
                'quote_id': latest_quote.id
            }), 200
        else:
            return jsonify({
                'error': 'Failed to send email'
            }), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@email_bp.route('/test-email', methods=['POST'])
def test_email():
    """Test email configuration (development only)"""
    try:
        if not current_app.config['DEBUG']:
            return jsonify({'error': 'Test email only available in debug mode'}), 403
        
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email address required'}), 400
        
        msg = Message(
            subject="AutoUnderwriter Email Test",
            recipients=[email],
            body="This is a test email from AutoUnderwriter. If you receive this, email configuration is working correctly!"
        )
        
        # Send email in background
        thread = threading.Thread(
            target=send_async_email,
            args=(current_app._get_current_object(), msg)
        )
        thread.start()
        
        return jsonify({
            'message': 'Test email sent successfully',
            'email': email
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500