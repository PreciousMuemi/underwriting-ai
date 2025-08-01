from flask import Flask
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
    app = Flask(__name__)
    
    # Load configuration
    from .config import config
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    bcrypt.init_app(app)
    CORS(app)
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.prediction import prediction_bp
    from .routes.quotes import quotes_bp
    from .routes.email import email_bp
    from .routes.pdf import pdf_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(prediction_bp, url_prefix='/api')
    app.register_blueprint(quotes_bp, url_prefix='/api')
    app.register_blueprint(email_bp, url_prefix='/api')
    app.register_blueprint(pdf_bp, url_prefix='/api')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app