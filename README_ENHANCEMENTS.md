# AutoUnderwriter - Enhanced AI Insurance Risk Assessment Platform

A comprehensive machine learning-based insurance underwriting system with advanced features including user authentication, multi-language support, voice input, email integration, and PDF generation.

## 🚀 New Enhanced Features

### 🔐 1. User Authentication & Quote History
- JWT-based authentication system with secure token management
- User registration and login with email validation
- Persistent quote history stored in SQLite/PostgreSQL database
- Protected endpoints for authenticated users only
- RESTful API endpoint `/api/user/quotes` for fetching past predictions

### 📩 2. Email Integration for Quote Delivery
- Flask-Mail integration for automated quote delivery
- Multi-language email templates (English & Swahili)
- Asynchronous email sending with background threading
- Email tracking in quote records
- Test email functionality for development

### 🌍 3. Multi-language Support (i18n)
- Full internationalization support for English and Swahili
- React-i18next integration with language detection
- Dynamic language switching with persistent preferences
- Localized email templates and PDF generation
- User language preference stored in profile

### 📈 4. Advanced Risk Factors
- Enhanced ML prediction with optional credit score input
- Driving pattern analysis (speeding, harsh braking, aggressive acceleration)
- Graceful fallback when advanced factors are missing
- Improved quote calculation with additional risk multipliers
- Comprehensive risk assessment scoring

### 🤖 5. Voice Input Capability
- Web Speech API integration for voice-to-text conversion
- Multi-language voice recognition (English & Swahili)
- Animated voice input indicators and feedback
- Browser compatibility detection and fallback
- Real-time transcript display and processing

### 📄 6. PDF Quote Generation
- Professional PDF generation using ReportLab
- Multi-language PDF templates
- Branded quote documents with company styling
- Downloadable quotes with detailed risk breakdown
- PDF storage and management system

## 🏗️ Architecture

### Backend Structure
```
backend/
├── __init__.py
├── app.py                 # Flask application factory
├── config.py             # Configuration management
├── models/
│   ├── __init__.py
│   ├── user.py           # User model with authentication
│   └── quote.py          # Quote model with history
├── routes/
│   ├── __init__.py
│   ├── auth.py           # Authentication endpoints
│   ├── prediction.py     # ML prediction endpoints
│   ├── quotes.py         # Quote history management
│   ├── email.py          # Email integration
│   └── pdf.py            # PDF generation
└── services/
    ├── __init__.py
    └── ml_service.py     # ML prediction service
```

### Frontend Structure
```
frontend/src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── layout/
│   │   └── Navbar.tsx
│   └── ui/
│       └── LoadingSpinner.tsx
├── contexts/
│   └── AuthContext.tsx    # Authentication state management
├── hooks/
│   └── useVoiceInput.ts   # Voice input custom hook
├── i18n/
│   ├── index.ts          # i18n configuration
│   └── locales/
│       ├── en.json       # English translations
│       └── sw.json       # Swahili translations
└── VoiceInput.tsx        # Voice input component
```

## 🛠️ Installation & Setup

### Backend Setup

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Initialize the database:**
```bash
python -c "from backend.app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
```

4. **Run the Flask application:**
```bash
python run.py
```

### Frontend Setup

1. **Install Node.js dependencies:**
```bash
cd frontend
npm install
```

2. **Set up environment variables:**
```bash
echo "VITE_API_URL=http://localhost:5000" > .env
```

3. **Start the development server:**
```bash
npm run dev
```

## 🔧 Configuration

### Backend Configuration

The application supports multiple configuration environments:

- **Development**: SQLite database, debug mode enabled
- **Production**: PostgreSQL database, optimized settings

Key configuration options in `backend/config.py`:

```python
# Database
SQLALCHEMY_DATABASE_URI = 'sqlite:///underwriter.db'

# JWT Configuration
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

# Email Configuration
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USE_TLS = True

# Supported Languages
LANGUAGES = ['en', 'sw']
```

### Email Configuration

For Gmail SMTP:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use the app password in `MAIL_PASSWORD`

## 📊 API Endpoints

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### Prediction Endpoints
- `POST /api/predict` - Generate insurance quote
- `GET /api/health` - Service health check

### Quote Management
- `GET /api/user/quotes` - Get user's quote history
- `GET /api/user/quotes/{id}` - Get specific quote
- `DELETE /api/user/quotes/{id}` - Delete quote
- `GET /api/user/quotes/stats` - Get quote statistics

### Email Integration
- `POST /api/send-quote/{id}` - Send specific quote via email
- `POST /api/send-latest-quote` - Send latest quote via email
- `POST /api/test-email` - Test email configuration (dev only)

### PDF Generation
- `POST /api/generate-quote-pdf/{id}` - Generate PDF for quote
- `GET /api/download-quote-pdf/{id}` - Download quote PDF
- `GET /api/latest-quote-pdf` - Download latest quote PDF

## 🎯 Enhanced ML Features

### Advanced Risk Factors

The enhanced prediction system now accepts optional parameters:

```json
{
  "credit_score": 750,
  "driving_patterns": {
    "speeding_incidents": 2,
    "harsh_braking_freq": 5,
    "aggressive_acceleration": 3
  }
}
```

### Risk Calculation Improvements

- **Credit Score Factor**: 750+ reduces premium by 10%, <550 increases by 30%
- **Driving Patterns**: Each negative behavior adds 2-5% to premium
- **Graceful Fallback**: System works with or without enhanced factors

## 🌐 Multi-language Support

### Supported Languages
- **English (en)**: Primary language with full feature support
- **Swahili (sw)**: Complete localization for Kenyan market

### Language Features
- Automatic browser language detection
- Persistent language preferences per user
- Localized emails and PDF documents
- Voice input in user's preferred language

## 🎤 Voice Input Features

### Browser Support
- Chrome/Chromium: Full support
- Firefox: Limited support
- Safari: Partial support
- Edge: Full support

### Voice Recognition Languages
- English (US): `en-US`
- Swahili (Kenya): `sw-KE`

### Usage
```typescript
const { isListening, transcript, startListening, stopListening } = useVoiceInput({
  language: 'en-US',
  continuous: false,
  interimResults: true
});
```

## 📧 Email Templates

### English Template
```
Hello {user.name},

Here is your insurance quote:

Risk Level: {quote.risk_level}
Quote Amount: KES {quote.quote_amount:,}

Quote ID: {quote.id}
Date: {quote.created_at}

Thank you for using AutoUnderwriter!

Best regards,
AutoUnderwriter Team
```

### Swahili Template
```
Hujambo {user.name},

Hapa ni nukuu yako ya bima:

Kiwango cha Hatari: {quote.risk_level}
Kiasi cha Nukuu: KES {quote.quote_amount:,}

Nambari ya Nukuu: {quote.id}
Tarehe: {quote.created_at}

Asante kwa kutumia AutoUnderwriter!

Heshima,
Timu ya AutoUnderwriter
```

## 🔒 Security Features

- JWT-based authentication with secure token management
- Password hashing using bcrypt
- CORS protection for cross-origin requests
- Input validation and sanitization
- SQL injection prevention through ORM
- XSS protection in frontend components

## 📱 Responsive Design

- Mobile-first design approach
- Touch-friendly voice input controls
- Responsive navigation and layouts
- Optimized for various screen sizes
- Progressive Web App capabilities

## 🚀 Deployment

### Production Environment Variables
```bash
FLASK_ENV=production
DATABASE_URL=postgresql://user:pass@localhost/underwriter
SECRET_KEY=your-production-secret
JWT_SECRET_KEY=your-production-jwt-secret
MAIL_USERNAME=your-production-email
MAIL_PASSWORD=your-production-password
```

### Docker Deployment
```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "run.py"]
```

## 🧪 Testing

### Backend Testing
```bash
# Run unit tests
python -m pytest tests/

# Test email functionality
curl -X POST http://localhost:5000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Frontend Testing
```bash
# Run component tests
npm run test

# Build for production
npm run build
```

## 📊 Performance Considerations

- **Database Indexing**: Optimized queries for quote history
- **Lazy Loading**: Components loaded on demand
- **Caching**: Browser caching for static assets
- **Compression**: Gzip compression for API responses
- **CDN Ready**: Static assets optimized for CDN delivery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- XGBoost team for the machine learning framework
- Flask community for the web framework
- React team for the frontend library
- ReportLab for PDF generation capabilities
- Contributors to the open-source packages used

---

**AutoUnderwriter** - Revolutionizing insurance underwriting with AI, one quote at a time. 🚗💼