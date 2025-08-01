import os
from backend.app import create_app

# Create Flask application
config_name = os.getenv('FLASK_CONFIG', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"🚀 Starting AutoUnderwriter on port {port}")
    print(f"📊 Debug mode: {debug}")
    print(f"⚙️  Config: {config_name}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )