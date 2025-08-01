# 🛡️ InsureBot - AI-Powered Insurance Assistant

A full-stack Lemonade-style chatbot insurance assistant that provides personalized car insurance quotes using machine learning. Built with React, TypeScript, Tailwind CSS, and Flask.

## ✨ Features

- **Conversational AI Interface**: Natural chat experience that collects insurance information step-by-step
- **Real-time Risk Assessment**: XGBoost ML model provides instant risk scoring and personalized quotes
- **Lemonade-Inspired Design**: Clean, modern UI with soft green and yellow theme
- **Mobile-First Responsive**: Optimized for all devices with adaptive chat interface
- **Typing Animations**: Realistic bot typing indicators for enhanced UX
- **Progress Tracking**: Visual progress bar showing completion status
- **Instant Quotes**: Get personalized insurance quotes in under 5 minutes

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Flask server:**
   ```bash
   python app.py
   ```
   
   The backend will run on `http://127.0.0.1:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The frontend will run on `http://localhost:3000`

## 🎯 Usage

1. **Open your browser** and navigate to `http://localhost:3000`
2. **Click the floating chat icon** in the bottom-right corner
3. **Answer the questions** about your profile, vehicle, and driving history
4. **Get your quote** - The AI will provide a personalized insurance quote with risk assessment

## 🏗️ Project Structure

```
├── app.py                 # Flask backend with ML model
├── models/
│   └── xgboost_risk_model.pkl  # Trained XGBoost model
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── ChatbotFloat.tsx
│   │   ├── data/
│   │   │   └── questions.ts   # Insurance questions configuration
│   │   ├── types/
│   │   │   └── insurance.ts   # TypeScript interfaces
│   │   └── lib/
│   │       └── utils.ts       # Utility functions
│   └── ...
└── requirements.txt       # Python dependencies
```

## 🤖 How It Works

### 1. Data Collection
The chatbot asks 25 questions to collect comprehensive user data:
- Personal information (age, gender, marital status)
- Vehicle details (type, age, value, color)
- Driving history (experience, claims, violations)
- Lifestyle factors (commute, home value, location)

### 2. ML Prediction
- User responses are validated and processed
- Data is sent to Flask backend via REST API
- XGBoost model predicts risk score (0=Low, 1=Medium, 2=High)
- Quote is calculated based on risk level and user factors

### 3. Personalized Quote
- Risk assessment determines base premium multiplier
- Additional factors adjust final quote:
  - Age (young drivers pay more)
  - Vehicle value (expensive cars cost more to insure)
  - Claims history (previous claims increase premium)
  - Location (urban vs rural risk differences)

## 🛡️ Insurance Fields Collected

| Field | Description | Type |
|-------|-------------|------|
| AGE | Driver's age | Number |
| GENDER | Gender (0=Female, 1=Male) | Select |
| MSTATUS | Marital status (0=Single, 1=Married) | Select |
| EDUCATION | Education level (0-3) | Select |
| OCCUPATION | Job category (0-5) | Select |
| INCOME | Annual income (KES) | Number |
| HOME_VAL | Home value (KES) | Number |
| CAR_TYPE | Vehicle type (0-5) | Select |
| CAR_AGE | Vehicle age in years | Number |
| BLUEBOOK | Car market value (KES) | Number |
| TIF | Years with insurance | Number |
| CLM_FREQ | Number of claims (last 5 years) | Number |
| ... | And 14 more fields | Various |

## 🎨 Design Features

- **Lemonade Theme**: Soft green and yellow color palette
- **Floating Chat Icon**: Animated, attention-grabbing design
- **Smooth Animations**: Slide-up effects and typing indicators
- **Progress Tracking**: Visual progress bar and question counter
- **Mobile Responsive**: Full-screen chat on mobile devices
- **Accessibility**: Focus rings and semantic HTML

## 🔧 Technical Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for fast development
- **Lucide React** for icons

### Backend
- **Flask** web framework
- **XGBoost** ML model
- **Pandas** for data processing
- **Flask-CORS** for cross-origin requests

## 📱 Mobile Experience

The chatbot automatically adapts to mobile devices:
- Full-screen chat interface on small screens
- Touch-optimized buttons and inputs
- Responsive typography and spacing
- Smooth animations and transitions

## 🚀 Deployment

### Backend Deployment
```bash
# For production, use a WSGI server like Gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting service
```

## 🔮 Future Enhancements

- [ ] User authentication and quote history
- [ ] Email integration for quote delivery
- [ ] Multi-language support
- [ ] Advanced risk factors (credit score, driving patterns)
- [ ] Integration with real insurance providers
- [ ] Voice input capability
- [ ] PDF quote generation

## 📄 License

This project is part of an ML thesis demonstration. Feel free to use and modify for educational purposes.

## 🤝 Contributing

This is a demo project, but suggestions and improvements are welcome! Please feel free to open issues or submit pull requests.

---

**Built with ❤️ for ML thesis project - Demonstrating AI-powered insurance underwriting**
