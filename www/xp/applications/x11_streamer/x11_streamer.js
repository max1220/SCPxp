/* --- CREATE STATE AND REGISTER PARAMETERS --- */

// create an application state object with some defaults
let state_obj = {}
let state = new AppState(state_obj)

// register the known state parameters with types for automatic error checking and serialization
function register_state_parameters() {
	function add_serialize(key, type) {
		state.add_key_parameters(key, type, true, true);
	}
	function add_internal(key, type, default_val) {
		state.add_key_parameters(key, type, true, false);
		if (default_val!==undefined) { state_obj[key] = default_val }
	}

	// has the update_stream() function been called?
	add_internal("has_stream", "boolean", false)

	// the screen element to use
	add_internal("screen_img_elem_id", "text", "screen_img")

	// the session ID
	add_serialize("session_id", "text")

	// X11 display
	add_serialize("display", "text")

	// current X11 display dimensions
	add_internal("display_width", "integer")
	add_internal("display_height", "integer")

	// Xauthority file to use for commands like xdotool
	add_internal("xauthority", "text")

	// ffmpeg settings
	add_serialize("view_width", "integer")
	add_serialize("view_height", "integer")
	add_serialize("view_offset_x", "integer")
	add_serialize("view_offset_y", "integer")
	add_serialize("encode_framerate", "integer")
	add_serialize("encode_quality", "integer")
	add_serialize("encode_low_delay", "boolean")

	// input settings
	add_serialize("input_keyboard_enable", "boolean")
	add_serialize("input_mouse_enable", "boolean")
	add_serialize("input_mouse_capture", "boolean")
	add_internal("input_mouse_min_delay", "integer", 16)
	add_internal("input_mouse_max_delay", "integer", 66)
	add_internal("input_mouse_async", "boolean", true)

	// auto resize
	add_serialize("auto_resize_view_enable", "boolean")
	add_serialize("auto_resize_server_enable", "boolean")
	add_internal("auto_resize_timeout", "integer", 500)

	// auto-connect existing session/auto-create Xvfb session/auto-create mirror session
	add_serialize("auto_connect_session", "boolean")
	add_serialize("auto_create_xvfb", "boolean")
	add_serialize("auto_create_mirror", "boolean")

	// configuration for creating a server
	add_serialize("session_create_mirror_display", "text")
	add_serialize("session_create_width", "integer")
	add_serialize("session_create_height", "integer")
	add_serialize("session_create_wm", "text")
	add_serialize("session_create_command", "text")
	add_serialize("session_create_mirror_display", "text")

	add_internal("close_to_blank", "boolean", true)
}
register_state_parameters()



/* --- INSTANCIATE HELPER OBJECTS --- */

// create a new wrapper to call CGI commands
let cgi_commands = new CgiCommands(CGI_BACKEND)

// create a X11 streamer object
let x11_streamer = new X11Streamer(state.data, cgi_commands)



/* --- UTILLITY FUNCTIONS --- */

// get the server XAUTHORITY file
function update_xauthority() {
	state.data.xauthority = cgi_commands.get_env().XAUTHORITY
}

// start/update the stream
function update_stream() {
	let screen_img_elem = document.getElementById(state.data.screen_img_elem_id)
	x11_streamer.update_display()
	console.log("update_stream", state.data.display)
	screen_img_elem.classList.remove("hidden")
	screen_img_elem.src = CGI_BACKEND + "?" + x11_streamer.enc_ffmpeg_mpjpeg_config()
	state.data.has_stream = true
	let alive_checker = setInterval(function() {
		if (!check_session_exists()) {
			clearInterval(alive_checker)
			stop_stream();
		}
	}, 5000)
}

// stop the stream
function stop_stream() {
	console.log("Stopping stream")
	if (state.data.close_to_blank) {
		location.href = "about:blank#close"
		return;
	}
	let screen_img_elem = document.getElementById(state.data.screen_img_elem_id)
	screen_img_elem.classList.add("hidden")
	screen_img_elem.src = ""
	state.data.has_stream = false
}

// check if the current session still exists on the server
function check_session_exists() {
	let session_id = state.data.session_id
	let resp = cgi_commands.run_command_sync(["eval", "[ -d \"xsessions/" + session_id + "\" ] && echo ok"]).trim()
	return (resp=="ok")
}

// generate a random id of len characters
function generate_random_hex(len) {
	return Array.from(window.crypto.getRandomValues(new Uint8Array(Math.floor(len||8) / 2))).map(function(n) {
		return n.toString(16).padStart(2, "0")
	}).join("")
}

// create a new session by running xvfb-run with the session creation script
function create_session_xvfb(onready_cb) {
	// generate new session ID
	let new_session_id = generate_random_hex()
	state.data.session_id = new_session_id

	console.log("create_session_xvfb", state.data.session_create_command, new_session_id)

	// encode the command to launch
	let xvfb_cmd = x11_streamer.enc_create_session_xvfb(
		new_session_id,
		state.data.session_create_command,
		state.data.session_create_wm,
		state.data.session_create_width,
		state.data.session_create_height,
		state.data.xauthority,
		"lines"
	)

	function stdout_cb(data) {
		console.log("xvfb-run: ", data)
		if (data == ("READY " + new_session_id)) {
			update_stream()
			window_onresize()
		} else if (data == ("END " + new_session_id)) {
			stop_stream()
		}
	}
	function ret_cb(ret_val) {
		console.log("xvfb-run returned: ", ret_val)
		// X11 server stopped
		stop_stream()
	}

	return cgi_commands.run_encoded_event_stream(xvfb_cmd, stdout_cb, ret_cb)
}

function create_session_mirror() {
	// generate new session ID
	let new_session_id = generate_random_hex()
	state.data.session_id = new_session_id
	state.data.display = state.data.session_create_mirror_display

	// encode the command to launch
	let mirror_cmd = x11_streamer.enc_create_session_mirror(
		new_session_id,
		state.data.session_create_mirror_display,
		state.data.xauthority
	)

	// connect to the existing X11 server(request only finishes when session is ended)
	return cgi_commands.run_encoded_async(mirror_cmd, function() {
		// session stopped
		stop_stream()
	})
}



/* --- ELEMENT EVENT HANDLERS --- */
// mouse move event handler for the screen
// This will send absolute or relative mouse move events based on the state
// of the mouse capture.
// The relative mouse movements are accumulated if not ready to send immediatly.
// When a request is sent, additional mouse movement is blocked until either
// the request is completed, or a timeout has occured. This helps
// keep user input latency low and accurate for the synchronous case
let ev_button_to_button = {
	0: 1,
	2: 3
}
let cur_x = undefined
let cur_y = undefined
let cur_t = window.performance.now()
let cur_req = undefined
function screen_img_elem_onmousemove(e) {
	if ((!state.data.input_mouse_enable) || (!state.data.has_stream)) { return; }
	e.preventDefault()

	// the latest currently-known cursor position or delta
	if (document.pointerLockElement) {
		cur_x = (cur_x || 0) + e.movementX
		cur_y = (cur_y || 0) + e.movementY
	} else {
		cur_x = e.clientX
		cur_y = e.clientY
	}

	// get time since last call to this function
	let now = window.performance.now()
	let dt = (now - cur_t)

	// not ready for another input event yet
	if (dt<state.data.input_mouse_min_delay) {
		return
	}
	cur_t = now

	// the async case just sends an event to the fifo and doesn't care about the return value
	if (state.data.input_mouse_async) {
		x11_streamer.send_mouse_move(cur_x, cur_y, !!document.pointerLockElement)
		cur_x = undefined
		cur_y = undefined
		return
	}

	if ((dt>state.data.input_mouse_max_delay) && cur_req) {
		// currently running request timed out
		cur_req.abort()
		cur_req = undefined
	} else if ((dt<state.data.input_mouse_max_delay) && cur_req) {
		// running request still pending
		return
	}
	// ready to send a request

	// send a mouse move event
	cur_req = x11_streamer.send_mouse_move(cur_x, cur_y, !!document.pointerLockElement, function() {
		cur_req = undefined
		cur_x = undefined
		cur_y = undefined
	})
}

// mouse button handlers for the screen element.
// These functions simply forward the mouse button click
function screen_img_elem_onmousedown(e) {
	if (!state.data.input_mouse_enable || !state.data.has_stream) { return; }
	if (ev_button_to_button[e.button]) {
		if (!document.pointerLockElement) {
			x11_streamer.send_mouse_move(e.clientX, e.clientY)
		}
		x11_streamer.send_mouse_btn(ev_button_to_button[e.button], true)
		e.preventDefault()
	}
}
function screen_img_elem_onmouseup(e) {
	if (!state.data.input_mouse_enable || !state.data.has_stream) { return; }
	if (ev_button_to_button[e.button]) {
		x11_streamer.send_mouse_btn(ev_button_to_button[e.button], false)
		e.preventDefault()
	}
}
function screen_img_elem_oncontextmenu(e) {
	if (!state.data.input_mouse_enable || !state.data.has_stream) { return; }
	e.preventDefault()
}
function screen_img_elem_onclick(e) {
	if (!state.data.input_mouse_enable || !state.data.has_stream) { return; }
	if (state.data.input_mouse_capture) {
		e.target.focus()
		e.target.requestPointerLock()
		e.preventDefault()
	}
}
function screen_img_elem_onwheel(e) {
	if (!state.data.input_mouse_enable || !state.data.has_stream) { return; }
	if (e.deltaY>0) {
		x11_streamer.send_mouse_btn(5, true, function() {
			x11_streamer.send_mouse_btn(5, false)
		})
	} else {
		x11_streamer.send_mouse_btn(4, true, function() {
			x11_streamer.send_mouse_btn(4, false)
		})
	}
}

// keyboard event handlers for the screen
function screen_img_elem_onkeydown(e) {
	if ((!state.data.input_keyboard_enable) || (!state.data.has_stream)) { return; }
	let keysym = x11_streamer.code_to_keysym[e.code]
	if (keysym !== undefined) {
		x11_streamer.send_key(keysym, true)
		e.preventDefault()
	}
}
function screen_img_elem_onkeyup(e) {
	if ((!state.data.input_keyboard_enable) || (!state.data.has_stream)) { return; }
	let keysym = x11_streamer.code_to_keysym[e.code]
	if (keysym !== undefined) {
		x11_streamer.send_key(keysym)
		e.preventDefault()
	} else {
		console.log("Unknown key:", e)
		console.log(x11_streamer.code_to_keysym)
	}
}

// register the event handlers for the specified element
function screen_img_elem_register() {
	let screen_img_elem = document.getElementById(state.data.screen_img_elem_id)
	// add the event callbacks
	screen_img_elem.onmousemove = screen_img_elem_onmousemove
	screen_img_elem.onmousedown = screen_img_elem_onmousedown
	screen_img_elem.onmouseup = screen_img_elem_onmouseup
	screen_img_elem.oncontextmenu = screen_img_elem_oncontextmenu
	screen_img_elem.onclick = screen_img_elem_onclick
	screen_img_elem.onwheel = screen_img_elem_onwheel
	//screen_img_elem.onkeydown = screen_img_elem_onkeydown
	//screen_img_elem.onkeyup = screen_img_elem_onkeyup

	// make the screen element focusable(required for onkeydown/onkeyup)
	screen_img_elem.tabIndex = "-1"
}

// handler for connecting to an existing display
function connect_session() {
	if (!state.data.session_id || (state.data.session_id=="")) { return; }
	// connect to an existing session
	document.getElementById("settings").hidden = true
	let screen_img_elem = document.getElementById("screen_img")
	screen_img_elem.hidden = false
	screen_img_elem.focus()
	update_stream()
	window_onresize()
	state.data.auto_connect_session = true
	state.data.auto_create_mirror = false
	state.data.auto_create_xvfb = false
}

// button handler for creating a new display
function btn_create_session_xvfb() {
	create_session_xvfb()
	document.getElementById("settings").hidden = true
	let screen_img_elem = document.getElementById("screen_img")
	screen_img_elem.hidden = false
	screen_img_elem.focus()
	state.data.auto_connect_session = true
	state.data.auto_create_mirror = false
	state.data.auto_create_xvfb = false
}

function btn_create_session_mirror() {
	create_session_mirror()
	document.getElementById("settings").hidden = true
	let screen_img_elem = document.getElementById("screen_img")
	screen_img_elem.hidden = false
	screen_img_elem.focus()
	window.setTimeout(function() {
		update_stream()
		window_onresize()
	}, 1000)
	state.data.auto_connect_session = true
	state.data.auto_create_mirror = false
	state.data.auto_create_xvfb = false
}


function update_sessions_list() {
	let sessions = x11_streamer.list_sessions()
	window.sessions_list.innerHTML = ""
	if (!sessions) { return; }

	sessions.forEach(function(session) {
		let line_elem = document.createElement("div")
		line_elem.classList.add("session_line")

		let id_elem = document.createElement("div")
		id_elem.classList.add("session_id")
		id_elem.innerText = session.id
		line_elem.appendChild(id_elem)

		let display_elem = document.createElement("div")
		display_elem.classList.add("session_display")
		display_elem.innerText = session.display
		line_elem.appendChild(display_elem)

		let command_elem = document.createElement("code")
		command_elem.classList.add("session_command")
		command_elem.innerText = session.command
		line_elem.appendChild(command_elem)

		let connect_elem = document.createElement("button")
		connect_elem.classList.add("session_connect")
		connect_elem.classList.add("btn")
		connect_elem.innerText = "Connect"
		connect_elem.onclick = function() {
			console.log("Connecting to: ", session.id)
			state.data.session_id = session.id
			connect_session()
		}
		line_elem.appendChild(connect_elem)

		/*let kill_elem = document.createElement("button")
		kill_elem.classList.add("session_kill")
		kill_elem.classList.add("btn")
		kill_elem.innerText = "Kill"
		line_elem.appendChild(kill_elem) */

		window.sessions_list.appendChild(line_elem)
	})
}


/* --- GLOBAL EVENT HANDLERS --- */

// resize view to current dimensions
let auto_resize_blocked = false
function window_onresize() {
	// if still in timeout or have no stream, abort
	if (auto_resize_blocked || (!state.data.has_stream)) { return; }

	// resize the server or view, if requested
	if (state.data.auto_resize_server_enable) {
		state.data.view_width = window.innerWidth
		state.data.view_height = window.innerHeight
		x11_streamer.xrandr_change_resolution(state.data.view_width, state.data.view_height)
		update_stream()
	} else if (state.data.auto_resize_view_enable) {
		state.data.view_width = window.innerWidth
		state.data.view_height = window.innerHeight
		update_stream()
	}

	// limit resize requests per second
	setTimeout(function() {
		auto_resize_blocked = false
	}, state.data.auto_resize_timeout)
}

// called by the WM when the window is loaded
function win_load() {
	win.title = "X11 Streamer"
	win.icon = "application-x11-streamer"
	win.resize(460, 600)
	win.resizeable = true
	win.update()
}

// kill the session when the window closes
function win_ev(ev_type) {
	if ((ev_type == "close") && state.data.session_id && (state.data.session_id !== "")) {
		x11_streamer.kill_session()

		//return true
	}
}


// Call when the application is loaded.
function window_onload() {
	// load the initial configuration values from the HTML data,
	// by calling all onchange functions for input elements with the data-update attribute.
	console.log("Loading state...")
	state.load()
	console.log("Loaded state:", state.data)

	// set the event handlers for the screen element to enable keyboard/mouse input
	screen_img_elem_register()

	// get the current value of the XAUTHORITY env variable from the server
	update_xauthority()

	// register an onresize event on the window
	window.addEventListener("resize", window_onresize)
	window.addEventListener("keydown", screen_img_elem_onkeydown)
	window.addEventListener("keyup", screen_img_elem_onkeyup)

	// create session or connect to sessuib automatically if requested via the arguments
	if (state.data.session_id && (state.data.session_id!=="") && state.data.auto_connect_session) {
		connect_session()
	} else if (state.data.display && (state.data.display!=="") && state.data.auto_create_mirror) {
		btn_create_session_mirror()
	} else if (state.data.session_create_command && (state.data.session_create_command!=="") && state.data.auto_create_xvfb) {
		btn_create_session_xvfb()
	}
}
