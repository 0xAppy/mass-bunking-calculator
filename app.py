from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from logic import calculate_bunkable, get_status

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

@app.route('/')
def home():
    return send_from_directory('static', 'index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    
    attended = data['attended']
    total = data['total']
    target = data['target']
    
    n = calculate_bunkable(attended, total, target)
    status = get_status(attended, total, target)
    
    return jsonify({
        "can_bunk": n,
        "status": status
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)


    