from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({'message': 'Hello, World!'})

@app.route('/api/test')
def api_test():
    return jsonify({'message': 'API test route working'})

if __name__ == '__main__':
    app.run(debug=True)
