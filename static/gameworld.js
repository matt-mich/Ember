var g_width = 0
var g_height = 0

function set_height_width(){
    g_width = window.innerWidth
    g_height = window.innerHeight
    return [g_width, g_height]
}

var left_arrow = null
var right_arrow = null
var debug_txt_box = null
var bg = null
var placement_shadow = null
var context = null
var graphics = null
var graphics_no_draw = null
var worldspace = null
var Rgb = Phaser.Display.Color.GetColor; 
var num_buttons = 0


var buildings = ["empty","crops_1","crops_2","well"]

var harvest_times = {
    "well":{
        "harvest_time":20,
        "reward":{"water":1}
    },
    "crops_1":{
        "harvest_time":20,
        "reward":{"food":1}
    },
}

var world_data_default = {
    'shadow_state': {
        0:"empty",
        1:"empty",
        2:"empty",
        3:"empty",
    },
    'shadow_state_change_time': {
        0:0,
        1:0,
        2:0,
        3:0,
    },
    'resources':{
        'water':0,
        'energy':0,
        'food':0,
        'morale':0
    },
    'events':[
        // Format: Taskname, time (in seconds from unix time) 
        //['dishes','1639297836']
    ]
}

var convo_list = []

var world_data = {...world_data_default}


// Refresh page if session is broken.
function check_session_validity(){
    getData("","/ask/valid_session",check_session_validity_callback)    

}
function check_session_validity_callback(data){
    if (data.session == "valid"){
        return
    }else{
        window.location.reload()
    }
}


refresh_world_data()

function setShadowState(index, value){
    world_data.shadow_state[index] = value
    world_data.shadow_state_change_time[index] = new Date().getTime() / 1000
    trigger_server_update()
}
function getShadowState(index,time){
    if(time == undefined){
        return world_data.shadow_state[index]
    }else{
        return world_data.shadow_state_change_time[index]
    }
}

function addResources(typename,amount){
    world_data.resources[typename] += amount
    trigger_server_update()

}

function getResource(typename){
    return world_data.resources[typename]
}


function refresh_world_data(){
    getData("","/ask/world_state",update_world_data)    
}

function update_world_data(data){
    console.log(data)
    if (data.status == "Need_World_Data"){
        send_world_update()
    }else{
        set_local_world_data(data)
    }
}

function send_world_update(){
    return
    addData(world_data,"/tell/world_state")
}

function set_local_world_data(data){
    if (data.shadow_state != undefined){
        world_data.shadow_state = data.shadow_state
    }
    if (data.shadow_state_change_time != undefined){
        world_data.shadow_state_change_time = data.shadow_state_change_time
    }
    if (data.resources != undefined){
        world_data.resources = data.resources
        console.log("REC:")
        console.log(data.resources)
        
    }
    if (data.events != undefined){
        world_data.events = data.events
    }
}

var num_convo = 0

function add_convo_count(){
    num_convo += 1
}

function reset_convo(){
    num_convo = 0
}

function trigger_server_update(){
    send_world_update()
    // addData(MakeUE4JSON(),"/tell/buildings")
    // addData(JSON.stringify({"count":num_convo}),"/tell/ember")
}


// DIALOG FUNCTIONS
function reset_world(){
    world_data = {...world_data_default}
    send_world_update()
}

function eat_food(){
    if(getResource("food") >= 1){
        addResources("food",-1)
        addResources("morale",1)
    }
    trigger_server_update()

}

function add_crops_to_plot(){
    if(getResource("energy") >= 1){
        addResources("energy",-1)
        setShadowState(curr_active_plot,'crops_1')
    }
    trigger_server_update()
}

function add_well_to_plot(){
    if(getResource("energy") >= 1){
        addResources("energy",-1)
        setShadowState(curr_active_plot,'well')
    }
    trigger_server_update()
}

function water_plot(){
    if(getResource("water") >= 1){
        addResources("water",-1)
    }
    trigger_server_update()
}

function destroy_plot(){
    setShadowState(curr_active_plot,'empty')
    trigger_server_update()
}
function harvest_plot(){
    setShadowState(curr_active_plot,'empty')    
    addResources("food",1)
    trigger_server_update()
}
function get_water_from_plot(){
    addResources("water",1)
    trigger_server_update()
}

function task_dishes(){    
    getData("","/tell/task/dishes",update_world_data)    
}

function task_cleaned(){
    getData("","/tell/task/clean",update_world_data)        
}
function task_groceries(){
    getData("","/tell/task/groceries",update_world_data)            
}
// CONVERSATION FUNCTIONS
function getDebugConvo(){
    return convo_list['ember']
    
    convo_string = "You've spoken to me " + num_convo.toString() + " times!";
//    resp1_string = "Thanks! Add another onto that!";
    resp1_string = "Could you add another one?";

    resp2_string = "Please reset that.";
    resp3_string = "Eat food. (-1 Food, +1 Morale)";

    resp1_func = add_convo_count
    resp2_func = reset_convo
    resp3_func = eat_food
    
    return {
        "convo":convo_string,
        "resp":[
            {
                "text":resp1_string,
                "func":resp1_func
            },
            {
                "text":resp2_string,
                "func":resp2_func
            },
            {
                "text":resp3_string,
                "func":resp3_func
            },
        ]
    }
}

function get_all_convos(){
    getData("","/ask/convo_list",get_all_convos_callback)
}
function get_all_convos_callback(data){
    convo_list = data
}

function getEmptyPlotConvo(){
    return convo_list['empty']
    
    convo_string = "You see an empty plot of ash.";
//    resp1_string = "Thanks! Add another onto that!";
    resp1_string = "Plant crops.(-1 Energy)";
    resp2_string = "Build a well. (-1 Energy)";
    resp3_string = "Nevermind.";

    resp1_func = add_crops_to_plot
    resp2_func = add_well_to_plot
    resp3_func = nop
    
    return {
        "convo":convo_string,
        "resp":[
            {
                "text":resp1_string,
                "func":resp1_func
            },
            {
                "text":resp2_string,
                "func":resp2_func
            },
            {
                "text":resp3_string,
                "func":resp3_func
            },
        ]
    }
}

function getCrops1Convo(){
    return convo_list['crops_1']
    
    convo_string = "You see young crops.";
//    resp1_string = "Thanks! Add another onto that!";
    resp1_string = "Water crops.(-1 Water)";
    resp2_string = "Destroy.";
    resp3_string = "Nevermind.";

    resp1_func = water_plot
    resp2_func = destroy_plot
    resp3_func = nop
    
    return {
        "convo":convo_string,
        "resp":[
            {
                "text":resp1_string,
                "func":resp1_func
            },
            {
                "text":resp2_string,
                "func":resp2_func
            },
            {
                "text":resp3_string,
                "func":resp3_func
            },
        ]
    }
}

function getCrops2Convo(){
    return convo_list['crops_2']
    
    convo_string = "You see crops.";
//    resp1_string = "Thanks! Add another onto that!";
    resp1_string = "Harvest.(+1 Food)";
    resp2_string = "Destroy.";
    resp3_string = "Nevermind.";

    resp1_func = harvest_plot
    resp2_func = destroy_plot
    resp3_func = nop
    
    return {
        "convo":convo_string,
        "resp":[
            {
                "text":resp1_string,
                "func":resp1_func
            },
            {
                "text":resp2_string,
                "func":resp2_func
            },
            {
                "text":resp3_string,
                "func":resp3_func
            },
        ]
    }
}

function getWellConvo(){
    return convo_list['well']
    
    convo_string = "You see a well.";
//    resp1_string = "Thanks! Add another onto that!";
    resp1_string = "Pull up bucket.(+1 Water)";
    resp2_string = "Destroy.";
    resp3_string = "Nevermind.";

    resp1_func = get_water_from_plot
    resp2_func = destroy_plot
    resp3_func = nop
    
    return {
        "convo":convo_string,
        "resp":[
            {
                "text":resp1_string,
                "func":resp1_func
            },
            {
                "text":resp2_string,
                "func":resp2_func
            },
            {
                "text":resp3_string,
                "func":resp3_func
            },
        ]
    }
}




function getTaskList(){

    t1_string = "I did the dishes!";
    t2_string = "I cleaned my house.";
    t3_string = "I got groceries!";

    t1_func = task_dishes
    t2_func = task_cleaned
    t3_func = task_groceries
    
    return {
        "tasks":[
            {
                "text":t1_string,
                "func":t1_func
            },
            {
                "text":t2_string,
                "func":t2_func
            },
            {
                "text":t3_string,
                "func":t3_func
            },
        ]
    }
}

var active_dialog = null

// This should be in WorldSpace but it doesn't work if it's there...
var worldspace_x_offset = 0

// Limiting sum for color
function lim_sum(a,b,min,max){
    c = a+b
    return Math.min(Math.max(c, min), max)
}

function occasionally(func,p){
    if (Math.random() < p){
        func()
    }
}

function nop(){
    return 0
}

function scroll_left(){
    worldspace.scroll_left()
}

function scroll_right(){
    worldspace.scroll_right()
}

class UI_Button {
    constructor(context,x,y,w,h,button_func=nop,hold=false) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.button_func = button_func
        this.hold = hold
        this.item = null
        this.clickdown = false
    };
    setY(y){
        if(this.item != null){
            this.item.setY(y)
        }
    };
    setX(y){
        if(this.item != null){
            this.item.setY(y)
        }
    };
    setXY(x,y){
        if(this.item != null){
            this.item.setY(y)
            this.item.setX(x)
        }
    };
}


class UI_Button_Rect extends UI_Button{
    // g => graphics
    constructor(context,g, x, y, w, h, rad=5, lw=2, text="",button_func=nop,hold=false) {
        super(context,x,y,w,h,button_func,hold)
        this.font_size = 16
        this.color = [100,100,100]
        this.line_color = undefined
        this.rad = rad
        this.lw = lw
        this.text = text
        this.g = g
        this.name = 'button_' + num_buttons.toString
        this.gen_tex()
        this.g.clear()
        this.item = context.add.sprite(this.x, this.y, this.name).setInteractive();
        //context.input.setDraggable(this.item);
        this.bmpText = context.add.bitmapText(x+lw*2, y+this.h/2, 'gem', this.text, this.font_size);
        this.center_just = true
        num_buttons += 1
        this.item.button_func = this.button_func
        this.hover_tint = 0xff0000
        this.item.hover_tint = this.hover_tint 
        
        this.item.on('pointerover', function (event) {
            this.setTint(0xff0000);
        });
        this.item.on('pointerout', function (event) {
            this.clearTint();
        });
        this.item.on('pointerdown', function (event) {
            this.button_func()
            this.clickdown = true
        });
        this.item.on('pointerup', function (event) {
            this.clickdown = false
        });
    };

    gen_tex(){
        drawRect(this.g,this.lw/2,this.lw/2,this.w,this.h,5,this.lw,this.color,this.line_color)
        this.g.generateTexture(this.name, this.w+this.lw, this.h+this.lw);
    }
    
    update(){
        this.x = this.item.x
        this.y = this.item.y
        if (this.center_just){
            let b_h = this.bmpText.height
            let b_w = this.bmpText.width
            this.bmpText.x = Math.floor(this.x - this.w/2 + (this.w-b_w)/2)
            this.bmpText.y = Math.floor(this.y - this.h/2 + (this.h-b_h)/2)
        }else{
            this.bmpText.x = Math.floor(this.x - this.w/2 + this.lw*2)
            this.bmpText.y = Math.floor(this.y - this.h/2 + this.lw*2)     
        }
    }
}


class WorldBlock{
    // Placement can be -1, 0, or 1
    constructor(context,graphics,placement){
        this.placement = placement
        this.bg = context.add.sprite(0,g_height,'bg')
        this.bg_width = this.bg.width
        this.bg.setOrigin(0,1);
        this.compass_n = context.add.sprite(0, 200, 'N');
        this.compass_e = context.add.sprite(0, 200, 'E');
        this.compass_s = context.add.sprite(0, 200, 'S');
        this.compass_w = context.add.sprite(0, 200, 'W');
        this.compass = [this.compass_n,this.compass_e,this.compass_s,this.compass_w]
        this.compass_notches = []
        this.shadows = []
        this.chars = []
        
        for(let i = 0; i<this.compass.length;i++){
            this.compass_notches.push(context.add.sprite(0, 200, 'notch'))
            this.shadows.push(new Shadow(context,0,g_height-50,i))
        }
        // Add Ember
        this.chars.push(new Character(context,100,g_height-200,'ember_overworld','ember_happy',0))

        this.update()
    }

    update(x_offset){
        let world_offset = this.bg_width*this.placement + x_offset

        this.bg.x = world_offset
        this.bg.y = g_height

        let compass_sep = this.bg_width/4
        let compass_offset = this.bg_width/8
            
        for(let i = 0; i < this.compass.length;i++){
            this.compass[i].x = world_offset + (compass_sep * i + compass_offset)    
            this.shadows[i].x = world_offset + (compass_sep * i + compass_offset)
            this.shadows[i].update()
            this.compass_notches[i].x = world_offset + (compass_sep * i)
            if (i < this.chars.length){
                this.chars[i].item.x = world_offset + 400 + (compass_sep * i)
            }
        }
    }
}

class WorldSpace{
    constructor(context,graphics){
        this.wb_arr = []
        this.x_offset = 0

        this.wb_arr.push(new WorldBlock(context,graphics,-1))
        this.wb_arr.push(new WorldBlock(context,graphics,0))
        //this.wb_arr[1].bg.setAlpha(0.5)
        this.wb_arr.push(new WorldBlock(context,graphics,1))
        
        this.bg_width = this.wb_arr[0].bg_width
    }
    scroll_left(){
        //console.log(this.x_offset)
        this.x_offset += 10
        if (this.x_offset >= this.bg_width){
            this.x_offset = 0
        }
    }
    scroll_right(){
        //console.log(this.x_offset)
        this.x_offset -= 10
        if (this.x_offset <= - this.bg_width){
            this.x_offset = 0
        }
    }
    update(){
        for(let i = 0; i<this.wb_arr.length;i++){
            this.wb_arr[i].update(this.x_offset)
        }

    }
}

class UI_Button_Image extends UI_Button{
    constructor(context,x,y,w,h,img,button_func=nop,hold=false) {
        super(context,x,y,w,h,button_func,hold)
        this.item = context.add.sprite(this.x, this.y, img).setInteractive();
        num_buttons += 1

        this.item.button_func = this.button_func
        this.hover_tint = 0xff0000
        this.item.hover_tint = this.hover_tint 
        
        this.item.on('pointerover', function (event) {
            this.setTint(0xff0000);
        });
        this.item.on('pointerout', function (event) {
            this.clearTint();
            this.clickdown = false

        });

        this.item.on('pointerdown', function (event) {
            this.button_func()
            this.clickdown = true
        });
        this.item.on('pointerup', function (event) {
            this.clickdown = false
        });
      };

      update(){

        if(this.hold && this.item.clickdown){
              this.button_func()
          }
      }
  
}
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

class Character{
    constructor(context,x,y,img,portrait_img,index) {
        this.context = context
        this.x = x
        this.y = y
        this.index = index
        this.item = context.add.sprite(this.x, this.y, img).setInteractive();
        this.item.setInteractive()
        this.item.index = index
        this.item.context = context
        this.item.graphics = graphics
        this.item.portrait_img = portrait_img
        
        this.button_func = function(){
            console.log(this.index)
            setShadowState(this.index,buildings[getRandomInt(buildings.length)])
        }
        this.item.on('pointerdown', function (event) {
            let convo = convo_list['ember']
            console.log(convo)
            active_dialog = new Dialog(this.context,this.portrait_img,convo,'ember','na')
        });

    }
}

function getPortraitName(index){
    if(getShadowState(index) == 'empty'){
        return 'shadow'
    }else{
        return getShadowState(index)
    }
}

function end_dialog(){
    if(active_dialog != null){
        active_dialog.destroy()
        active_dialog = null        
    }
    trigger_server_update()
}

curr_active_plot = 0

class Shadow extends UI_Button_Image{
    // Needs to store built objects.
    constructor(context,x,y,index) {
        var button_func = function(){
            console.log(this.index)
            curr_active_plot = this.index
            let portrait = getPortraitName(this.index)
            let dialog = getEmptyPlotConvo()

            switch(getShadowState(this.index)){
                case("empty"):
                    dialog = getEmptyPlotConvo()
                    break;
                case("crops_1"):
                    dialog = getCrops1Convo()    
                    break;
                case("crops_2"):
                    dialog = getCrops2Convo()    
                    break;
                case("well"):
                    dialog = getWellConvo()
                    break;
                default:
                    dialog = getEmptyPlotConvo()    

            }

            active_dialog = new Dialog(this.context,portrait,dialog,getShadowState(this.index),this.index)

            // setShadowState(this.index,buildings[getRandomInt(buildings.length)])
        }
        super(context,x,y,200,100,'shadow',button_func,false)
        this.context = context
        this.item.context = context

        this.item.index = index
        this.index = index
        this.x = x
        this.y = y
        this.sprite = context.add.sprite(x,y,'empty_asset')
        this.sprite.setOrigin(0.5,1)
        this.sprite.setScale(0.3)
        this.curr_state = ''
        this.when_planted = null
        this.last_update_time = null
        this.percent_done = null
        this.bmpText = context.add.bitmapText(x, y, 'gem', "done", 16);

    }
    update(){
        let curr_building = getShadowState(this.index,undefined)
        this.item.x = this.x
        this.item.y = this.y
        this.bmpText.x = this.x-20 
        this.bmpText.y = this.y-200
        if(curr_building == "crops_1"){
            this.bmpText.y = this.y-150
            this.when_planted = getShadowState(this.index,1)
            console.log(this.when_planted)
            if(this.when_planted == null){
                setShadowState(this.index,'crops_1')
                this.last_update_time = new Date().getTime() / 1000
                this.percent_done = 0
                this.bmpText.text = this.percent_done.toString() + "%"
            }else{
                this.last_update_time = new Date().getTime() / 1000
                let seconds_since = this.last_update_time-this.when_planted
                this.percent_done = Math.round(seconds_since/harvest_times["crops_1"]["harvest_time"]*100)
                if(this.percent_done > 100){
                    // console.log(this.last_update_time)
                    // console.log(this.when_planted)
                    setShadowState(this.index,"crops_2") 
                    this.bmpText.y = this.y-300
                    this.bmpText.text = "100%"        
                }else{
                    this.bmpText.text = this.percent_done.toString() + "%"
                }
            }

        }else if (curr_building == "empty"){
            this.bmpText.y = this.y-150
            this.bmpText.text = ""
        }else if (curr_building == "crops_2"){
            this.bmpText.y = this.y-300
            this.bmpText.text = "100%"
        }
        if(this.sprite != null){
            this.sprite.x = this.x
            this.sprite.y = this.y-20
        }
        if(getShadowState(this.index)!= this.curr_state){
            this.sprite.setTexture(getShadowState(this.index))
            this.curr_state = getShadowState(this.index)
        }

    }
}

class stringBuilder{
    constructor(final_str,text_obj) {
        this.curr_str = ''
        this.curr_len = 0
        this.final_str = final_str
        this.text_obj = text_obj
        this.chars = this.final_str.split("");
        this.diag_frame_counter = 0
        this.finished = 0
    }
    update(){
        if(!this.finished){
            this.curr_str = ''
            for(let i = 0; i < this.curr_len;i++){
                this.curr_str += this.chars[i]
                //curr_string += " "                
            }
            this.text_obj.text = this.curr_str
            if(this.curr_len < this.chars.length){
                this.diag_frame_counter += 1
                if (this.diag_frame_counter > 5){
                    this.curr_len += 1
                    this.diag_frame_counter = 0
                }
            }
            if(this.text_obj.text == this.final_str){
                this.finished = 1
            }
        }
    }

    finish(){
        this.text_obj.text = this.final_str
        this.curr_len = this.final_str.length
        this.finished = 1
    }
    
}

function submit_dialog_choice(){
    let character = this.character
    let location = this.location
    let choice = this.resp_index
    // Tell convo location, character name, and choice to the
    let data = {"character":character,"location":location,"choice":choice}
    console.log(data)
    getData(JSON.stringify(data),"/tell/convo_finish",update_world_data)
}

class DialogBox{
    constructor(context,x,y,w,h,text,resp_func,char,loc,resp_index) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.color = [100,0,0]
        this.resp_func = resp_func
        this.text = text
        this.font_size  = 30 
        this.dialog_box = context.add.rectangle(this.x, this.y, this.w,this.h,Rgb(this.color[0],this.color[1],this.color[2]))
        if(char != undefined){
            this.dialog_box.character = char
        }
        if(loc != undefined){
            this.dialog_box.location = loc
        }
        if(resp_index != undefined){
            this.dialog_box.resp_index = resp_index
        }

        this.dialog_box.orig_color = this.color
        this.dialog_box.resp_func = this.resp_func

        this.dialog_text = context.add.bitmapText(0, 0, 'gem','',this.font_size,"left")
        this.dialog_text.setOrigin(0,0)
        this.dialog_string = new stringBuilder(text,this.dialog_text)
        this.update() 
        this.padding = 10
        this.finished = 0
    }
    update(string_update=false){
        this.dialog_box.x = g_width/2
        this.dialog_text.maxWidth = this.dialog_box.width - 2*this.padding
        this.dialog_text.x = this.dialog_box.x - this.dialog_box.width/2 + this.padding
        this.dialog_text.y = this.dialog_box.y - (this.dialog_box.height-this.dialog_text.height)/2

        if(string_update){
            if(!this.dialog_string.finished){
                this.dialog_string.update()
            }
            if(this.dialog_string.finished && !this.finished){
                this.finish()
                this.finished = 1
            }
        }
    }
    finish(){
        this.dialog_string.finish()

        if(!this.finished){
            console.log(this.text)
            if(this.resp_func != nop){
                this.dialog_box.setInteractive()
                this.dialog_box.on('pointerover', function (event) {
                    this.fillColor = Rgb(
                        lim_sum(this.orig_color[0],-10,0,255),
                        lim_sum(this.orig_color[1],-10,0,255),
                        lim_sum(this.orig_color[2],-10,0,255),
                        );
                });
                this.dialog_box.on('pointerout', function (event) {
                    this.fillColor = Rgb(this.orig_color[0],this.orig_color[1],this.orig_color[2]);
        
                });
        
                this.dialog_box.on('pointerdown', function (event) {
                    this.resp_func()
                    end_dialog()
                });    
            }
        }
        this.finished = 1

    }
    destroy(){
        this.dialog_text.destroy()
        this.dialog_box.destroy()
    }
    
}


class Dialog{
    constructor(context,portrait_img,dialog,character,location) {
        this.block = context.add.rectangle(0, 0, g_width,g_height,Rgb(0,20,0)).setAlpha(0.5)
        this.block.setOrigin(0,0)
        this.block.setInteractive()

        this.portrait = context.add.rectangle(g_width/2, 100, 200,200,Rgb(100,0,0))
        this.portrait_img = context.add.sprite(g_width/2, 105, portrait_img)
        this.portrait_img.displayWidth = 190
        this.portrait_img.displayHeight = 190
        this.portrait_img.setOrigin(0.5,0)
        this.portrait.setOrigin(0.5,0)
        console.log(dialog)
        this.convo_dict = dialog
        
        // this.dialog_box = context.add.rectangle(g_width/2, 400, 500,120,Rgb(100,0,0))
        // this.dialog_text = context.add.bitmapText(g_width/2-200, 380, 'gem','',30,"left")
        // this.dialog_text.setOrigin(0,0)
        this.convo_width = 500
        this.convo_height = 120
        this.resp_height = 50
        this.resp_padding = 20
        
        this.convo_x = g_width/2
        this.convo_y = 400

        
        this.convo_box = new DialogBox(context,
            this.convo_x,
            this.convo_y,
            this.convo_width,
            this.convo_height,
            this.convo_dict['dialog'],
            nop
        )

        this.resp_base_height = this.convo_y + this.convo_height
        console.log(this.resp_base_height)
        this.responses = []
        for(let i = 0; i<this.convo_dict['resp'].length;i++){
            let temp_box = new DialogBox(context,
                this.convo_x,
                this.resp_base_height + (this.resp_height + this.resp_padding)*i,
                this.convo_width,
                this.resp_height,
                this.convo_dict['resp'][i],
                submit_dialog_choice,
                character,
                location,
                i
            )       
            this.responses.push(temp_box)
        }
        

        this.finished = 0

        this.block.on('pointerdown', function (event) {
            if (active_dialog.finished){
                end_dialog()
            }else{
                if(!active_dialog.convo_box.finished){
                    active_dialog.convo_box.finish()
                    return
                }
                console.log(active_dialog.responses.length)
                for(let i = 0; i<active_dialog.responses.length;i++){
                    if(!active_dialog.responses[i].finished){
                        active_dialog.responses[i].finish()
                        console.log(active_dialog.responses[i].dialog_string.text_obj.text)    
                        return
                    }   
                }
            }
        });
    }

    update(){
        if(this.finished){
            return
        }
        if(!this.convo_box.dialog_string.finished){
            this.convo_box.update(true)
        }else{
            for(let i = 0; i<this.responses.length;i++){
                if(!this.responses[i].dialog_string.finished){
                    this.responses[i].update(true)
                    return
                }
            }
            this.finished = 1
        }

    }

    destroy(){
        this.block.destroy()
        this.portrait.destroy()
        this.convo_box.destroy()
        for(let i = 0; i<this.responses.length;i++){
            this.responses[i].destroy()
        }
        this.portrait_img.destroy()
        
    }
}

class TaskDialog{
    constructor(context) {
        this.block = context.add.rectangle(0, 0, g_width,g_height,Rgb(0,20,0)).setAlpha(0.5)
        this.block.setOrigin(0,0)
        this.block.setInteractive()

        this.tasks_dict = getTaskList()
        
        // this.dialog_box = context.add.rectangle(g_width/2, 400, 500,120,Rgb(100,0,0))
        // this.dialog_text = context.add.bitmapText(g_width/2-200, 380, 'gem','',30,"left")
        // this.dialog_text.setOrigin(0,0)
        this.convo_width = 500
        this.convo_height = 120
        this.resp_height = 50
        this.resp_padding = 20
        
        this.convo_x = g_width/2
        this.convo_y = 400
 
        this.resp_base_height = this.convo_y + this.convo_height
        console.log(this.resp_base_height)
        this.responses = []

        for(let i = 0; i<this.tasks_dict['tasks'].length;i++){
            this.responses.push(new DialogBox(context,
                this.convo_x,
                this.resp_base_height + (this.resp_height + this.resp_padding)*i,
                this.convo_width,
                this.resp_height,
                this.tasks_dict['tasks'][i]['text'],
                this.tasks_dict['tasks'][i]['func']
            ))
        }
        console.log(this.responses.length)
        for(let i = 0; i<this.responses.length;i++){
            console.log(i)
            this.responses[i].finish()
        }
        this.finished = 0

        this.block.on('pointerdown', function (event) {
            end_dialog()
        });
    }

    update(){
        for(let i = 0; i<this.responses.length;i++){
            this.responses[i].update()
        }
    }

    destroy(){
        this.block.destroy()
        for(let i = 0; i<this.responses.length;i++){
            this.responses[i].destroy()
        }
    }
}

function open_task_dialog(){
    active_dialog = new TaskDialog(context,graphics)
}

function set_ui(refresh = false){
    set_height_width()
    if(!refresh){
        debug_txt_box = this.add.bitmapText(10, 10,'gem','',16);
        task_button = new UI_Button_Rect(this,graphics,100,100,50,50,undefined,undefined,"Tasks",open_task_dialog)

        // Only use 'this' context when being called from the gameworld.
        
        right_arrow = new UI_Button_Image(this,100,100,50,50,"arrow",scroll_right,true)
        right_arrow.item.flipX = true
        // right_arrow = this.add.sprite(g_width-100,g_height-100,'arrow').setInteractive();
        // right_arrow.flipX = true
        left_arrow = new UI_Button_Image(this,100,100,50,50,"arrow",scroll_left,true)
    }
    right_arrow.item.x = g_width-100
    right_arrow.item.y = g_height-100
    left_arrow.item.x = 100
    left_arrow.item.y = g_height-100

    task_button.item.x = g_width-100
    task_button.item.y = 100

    right_arrow.update()
    left_arrow.update()
    task_button.update()

    debug_txt_box.setText(
        "WID = " + g_width.toString() + '\n' +
        "HGT = " + g_height.toString() + '\n' + 
        "FPS = " + game.loop.actualFps + '\n\n' +
        "Water  = " + world_data.resources.water+ '\n' +
        "Energy = " + world_data.resources.energy+ '\n' +
        "Food   = " + world_data.resources.food + '\n' +
        "Morale = " + world_data.resources.morale
        )
}

function MakeUE4JSON(){
    send_json = JSON.stringify(world_data.shadow_state)
    console.log(send_json)
    return(send_json)
}

class gameworld extends Phaser.Scene{
    constructor(){
        super({key:"gameworld"});
    }
    preload(){
        graphics = this.add.graphics()
        context = this
        this.load.image('test_smile','assets/smile_test.png')
        this.load.image('arrow','assets/arrow.png')
        this.load.image('bg','assets/test_bg.png')
        this.load.image('shadow','assets/test_shadow.png')
        this.load.image('empty','assets/empty_asset.png')
        this.load.image('crops_1','assets/crops_1.png')
        this.load.image('crops_2','assets/crops_2.png')
        this.load.image('well','assets/well.png')

        this.load.image('ember_overworld','assets/ember_overworld_pixel.png')
        this.load.image('ember_happy','assets/ember_happy.png')


        this.load.image('N','assets/n.png')
        this.load.image('S','assets/s.png')
        this.load.image('E','assets/e.png')
        this.load.image('W','assets/w.png')
        this.load.image('notch','assets/notch.png')


        // Font from https://github.com/photonstorm/phaser-examples/tree/master/examples/assets/fonts/bitmapFonts
        this.load.bitmapFont('gem','assets/fonts/gem.png','assets/fonts/gem.xml')
    }

    create(){
        var debug_func = function(){
            refresh_world_data()
        }
        get_all_convos()
        worldspace = new WorldSpace(this,graphics)

        this.button1 = new UI_Button_Rect(this,graphics,100,200,100,50,undefined,undefined,"Force Update",debug_func)
        this.button2 = new UI_Button_Rect(this,graphics,100,300,100,50,undefined,undefined,"Reset World",reset_world)

        set_ui.apply(this);

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {

            gameObject.x = dragX;
            gameObject.y = dragY;
    
        });
    }
    update(){
        if(fps_limiter != 0){
            if (fps_limiter_counter <= fps_limiter){
                fps_limiter_counter += 1
                return
            }else{
                fps_limiter_counter = 0
            }
        }

        this.button1.update()
        this.button2.update()

        worldspace.update()
        set_ui(true)
        if(active_dialog != null){
            active_dialog.update()
        }
    }
}

var fps_limiter = 0
var fps_limiter_counter = 0

// Reference: http://phaser.io/examples/v3/view/game-objects/graphics/generate-texture-to-sprite
function drawRect(r_graphics,x,y,w,h,rad,line_width,color,line_color=undefined){
    r_graphics.fillStyle(Rgb(color[0],color[1],color[2]), 1);
    r_graphics.fillRoundedRect(x, y,w,h,rad);
    if (line_width >= 1){
        // Make the outline a little darker than the body
        if (line_color === undefined){
            let r = lim_sum(color[0],-50,0,255)
            let g = lim_sum(color[0],-50,0,255)
            let b = lim_sum(color[0],-50,0,255)
            line_color = Rgb(r,g,b)
        }else{
            line_color = Rgb(line_color[0],line_color[1],line_color[2])
        }
        r_graphics.lineStyle(line_width, line_color, 1);
        // graphics.strokeRoundedRect(x, y, x+w, y+h, { tl: r, tr: r, bl: r, br: r});
        //r_graphics.strokeRoundedRect(x, y,w,h,rad);
    }
}

function refreshWorld(){
}

function getData(data,uri,callback_func){
    url = document.location.origin +"/api" + uri
    $.ajax({
            type: "POST",
            url: url,
            data: data,
            contentType: "application/json; charset=utf-8",
            crossDomain: true,
            dataType: "json",
            success: function (data, status, jqXHR) {
                console.log(data);
                callback_func(data)
            },
            error: function (jqXHR, status) {
                // error handler
                console.log(jqXHR);
            }
         });
    }


function addData(data,uri=null){
    let url = ''
    if(uri==null){
        url = document.location.origin+"/api"
    }else{
        url = document.location.origin +"/api" + uri
    }
    $.ajax({
            type: "POST",
            url: url,
            data: data,
            contentType: "application/json; charset=utf-8",
            crossDomain: true,
            dataType: "json",
            success: function (data, status, jqXHR) {
                console.log(data);
            },

            error: function (jqXHR, status) {
                // error handler
                console.log(jqXHR);

            }
         });
    }

window.addEventListener('resize', () => {
    let hw = set_height_width()
    game.scale.resize(hw[0], hw[1]);
    set_ui(refresh=true)
   // scene.cameras.main.setViewport(0,0,w,h)
   // Useful trick from: https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
   let vh = window.innerHeight * 0.01;
   document.documentElement.style.setProperty('--vh', `${vh}px`); 
});

var session_check_timer = setInterval(check_session_validity, 1000);
var world_refresher = setInterval(refresh_world_data, 1000);