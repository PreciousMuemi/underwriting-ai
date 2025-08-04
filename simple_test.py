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
except Exception as e:
    print(f"Error: {e}")
