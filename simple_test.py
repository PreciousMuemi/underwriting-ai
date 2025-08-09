import requests
import json

# Test the registration endpoint
url = "http://localhost:5000/auth/register"
data = {
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=data, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    # Test the login endpoint
    login_url = "http://localhost:5000/auth/login"
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    login_response = requests.post(login_url, json=login_data, headers=headers)
    print(f"Login Status Code: {login_response.status_code}")
    print(f"Login Response: {login_response.text}")
    
except Exception as e:
    print(f"Error: {e}")
