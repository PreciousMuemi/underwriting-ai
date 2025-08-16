from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_bcrypt import Bcrypt

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()
bcrypt = Bcrypt()

def create_app(config_name='default'):
    print(f"Creating app with config: {config_name}")
    app = Flask(__name__)
    print("Flask app created")
    
    # Load configuration
    from .config import config
    app.config.from_object(config[config_name])
    print("Configuration loaded")
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    bcrypt.init_app(app)
    CORS(app)
    print("Extensions initialized")
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.prediction import prediction_bp
    from .routes.quotes import quotes_bp
    from .routes.email import email_bp
    from .routes.pdf import pdf_bp
    from .routes.conversation import conversation_bp
    
    print("Registering blueprints...")
    app.register_blueprint(auth_bp, url_prefix='/auth')
    print("Registered auth blueprint")
    
    app.register_blueprint(prediction_bp, url_prefix='/api')
    print("Registered prediction blueprint")
    
    app.register_blueprint(quotes_bp, url_prefix='/api')
    print("Registered quotes blueprint")
    
    app.register_blueprint(email_bp, url_prefix='/api')
    print("Registered email blueprint")
    
    app.register_blueprint(pdf_bp, url_prefix='/api')
    print("Registered pdf blueprint")
    
    app.register_blueprint(conversation_bp, url_prefix='/api')
    print("Registered conversation blueprint")
    
    # Test route
    @app.route('/')
    def test_route():
        return jsonify({'message': 'Test route working'})
    
    # Print all registered routes
    print("All registered routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.rule} -> {rule.endpoint}")
    
    # Create database tables
    with app.app_context():
        db.create_all()
    print("Database tables created")
    
    print("App creation completed successfully")
    return app
