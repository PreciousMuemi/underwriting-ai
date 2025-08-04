import requests
import json

# Test the registration endpoint
try:
    url = "http://localhost:5000/auth/register"
    data = {
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    }
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(url, data=json.dumps(data), headers=headers)
    print(f"Registration endpoint - Status Code: {response.status_code}")
    print(f"Registration endpoint - Response: {response.text}")
except Exception as e:
    print(f"Error accessing registration endpoint: {e}")
