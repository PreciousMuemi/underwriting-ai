import os
from backend.app import create_app

# Create Flask application
config_name = os.getenv('FLASK_CONFIG', 'development')
app = create_app(config_name)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)