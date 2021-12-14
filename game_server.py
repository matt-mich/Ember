
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

def setShadowState(index,value):
    s_id = check_valid_session()
    if s_id:
        try:
            world_data_local_storage[s_id]['shadow_state'][str(index)] = value 
            world_data_local_storage[s_id]['shadow_state_change_time'][str(index)] = round(time.time()) 
        except TypeError:
            print("TYPE ERROR")
            world_data_local_storage[s_id]['shadow_state'][index] = value 
            world_data_local_storage[s_id]['shadow_state_change_time'][index] = round(time.time()) 
        set_world_state_to_file()

def convo_nop(dummy_var = None):
    print("NO ACTION")
    return

def trade_food_morale(dummy_var = None):
    s_id = check_valid_session()
    if s_id:
        if(world_data_local_storage[s_id]['resources']['food'] >=1):
            world_data_local_storage[s_id]['resources']['food'] -= 1
            world_data_local_storage[s_id]['resources']['morale'] += 1

    return

def destroy_building(location):
    s_id = check_valid_session()
    if s_id:
        print(world_data_local_storage[s_id])
        setShadowState(location,'empty')

def harvest_crops(location):
    s_id = check_valid_session()
    if s_id:
        world_data_local_storage[s_id]['resources']['food'] += 1
        setShadowState(location,'empty')

def water_crops(location):
    s_id = check_valid_session()
    if s_id:
        if(world_data_local_storage[s_id]['resources']['water'] >=1):
            world_data_local_storage[s_id]['resources']['water'] -= 1
            setShadowState(location,'crops_2')
            set_world_state_to_file()

def water_from_well(location):
    s_id = check_valid_session()
    if s_id:
        world_data_local_storage[s_id]['resources']['water'] += 1
        set_world_state_to_file()

def task_dishes(location=None):
    s_id = check_valid_session()
    if s_id:
        world_data_local_storage[s_id]['resources']['water'] += 1
        world_data_local_storage[s_id]['resources']['energy'] += 1
        set_world_state_to_file()

def task_clean(location=None):
    s_id = check_valid_session()
    if s_id:
        world_data_local_storage[s_id]['resources']['energy'] += 1
        world_data_local_storage[s_id]['resources']['morale'] += 1
        set_world_state_to_file()
def task_groceries(location=None):
    s_id = check_valid_session()
    if s_id:
        world_data_local_storage[s_id]['resources']['food'] += 1
        world_data_local_storage[s_id]['resources']['energy'] += 1
        set_world_state_to_file()


def plant_crops(location):
    s_id = check_valid_session()
    if s_id:
        if(world_data_local_storage[s_id]['resources']['energy'] >=1):
            world_data_local_storage[s_id]['resources']['energy'] -= 1
            setShadowState(location,'crops_1')
    

def build_well(location):
    s_id = check_valid_session()
    if s_id:
        print("ENERGY")
        print(world_data_local_storage[s_id]['resources']['energy'])
        if(world_data_local_storage[s_id]['resources']['energy'] >=1):
            world_data_local_storage[s_id]['resources']['energy'] -= 1
            setShadowState(location,'well')


convo_list = {
    "ember":{
        "dialog":"Hello friend!",
        "resp":[
            "Hello!",
            "Eat food. (-1 Food)",
            "See ya!"
        ]
    },
    "crops_1":{
        "dialog":"You see young crops!",
        "resp":[
            "Water crops. (-1 Water)",
            "Destroy crops.",
            "Nevermind..."
        ]
    },
    "crops_2":{
        "dialog":"You see harvestable crops!",
        "resp":[
            "Harvest crops. (+1 Food)",
            "Destroy crops.",
            "Nevermind..."
        ]
    },
    "well":{
        "dialog":"You see a well!",
        "resp":[
            "Pull up bucket. (+1 Water)",
            "Destroy well.",
            "Nevermind..."
        ]
    },
    "empty":{
        "dialog":"You see an empty plot of ash!",
        "resp":[
            "Plant crops. (-1 Energy)",
            "Build well (-1 Energy).",
            "Nevermind..."
        ]
    },
    "tasks":{
        "dialog":"A mysterious box beckons you.",
        "resp":[
            "I did the dishes!",
            "I cleaned my house!",
            "I got groceries!"
        ]
    },
}

convo_list_internal = {
    "ember":{
        "resp":[
            convo_nop,
            trade_food_morale,
            convo_nop,
        ]
    },
    "crops_1":{
        "resp":[
            water_crops,
            destroy_building,
            convo_nop,
        ]
    },
    "crops_2":{
        "resp":[
            harvest_crops,
            destroy_building,
            convo_nop,
        ]
    },
    "well":{
        "resp":[
            water_from_well,
            destroy_building,
            convo_nop,
        ]
    },
    "empty":{
        "resp":[
            plant_crops,
            build_well,
            convo_nop,
        ]
    },
    "tasks":{
        "resp":[
            task_dishes,
            task_clean,
            task_groceries,
        ]
    },
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


@app.route('/handle_ue4_login', methods=['POST'])
def handle_ue4_login():
    errors = []
    def handle_error(error):
        errors.append(error)
    login_info = request.get_json()

    world_id = login_info['world']
    world_pass = login_info['password']
    new_world = login_info['new_world']
    if new_world == 1:
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
        if new_world == 0:
            handle_error("No world of that name exists yet.")
        else:
            s_key = create_new_world(world_id,world_pass)
            session['world_id'] = s_key
            get_world_state_from_file()
            return jsonify(status="verified")
    for row in rows:
        print(row)
        if row[1] == world_id:
            hash_pass = sha256(str.encode(world_pass+sha_salt)).hexdigest()
            if row[2] == hash_pass:
                session['world_id'] = row[0]
                get_world_state_from_file()
                return jsonify(status="verified")
        else:       
            handle_error("No world with that name exists.")
    if errors != []:
        return jsonify(status=errors[0])
    get_world_state_from_file()
    return jsonify(status="verified")
    

def get_world_state_from_file():
    s_id = check_valid_session()
    if(s_id == None):
        return None
    world_file = f"world_data/{s_id}.json"
    if path.isfile(world_file):
        with open(world_file,'r') as f:
            if stat(world_file).st_size != 0:
                world_data = json.load(f)
                set_world_local_memory(world_data)
                return world_data
            else:
                return None
    else:
        default_file = f"world_data/default.json"
        with open(default_file,'r') as f:
            if stat(default_file).st_size != 0:
                world_data = json.load(f)
                set_world_local_memory(world_data)
                set_world_state_to_file()
                return world_data

def set_world_state_to_file():
    s_id = check_valid_session()
    print("ATTEMPTING FILE SAVE")

    if s_id:
        try:
            with open(f"world_data/{s_id}.json",'w') as f:
                f.write("")
            with open(f"world_data/{s_id}.json",'w') as f:
                world_data = {}
                if s_id in world_data_local_storage.keys():
                    world_data = world_data_local_storage[s_id]
                    print(f"worldstate from mem: {world_data}")
                else:
                    world_data = request.get_json()
                    print("DEFAULTING TO REQ")

                json.dump(world_data,f,indent=4)

                print("SAVED")

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

@app.route('/api/tell/convo_finish', methods=['POST'])
def execute_convo():
    # print(request.get_json())
    s_id = check_valid_session()
    if s_id:
        convo = request.get_json()
        print("CONVO")
        print(convo)
        if convo['character'] in convo_list_internal.keys():
            convo_list_internal[convo['character']]['resp'][convo['choice']](convo['location'])
            
        return world_data_local_storage[s_id]

@app.route('/api/tell/world_state', methods=['POST'])
def tell_world_state():
    # print(request.get_json())
    new_world_data = request.get_json()
    s_id = check_valid_session()
    if s_id:
        with open(f"world_data/{s_id}.json",'w') as f:
            json.dump(new_world_data,f,indent=4)
    set_world_local_memory(new_world_data)

    return jsonify(status="updated")

task_to_recsource_vals = {
    "dishes":{
        "water":1,
        "energy":1,
    },
    "clean":{
        "morale":1,
        "energy":1,
    },
    "groceries":{
        "food":1,
        "energy":1,
    }
}

        
def addResources_from_task(taskname):
    s_id = check_valid_session()
    if s_id:
        print(task_to_recsource_vals.keys())
        if taskname in task_to_recsource_vals.keys():
            for elem in task_to_recsource_vals[taskname]:
                world_data_local_storage[s_id]['resources'][elem] += task_to_recsource_vals[taskname][elem]

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

    addEvent(taskname)
        
    return get_world_state_from_file()


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
        s_id = check_valid_session()
        if s_id:
            if s_id not in world_data_local_storage.keys() :
                set_world_local_memory_from_file()
            print(world_data_local_storage[s_id])
            return Response(json.dumps(world_data_local_storage[s_id]['shadow_state']),  mimetype='application/json')

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

@app.route('/api/ask/resources',methods=['POST'])
def get_resources():
    s_id = check_valid_session()
    if s_id:
        return(world_data_local_storage[s_id]["resources"])
    else:

        return jsonify(text="Session_Error")


@app.route('/api/ask/convo/<entity>',methods=['POST'])
def get_single_convo(entity):
    print("entity")
    print("convo_list.keys()")
    if entity in convo_list.keys():
        print("FOUND ")
        return(convo_list[entity])
    else:
        return {}

@app.route('/api/ask/convo_list', methods=['POST'])
def get_all_convos():
    return convo_list

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