/* --- SETTINGS --- */

// create a new wrapper to call CGI commands
let cgi_commands = new CgiCommands("/cgi-bin/cgi_command.sh")

// create an application state object
let state = new AppState({})

// create a X11 streamer object
let x11_streamer = new X11Streamer(state.data, cgi_commands)

// add a key that is serialized and kept between reloads
function add_serialize(key, type) {
	state.add_key_parameters(key, type, true, true)
}
// add a key that is only kept while the page lives
function add_internal(key, type) {
	state.add_key_parameters(key, type, true, false)
}

// The session ID
add_serialize("session_id", "text")

// X11 display grabbing settings
add_serialize("display", "text")
add_serialize("view_width", "integer")
add_serialize("view_height", "integer")
add_serialize("view_x_offset", "integer")
add_serialize("view_y_offset", "integer")
add_serialize("encode_framerate", "integer")
add_serialize("encode_quality", "integer")
add_serialize("encode_low_delay", "boolean")
add_serialize("xauthority", "text")

// input settings
add_serialize("enable_keyboard_input", "boolean")
add_serialize("enable_mouse_input", "boolean")
add_serialize("enable_mouse_capture", "boolean")

// auto resize
add_serialize("enable_auto_resize_view", "boolean")
add_serialize("enable_auto_resize_server", "boolean")

// auto-connect/auto-create from URL
add_serialize("enable_auto_connect", "boolean")
add_serialize("enable_auto_create", "boolean")

// configuration for creating a server
add_serialize("server_create_width", "integer")
add_serialize("server_create_height", "integer")
add_serialize("server_create_wm", "text")
add_serialize("server_create_command", "text")

// Has the update_stream() function been called?
add_internal("has_stream", "boolean")

// current X11 Server dimensions
add_internal("server_width", "boolean")
add_internal("server_height", "boolean")


// start/update the stream
function update_stream() {
	x11_streamer.update_display()
	screen_img_elem.width=state.data.view_w
	screen_img_elem.height=state.data.view_h
	screen_img_elem.classList.remove("hidden")
	screen_img_elem.src = "/cgi-bin/cgi_command.sh?" + x11_streamer.enc_ffmpeg_mpjpeg_config()
	state.data.has_stream = true
}

// stop the stream
function stop_stream() {
	screen_img_elem.classList.add("hidden")
	screen_img_elem.src = ""
	state.data.has_stream = false
}

// generate a random id of len characters
function generate_random_hex(len) {
	return Array.from(window.crypto.getRandomValues(new Uint8Array(Math.floor(len||8) / 2))).map(function(n) {
		return n.toString(16).padStart(2, "0")
	}).join("")
}

// create a new session by running xvfb-run with the session creation script
function create_session() {
	// generate new session ID
	let new_session_id = generate_random_hex()
	state.data.session_id = new_session_id

	// encode the command to launch
	let xvfb_cmd = x11_streamer.enc_xvfb_run(
		new_session_id,
		state.data.server_create_command,
		state.data.server_create_wm,
		state.data.server_create_width, state.data..server_create_height,
		cgi_commands.get_env().XAUTHORITY
	)

	// start the X11 server(request only finishes when X11 server terminates)
	return x11_streamer.run_encoded_async(xvfb_cmd, function() {
		// X11 server stopped
		stop_stream()
	})
}


/* --- ELEMENT EVENT HANDLERS --- */

// Input handlers for the screen element
let mouse_move_blocked = false
let ev_button_to_button = {
	0: 1,
	2: 3
}
let dx_acc = 0
let dy_acc = 0

function screen_img_elem_onmousemove(e) {
	if ((!enable_mouse_input) || (!is_running)) { return; }
	if (mouse_move_blocked) {
		if (document.pointerLockElement) {
			dx_acc = dx_acc + e.movementX
			dy_acc = dy_acc + e.movementY
		}
		return
	}

	mouse_move_blocked = true
	if (document.pointerLockElement) {
		send_mouse(dx_acc+e.movementX, dy_acc+e.movementY, true, function() {
			mouse_move_blocked = false
		})
	} else {
		send_mouse(e.clientX, e.clientY, false, function() {
			mouse_move_blocked = false
		})
	}
	setTimeout(function() {
		mouse_move_blocked = false
	}, 50)
	dx_acc = 0
	dy_acc = 0
	e.preventDefault()
}
function screen_img_elem_onmousedown(e) {
	if (!enable_mouse_input || !is_running) { return; }
	if (ev_button_to_button[e.button]) {
		send_mouse_btn(ev_button_to_button[e.button], true)
		e.preventDefault()
	}
}
function screen_img_elem_onmouseup(e) {
	if (!enable_mouse_input || !is_running) { return; }
	if (ev_button_to_button[e.button]) {
		send_mouse_btn(ev_button_to_button[e.button], false)
		e.preventDefault()
	}
}
function screen_img_elem_oncontextmenu(e) {
	e.preventDefault()
}
function screen_img_elem_onclick(e) {
	if (enable_mouse_capture) {
		e.target.requestPointerLock()
		e.preventDefault()
	}
}
function screen_img_elem_onwheel(e) {
	let wheel_url = enc_mouseclick()
	if (e.deltaY>0) {
		send_mouse_btn(5, true, function() {
			send_mouse_btn(5, false)
		})
	} else {
		send_mouse_btn(4, true, function() {
			send_mouse_btn(4, false)
		})
	}
}


// called after the initial conneciton has been made
function on_initial_connect() {
	// hide the menu and trigger initial resize
	if (hide_elem_id) { document.getElementById(hide_elem_id).classList.add("hidden") }
	screen_onresize()
}

// button handler for connecting to an existing display(hide hide_elem_id on completion)
function btn_connect() {
	if (session_id && (session_id!=="")) {
		// connect to an existing session(get DISPLAY from session)
		get_display_for_session(function() {
			update_stream(on_initial_connect)
		})
	} else {
		// connect to a X11 display without a session
		update_stream(on_initial_connect)
	}
}

// button handler for creating a new display
function btn_create() {
	// TODO: This is not correct but would need proper unquoting
	let ssv = state.data.server_create_command.split(" ")
	let enc_xvfb_run = x11_streamer.enc_xvfb_run(
	xvfb_create_display(ssv[0], ssv.slice(1))
	window.setTimeout(function() {
		get_display_for_session(function() {
			update_stream(on_initial_connect)
		})
	}, 500)
}



/* --- GLOBAL EVENT HANDLERS --- */

// key was pressed
function screen_onkeydown(e) {
	if ((!state.data.enable_keyboard_input) || (!state.data.has_stream)) { return; }
	let keysym = x11_streamer.code_to_keysym[e.code]
	if (keysym !== undefined) {
		x11_streamer.send_key(keysym, true)
		e.preventDefault()
	}
}

// key was released
function screen_onkeyup(e) {
	if ((!state.data.enable_keyboard_input) || (!state.data.has_stream)) { return; }
	let keysym = x11_streamer.code_to_keysym[e.code]
	if (keysym !== undefined) {
		x11_streamer.send_key(keysym)
		e.preventDefault()
	} else {
		console.log("Unknown key:", e)
	}
}

// resize view to current dimensions
let auto_resize_timeout = 500
function screen_onresize() {
	// if still in timeout or have no stream, abort
	if ((!auto_resize_timeout) || (!state.data.has_stream)) { return; }

	// resize the server or view, if requested
	if (state.data.enable_auto_resize_server) {
		state.data.view_width = window.innerWidth
		state.data.view_height = window.innerHeight
		x11_streamer.xrandr_change_resolution(state.data.view_width, state.data.view_height)
		update_stream()
	} else if (state.data.enable_auto_resize_view) {
		state.data.view_width = window.innerWidth
		state.data.view_height = window.innerHeight
		update_stream()
	}

	// limit resize requests per second
	let _auto_resize_timeout = auto_resize_timeout
	auto_resize_timeout = undefined
	setTimeout(function() {
		auto_resize_timeout = _auto_resize_timeout
	}, _auto_resize_timeout)
}

// initialize configuration values from the HTML document and start the
function onload() {
	// load the initial configuration values from the HTML data,
	// by calling all onchange functions for input elements with the data-update attribute.
	console.log("onload")

	// put current size into inputs
	window.setTimeout(function() { update_window_size(); }, 250)

	// register event handlers
	let screen_img_elem = document.getElementById(screen_img_elem_id)
	screen_img_elem.onmousemove = screen_img_elem_onmousemove
	screen_img_elem.onmousedown = screen_img_elem_onmousedown
	screen_img_elem.onmouseup = screen_img_elem_onmouseup
	screen_img_elem.oncontextmenu = screen_img_elem_oncontextmenu
	screen_img_elem.onclick = screen_img_elem_onclick
	screen_img_elem.onwheel = screen_img_elem_onwheel

	document.onkeydown = screen_onkeydown
	document.onkeyup = screen_onkeyup
	window.onresize = screen_onresize

	if (enable_auto_create) {
		btn_create()
	} else if (enable_auto_connect) {
		btn_connect()
	}
}




