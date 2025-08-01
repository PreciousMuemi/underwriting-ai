from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app import db
from backend.models.user import User
from backend.models.quote import Quote
from sqlalchemy import desc

quotes_bp = Blueprint('quotes', __name__)

@quotes_bp.route('/user/quotes', methods=['GET'])
@jwt_required()
def get_user_quotes():
    """Get all quotes for the authenticated user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)  # Max 100 per page
        
        # Query quotes with pagination
        quotes_query = Quote.query.filter_by(user_id=user.id).order_by(desc(Quote.created_at))
        quotes_paginated = quotes_query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Convert to dict format
        quotes_data = [quote.to_dict() for quote in quotes_paginated.items]
        
        return jsonify({
            'quotes': quotes_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': quotes_paginated.total,
                'pages': quotes_paginated.pages,
                'has_next': quotes_paginated.has_next,
                'has_prev': quotes_paginated.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quotes_bp.route('/user/quotes/<int:quote_id>', methods=['GET'])
@jwt_required()
def get_user_quote(quote_id):
    """Get a specific quote for the authenticated user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find quote that belongs to the user
        quote = Quote.query.filter_by(id=quote_id, user_id=user.id).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        return jsonify({
            'quote': quote.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quotes_bp.route('/user/quotes/<int:quote_id>', methods=['DELETE'])
@jwt_required()
def delete_user_quote(quote_id):
    """Delete a specific quote for the authenticated user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find quote that belongs to the user
        quote = Quote.query.filter_by(id=quote_id, user_id=user.id).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        db.session.delete(quote)
        db.session.commit()
        
        return jsonify({
            'message': 'Quote deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@quotes_bp.route('/user/quotes/stats', methods=['GET'])
@jwt_required()
def get_user_quote_stats():
    """Get quote statistics for the authenticated user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get all user quotes
        quotes = Quote.query.filter_by(user_id=user.id).all()
        
        if not quotes:
            return jsonify({
                'stats': {
                    'total_quotes': 0,
                    'average_quote': 0,
                    'lowest_quote': 0,
                    'highest_quote': 0,
                    'risk_distribution': {
                        'Low': 0,
                        'Medium': 0,
                        'High': 0
                    }
                }
            }), 200
        
        # Calculate statistics
        quote_amounts = [q.quote_amount for q in quotes]
        risk_levels = [q.risk_level for q in quotes]
        
        stats = {
            'total_quotes': len(quotes),
            'average_quote': round(sum(quote_amounts) / len(quote_amounts)),
            'lowest_quote': min(quote_amounts),
            'highest_quote': max(quote_amounts),
            'risk_distribution': {
                'Low': risk_levels.count('Low'),
                'Medium': risk_levels.count('Medium'),
                'High': risk_levels.count('High')
            }
        }
        
        return jsonify({
            'stats': stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500