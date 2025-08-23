from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from backend.app import db
from backend.models.user import User
from backend.models.quote import Quote
import os
import tempfile
from datetime import datetime, timedelta

pdf_bp = Blueprint('pdf', __name__)

def create_quote_pdf(user, quote, language='en'):
    """Create PDF quote document"""
    try:
        # Create temporary file
        temp_dir = tempfile.gettempdir()
        pdf_filename = f"quote_{quote.id}_{user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        pdf_path = os.path.join(temp_dir, pdf_filename)
        
        # Create PDF document
        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2563eb')
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            textColor=colors.HexColor('#1f2937')
        )
        
        # Content based on language
        if language == 'sw':
            title = "Nukuu ya Bima"
            company_name = "AutoUnderwriter"
            quote_details = "Maelezo ya Nukuu"
            customer_info = "Maelezo ya Mteja"
            risk_assessment = "Tathmini ya Hatari"
            premium_breakdown = "Mgawanyo wa Ada"
            generated_on = "Imetengenezwa tarehe"
            quote_id_label = "Nambari ya Nukuu"
            name_label = "Jina"
            email_label = "Barua pepe"
            risk_level_label = "Kiwango cha Hatari"
            quote_amount_label = "Kiasi cha Nukuu"
            valid_until = "Nukuu hii ni halali hadi"
            footer_text = "Asante kwa kutumia AutoUnderwriter"
        else:
            title = "Insurance Quote"
            company_name = "AutoUnderwriter"
            quote_details = "Quote Details"
            customer_info = "Customer Information"
            risk_assessment = "Risk Assessment"
            premium_breakdown = "Premium Breakdown"
            generated_on = "Generated on"
            quote_id_label = "Quote ID"
            name_label = "Name"
            email_label = "Email"
            risk_level_label = "Risk Level"
            quote_amount_label = "Quote Amount"
            valid_until = "This quote is valid until"
            footer_text = "Thank you for choosing AutoUnderwriter"
        
        # Build story
        story = []
        
        # Header
        story.append(Paragraph(title, title_style))
        story.append(Paragraph(company_name, styles['Heading2']))
        story.append(Spacer(1, 20))
        
        # Quote information table
        valid_until_dt = quote.created_at + timedelta(days=30)
        quote_data = [
            [quote_id_label, str(quote.id)],
            [generated_on, quote.created_at.strftime('%B %d, %Y at %I:%M %p')],
            [valid_until, valid_until_dt.strftime('%B %d, %Y')]
        ]
        
        quote_table = Table(quote_data, colWidths=[2*inch, 3*inch])
        quote_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
        ]))
        
        story.append(quote_table)
        story.append(Spacer(1, 20))
        
        # Customer Information
        story.append(Paragraph(customer_info, heading_style))
        customer_data = [
            [name_label, user.name],
            [email_label, user.email]
        ]
        
        customer_table = Table(customer_data, colWidths=[2*inch, 3*inch])
        customer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
        ]))
        
        story.append(customer_table)
        story.append(Spacer(1, 20))
        
        # Risk Assessment
        story.append(Paragraph(risk_assessment, heading_style))
        
        # Risk level color
        risk_color = colors.green
        if quote.risk_level == 'Medium':
            risk_color = colors.orange
        elif quote.risk_level == 'High':
            risk_color = colors.red
        
        risk_data = [
            [risk_level_label, quote.risk_level],
            [quote_amount_label, f"KES {quote.quote_amount:,}"]
        ]
        
        risk_table = Table(risk_data, colWidths=[2*inch, 3*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('BACKGROUND', (1, 0), (1, 0), risk_color),
            ('BACKGROUND', (1, 1), (1, 1), colors.HexColor('#dcfce7')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (1, 1), (1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (1, 1), (1, 1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
        ]))
        
        story.append(risk_table)
        story.append(Spacer(1, 30))
        
        # Additional information if available
        if quote.credit_score or quote.driving_patterns:
            story.append(Paragraph("Additional Risk Factors", heading_style))
            additional_data = []
            
            if quote.credit_score:
                additional_data.append(["Credit Score", str(quote.credit_score)])
            
            if quote.driving_patterns:
                patterns = quote.driving_patterns
                if patterns.get('speeding_incidents'):
                    additional_data.append(["Speeding Incidents", str(patterns['speeding_incidents'])])
                if patterns.get('harsh_braking_freq'):
                    additional_data.append(["Harsh Braking Events", str(patterns['harsh_braking_freq'])])
                if patterns.get('aggressive_acceleration'):
                    additional_data.append(["Aggressive Acceleration", str(patterns['aggressive_acceleration'])])
            
            if additional_data:
                additional_table = Table(additional_data, colWidths=[2*inch, 3*inch])
                additional_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
                    ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
                ]))
                
                story.append(additional_table)
                story.append(Spacer(1, 30))
        
        # Footer
        story.append(Spacer(1, 40))
        story.append(Paragraph(footer_text, styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        return pdf_path
        
    except Exception as e:
        print(f"Error creating PDF: {e}")
        return None

@pdf_bp.route('/generate-quote-pdf/<int:quote_id>', methods=['POST'])
@jwt_required()
def generate_quote_pdf(quote_id):
    """Generate PDF for a specific quote"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find quote that belongs to the user
        quote = Quote.query.filter_by(id=quote_id, user_id=user.id).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        # Generate PDF
        pdf_path = create_quote_pdf(user, quote, user.language_preference)
        
        if not pdf_path:
            return jsonify({'error': 'Failed to generate PDF'}), 500
        
        # Update quote record
        quote.pdf_generated = True
        quote.pdf_path = pdf_path
        db.session.commit()
        
        return jsonify({
            'message': 'PDF generated successfully',
            'quote_id': quote.id,
            'download_url': f'/api/download-quote-pdf/{quote_id}'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pdf_bp.route('/download-quote-pdf/<int:quote_id>', methods=['GET'])
@jwt_required()
def download_quote_pdf(quote_id):
    """Download PDF for a specific quote"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find quote that belongs to the user
        quote = Quote.query.filter_by(id=quote_id, user_id=user.id).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        # Check if PDF exists or generate it
        if not quote.pdf_path or not os.path.exists(quote.pdf_path):
            pdf_path = create_quote_pdf(user, quote, user.language_preference)
            if not pdf_path:
                return jsonify({'error': 'Failed to generate PDF'}), 500
            
            quote.pdf_generated = True
            quote.pdf_path = pdf_path
            db.session.commit()
        
        # Send file
        return send_file(
            quote.pdf_path,
            as_attachment=True,
            download_name=f'insurance_quote_{quote.id}.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pdf_bp.route('/latest-quote-pdf', methods=['GET'])
@jwt_required()
def download_latest_quote_pdf():
    """Download PDF for the most recent quote"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find the latest quote for the user
        latest_quote = Quote.query.filter_by(user_id=user.id).order_by(Quote.created_at.desc()).first()
        
        if not latest_quote:
            return jsonify({'error': 'No quotes found for user'}), 404
        
        # Check if PDF exists or generate it
        if not latest_quote.pdf_path or not os.path.exists(latest_quote.pdf_path):
            pdf_path = create_quote_pdf(user, latest_quote, user.language_preference)
            if not pdf_path:
                return jsonify({'error': 'Failed to generate PDF'}), 500
            
            latest_quote.pdf_generated = True
            latest_quote.pdf_path = pdf_path
            db.session.commit()
        
        # Send file
        return send_file(
            latest_quote.pdf_path,
            as_attachment=True,
            download_name=f'insurance_quote_{latest_quote.id}.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500