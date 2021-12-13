
from flask import Flask, jsonify, request, send_from_directory, Response
from flask import render_template, json, url_for, flash, redirect, g, session
from flask_session import Session
from hashlib import sha256
from os import path, stat
import sqlite3
import time

from werkzeug.wsgi import wrap_file
db_file = "users.db"

con = sqlite3.connect('users.db')
cur = con.cursor()
cur.execute('''CREATE TABLE IF NOT EXISTS worlds
               (id integer primary key AUTOINCREMENT, world_name text, password text)''')
con.close()

import configparser
from os import urandom
hash_func = sha256()

config = configparser.ConfigParser()
config_file = 'server_status.ini'
config.read(config_file)
app = Flask(__name__)
SESSION_TYPE = "redis"
PERMANENT_SESSION_LIFETIME = 1800
debug_login_bypass = 1

# Best if you don't do this with production code, but I am too lazy to not just put it here.
# Really, don't expose your salt like this.
# If I was, like 10% less lazy I'd make this a GitHub secret.
# But I'm not.
sha_salt = "really_weak_and_exposed_secret_salt"

orig_text = "Hello Game!"
to_send = orig_text

world_data_local_storage = {}

latest_buildings = {
    0:"empty",
    1:"empty",
    2:"empty",
    3:"empty"
}


def check_valid_session():
    try:
        world_id = session['world_id']
        print("SESSION VALID")
        return world_id
    except KeyError:
        print("SESSION INVALID")
        return None


ember_convo_count = 0

# Function source: https://flask.palletsprojects.com/en/2.0.x/patterns/sqlite3/
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(db_file)
    return db

# Function source: https://flask.palletsprojects.com/en/2.0.x/patterns/sqlite3/
@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# This is a stupid function because I need to speak a stupid language.
# Most browsers won't update files automatically as they're cached. Fine. 
# But I need to update my files a lot. So I need to put a v=1.1 on a file to make
# it update. Next time it needs to be v=1.2, etc. So this just adds some tiny value
# to the version of every file upon every access. This will only work a few quintillion
# times, so be gentle with it. 
def get_next_version():
    version = int(config['file_management']['curr_version'])
    version_string = str(version).rjust(15,'0')
    config.set('file_management', 'curr_version', str(version+1))
    with open(config_file, 'w') as f:    # save
        config.write(f)
    return version_string

print(latest_buildings)

# Creates new World, returns session key.
def create_new_world(world,password):
    cur = get_db().cursor()
    cur.execute("SELECT * FROM worlds WHERE world_name =?",(world,))
    rows = cur.fetchall()
    if rows != []:
        print("world already exists")
        return
    sql = ''' INSERT INTO worlds(world_name,password) VALUES(?,?) '''
    hash_pass = sha256(str.encode(password+sha_salt)).hexdigest()
    print(hash_pass)

    cur.execute(sql, [world,hash_pass])
    get_db().commit()
    return cur.lastrowid


@app.route('/handle_login', methods=['POST'])
def handle_login():
    errors = []
    def handle_error(error):
        flash(error)  
        errors.append(error)

    world_id = str(request.form.get('world', None))
    world_pass = str(request.form.get('password', None))
    new_world = request.form.getlist('new_world')
    if new_world != []:
        print("Trying to create new world")
    print(f"{world_id} {world_pass} ")
    if world_id is None or world_id == '':
        handle_error("No world name given")  
    elif not world_id.isalnum() or not world_id.isascii():
        handle_error("World name must be alphanumeric")
    if world_pass is None or world_pass == '':
        handle_error("No Password given")
    elif not world_pass.isascii():
        handle_error("Password has illegal characters")
    if errors != []:
        return redirect(url_for('login_page'))
    cur = get_db().cursor()
    cur.execute("SELECT * FROM worlds WHERE world_name =?",(world_id,))
    rows = cur.fetchall()
    if rows == []:
        if new_world == []:
            handle_error("No world of that name exists yet.")
        else:
            s_key = create_new_world(world_id,world_pass)
            session['world_id'] = s_key
            return redirect(url_for('start_game'))
    for row in rows:
        print(row)
        if row[1] == world_id:
            hash_pass = sha256(str.encode(world_pass+sha_salt)).hexdigest()
            if row[2] == hash_pass:
                session['world_id'] = row[0]
                return redirect(url_for('start_game'))
        else:       
            handle_error("No world with that name exists.")

    return redirect(url_for('login_page'))
    
def get_world_state_from_file():
    s_id = check_valid_session()

    if(s_id == None):
        return None
    world_file = f"world_data/{s_id}.json"
    if path.isfile(world_file):
        with open(world_file,'r') as f:
            if stat(world_file).st_size != 0:
                # data_string=f.read()
                # world_data = json.dumps(data_string)
                # print(data_string)
                world_data = json.load(f)
                set_world_local_memory(world_data)
                return world_data   
            else:
                return None
    else:
        return None

def set_world_state_to_file():
    s_id = check_valid_session()
    
    if s_id in world_data_local_storage.keys():
        world_data = world_data_local_storage[s_id]
        print(f"worldstate from mem: {world_data}")
    else:
        world_data = request.get_json()
    if s_id:
        try:
            with open(f"world_data/{s_id}.json",'w') as f:
                json.dump(world_data,f,indent=4)
        except OSError:
            print("FILE ERROR")
            exit()
        finally:
            return world_data

def set_world_local_memory(world_data):
    global world_data_local_storage
    s_id = check_valid_session()
    if s_id and world_data:
        world_data_local_storage[s_id] = world_data

def set_world_local_memory_from_file():
    global world_data_local_storage
    world_data = get_world_state_from_file()
    s_id = check_valid_session()
    if world_data != None:
        if s_id not in world_data_local_storage.keys():
            world_data_local_storage[s_id] = world_data
            print(world_data_local_storage[s_id])

@app.route('/api/ask/world_state', methods=['POST'])
def ask_world_state():
    s_id = check_valid_session()
    if not s_id:
        return jsonify(status="Invalid_Session")

    world_data = get_world_state_from_file()
    # world_file = f"world_data/{session['world_id']}.json"
    if world_data == None:
        return jsonify(status="Need_World_Data")
    else:
        return world_data

@app.route('/api/tell/world_state', methods=['POST'])
def tell_world_state():
    set_world_state_to_file()
    # print(request.get_json())
    s_id = check_valid_session()
    if s_id:
        with open(f"world_data/{s_id}.json",'w') as f:
            json.dump(request.get_json(),f,indent=4)
    return jsonify(status="updated")

task_to_recsource_vals = {
    "dishes":{
        "water":1
    }
}

        
def addResources_from_task(taskname):
    s_id = check_valid_session()
    if s_id:
        print(task_to_recsource_vals.keys())
        if taskname in task_to_recsource_vals.keys():
            for elem in task_to_recsource_vals[taskname]:
                world_data_local_storage[s_id]['resources'][elem] += task_to_recsource_vals[taskname][elem]

        set_world_state_to_file()

def addEvent(taskname):
    s_id = check_valid_session()
    if s_id:
        world_data_local_storage[s_id]['events'].append([taskname,round(time.time())])
        set_world_state_to_file()
        addResources_from_task(taskname)
        print(world_data_local_storage[s_id])
        set_world_state_to_file()

@app.route('/api/tell/task/<taskname>', methods=['POST'])
def tell_taskname(taskname):
    print(taskname)
    data_test = get_world_state_from_file()
    if data_test == None:
        print("Uh oh")
    else:
        print("what")

    print(taskname)

    if(taskname == "dishes"):
        addEvent(taskname)
        
    s_id = check_valid_session()
    return world_data_local_storage[s_id]


@app.route('/api/ask/valid_session', methods=['GET', 'POST'])
def check_session():
    if check_valid_session():
        return jsonify(session="valid")
    else:
        return jsonify(session="invalid")


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

@app.route('/game')
def start_game():
    if debug_login_bypass:
        session['world_id'] = debug_login_bypass
    if session.get('world_id'):
        return render_template('game.html')
    else:
        flash("Session error: Please log in")
        return redirect(url_for('login_page'))


@app.route('/assets/<path:path>')
def send_asset(path):
    return send_from_directory('static/assets', path)

@app.route('/')
def login_page():
    return render_template('login.html')


if __name__ == '__main__':
    # app.run(host='localhost', port=5000,ssl_context='adhoc')
    # app.config.update(SECRET_KEY=urandom(24))
    app.secret_key = urandom(24)

    app.jinja_env.globals.update(get_next_version=get_next_version)
    app.run(host="0.0.0.0", port=5000,debug=True)
    app.add_url_rule('/favicon.ico', redirect_to=url_for('static', filename='favicon.ico'))
    Session(app)