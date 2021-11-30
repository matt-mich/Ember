
from flask import Flask, jsonify, request, send_from_directory, Response
from flask import json

app = Flask(__name__)

orig_text = "Hello Game!"
to_send = orig_text

latest_buildings = {
    0:"empty",
    1:"empty",
    2:"empty",
    3:"empty"
}

ember_convo_count = 0

print(latest_buildings)
@app.route('/api/ask', methods=['GET', 'POST'])
def game_resp():
    return jsonify(text=to_send)

@app.route('/api/ask/buildings', methods=['GET', 'POST'])
def game_buildings():
        return Response(json.dumps(latest_buildings),  mimetype='application/json')

@app.route('/api/ask/ember', methods=['GET', 'POST'])
def ret_count():
    return jsonify(count=ember_convo_count)


@app.route('/api/tell/buildings', methods=['GET', 'POST'])
def set_buildings():
    print(request.get_json())
    global latest_buildings
    latest_buildings = request.get_json()
    # if 'bye' in to_send:
    #     to_send = orig_text    
    # else:
    #     to_send = "Goodbye game!"

    return jsonify(
        text="Altering buildings")

@app.route('/api/tell/ember', methods=['GET', 'POST'])
def set_count():
    # print(request.get_json())
    global ember_convo_count
    ember_convo_count = request.get_json()['count']
    print(ember_convo_count)
    # if 'bye' in to_send:
    #     to_send = orig_text    
    # else:
    #     to_send = "Goodbye game!"

    return jsonify(
        text="Altering count")



@app.route('/game/<path:path>')
def send_js(path):
    return send_from_directory('static', path)



if __name__ == '__main__':
    # app.run(host='localhost', port=5000,ssl_context='adhoc')
    app.run(host="0.0.0.0", port=5000)
