import requests
import json

url = "http://localhost:5000/auth/register"
data = {
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, data=json.dumps(data), headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
