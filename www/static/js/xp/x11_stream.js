/* --- SETTINGS --- */

// X11 display grabbing settings
let display = undefined
let display_framerate = undefined
let display_w = undefined
let display_h = undefined
let display_x = undefined
let display_y = undefined

// the value of the $XAUTHORITY environment variable to use
let xauthority = undefined

// Encoding settings
let encode_quality = undefined
let encode_low_delay = undefined

// Input Settings
let enable_keyboard_input = undefined
let enable_mouse_input = undefined
let enable_mouse_capture = undefined

// Auto resize visible portion of the display?
let enable_auto_resize_view = undefined

// Auto resize the X11 server?
let enable_auto_resize_server = undefined

// Auto connect from URL?
let enable_auto_connect = undefined

// command to run on the created server in the X session
let server_command = undefined

// initial width of the created server
let server_create_w = undefined

// initial height of the created server
let server_create_h = undefined

// Auto create server from URL?
let enable_auto_create = undefined

/* --- STATE --- */

// Has the update_stream() function been called?
let is_running = false

// current X11 Server dimensions
let server_w = undefined
let server_h = undefined

// how long to wait between resize requests
let auto_resize_timeout = 500

// screen img element to use
let screen_img_elem_id = undefined

// element to indicate the current width
let width_elem_id = undefined

// element to indicate the current height
let height_elem_id = undefined

// element to hide when stream starts
let hide_elem_id = undefined

/* --- COMMAND ENCODING --- */

function enc_ffmpeg_mpjpeg() {
	let args = []
	args.push(
		"-loglevel", "fatal",
		"-framerate", display_framerate,
		"-video_size", display_w+"x"+display_h,
		"-f", "x11grab",
		"-i", display+"+"+display_x+","+display_y,
		"-c:v", "mjpeg",
	)
	if (encode_quality) {
		args.push("-q:v", encode_quality)
	}
	args.push(
		"-pix_fmt", "yuv420p",
		"-f", "mpjpeg",
		"-strict", "experimental",
		"-avioflags", "direct",
		"-fflags", "nobuffer"
	)
	if (encode_low_delay) {
		args.push("-flags", "low_delay")
	}
	args.push("-")

	console.log("FFmpeg command: ", "ffmpeg "+args.join(" "))

	return encode_command( "ffmpeg", args, "multipart/x-mixed-replace; boundary=--ffmpeg")
}
function enc_mousemove(x, y) {
	return encode_command( "xdotool", [ "mousemove", "--", x, y ], undefined, undefined, [ ["DISPLAY", display] ] )
}
function enc_mousemove_rel(dx, dy) {
	return encode_command( "xdotool", [ "mousemove_relative", "--", dx, dy ], undefined, undefined, [ ["DISPLAY", display] ] )
}
function enc_mousedown(btn) {
	return encode_command( "xdotool", [ "mousedown", btn ], undefined, undefined, [ ["DISPLAY", display] ] )
}
function enc_mouseup(btn) {
	return encode_command( "xdotool", [ "mouseup", btn ], undefined, undefined, [ ["DISPLAY", display] ] )
}
function enc_keyup(keysym) {
	return encode_command( "xdotool", [ "keyup", keysym ], undefined, undefined, [ ["DISPLAY", display] ] )
}
function enc_keydown(keysym) {
	return encode_command( "xdotool", [ "keydown", keysym ], undefined, undefined, [ ["DISPLAY", display] ] )
}
function enc_xvfb_run(random_id, cmd, args) {
	return encode_command(
		"bash",
		[
			"-c",
			"xvfb-run " +
			"-a " +
			"-f \"${XAUTHORITY}\" " +
			"--server-args=\"-screen 0 " + server_create_w + "x" + server_create_h + "x24\" " +
			"bin/xvfb_runner.sh " +
			random_id + " " +
			escapeShellArg(cmd) + " " +
			args.map(escapeShellArg).join(" ") + " "
		]
	)
}


/* --- HELPER FUNCTIONS --- */

// send the X11 keysym
function send_key(keysym, down) {
	if (down) {
		make_xhr("/cgi-bin/command.sh?" + enc_keydown(keysym), "POST")
	} else {
		make_xhr("/cgi-bin/command.sh?" + enc_keyup(keysym), "POST")
	}
}

// get the server dimensions
function get_server_dimensions(cb) {
	let url_args = encode_command( "xwininfo", [ "-root" ], undefined, undefined, [ ["DISPLAY", display] ] )
	make_xhr("/cgi-bin/command.sh?" + url_args, "POST", undefined, undefined, function(url, resp, req) {
		let new_server_w = undefined
		let new_server_h = undefined
		resp.split("\n").forEach(function(e) {
			let kv = e.split(":")
			let key = kv[0].trim()
			if (key=="Width") {
				new_server_w = parseInt(kv[1].trim())
			} else if (key == "Height") {
				new_server_h = parseInt(kv[1].trim())
			}
		})
		if (new_server_w && new_server_h) {
			server_w = new_server_w
			server_h = new_server_h
			if (cb) { cb(); }
		}
	})
}

// send a mouse move event
function send_mouse(x,y, rel, cb) {
	if (rel) {
		make_xhr("/cgi-bin/command.sh?" + enc_mousemove_rel(x, y), "POST", undefined, undefined, cb)
	} else {
		make_xhr("/cgi-bin/command.sh?" + enc_mousemove(x, y), "POST", undefined, undefined, cb)
	}
}

// send a mouse move event
function send_mouse_btn(btn, down) {
	if (down) {
		make_xhr("/cgi-bin/command.sh?" + enc_mousedown(btn), "POST")
	} else {
		make_xhr("/cgi-bin/command.sh?" + enc_mouseup(btn), "POST")
	}
}

// resolving JS key codes to X11 keysyms
function get_code_to_keysym() {
	let code_to_keysym = {
		"Enter": "Return",
		"ShiftLeft": "Shift_L",
		"Backspace": "BackSpace",
		"Tab": "Tab",
		"Delete": "Delete",
		"Space": "space",
		"Period": "period",
		"Comma": "comma",
		"Slash": "slash",
		"ArrowUp": "Up",
		"ArrowDown": "Down",
		"ArrowLeft": "Left",
		"ArrowRight": "Right",
		"AltLeft": "Alt_L",
		"AltRight": "Alt_R",
		"Minus": "minus",
		"Equal": "equal",
		"CapsLock": "Caps_Lock",
		"MetaLeft": "Meta_L",
		"BracketLeft": "bracketleft",
		"BracketRight": "bracketright",
		"Semicolon": "semicolon",
		"Quote": "quotedbl",
		"Backslash": "backslash",
		"End": "End",
		"PageUp": "Page_Up",
		"PageDown": "Page_Down",
		"Home": "Home",
		"Insert": "Insert",
	}
	let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	for (let i=0; i<alphabet.length; i++) {
		let ch = alphabet.charAt(i)
		code_to_keysym["Key"+ch] = ch.toLowerCase()
	}
	for (let i=0; i<10; i++) {
		code_to_keysym["Digit"+i] = i
	}
	return code_to_keysym
}
let code_to_keysym = get_code_to_keysym()

// return the URL for the current settings
function get_stream_url() {
	return "/cgi-bin/command.sh?"+enc_ffmpeg_mpjpeg()
}

// update the URL of the stream screen image element with the current parameters.
// This starts the stream.
function update_stream(cb) {
	get_server_dimensions(function() {
		if ((display_w + display_x) > server_w) { display_w = server_w }
		if ((display_h + display_y) > server_h) { display_h = server_h }

		let screen_img_elem = document.getElementById(screen_img_elem_id)
		screen_img_elem.classList.remove("hidden")
		screen_img_elem.width=display_w
		screen_img_elem.height=display_h
		screen_img_elem.src = get_stream_url()
		is_running = true
		update_hash_location()
		if (cb) { cb(); }
	})
}

// parse parameter from hash part of URL
function parse_hash_location() {
	let hash_loc = location.hash.substr(1)
	let hash_args = hash_loc.split("&").map(function(e) {
		return e.split("=").map(decodeURIComponent)
	})
	for (let i=0; i<hash_args.length; i++) {
		let hash_key = hash_args[i][0]
		let hash_value = hash_args[i][1]
		if (hash_key == "display") { display = hash_value }
		else if (hash_key == "display_framerate") { display_framerate = parseInt(hash_value) }
		else if (hash_key == "display_x") { display_x = parseInt(hash_value) }
		else if (hash_key == "display_y") { display_y = parseInt(hash_value) }
		else if (hash_key == "display_w") { display_w = parseInt(hash_value) }
		else if (hash_key == "display_h") { display_h = parseInt(hash_value) }
		else if (hash_key == "encode_quality") { encode_quality = parseInt(hash_value) }
		else if (hash_key == "encode_low_delay") { encode_low_delay = (hash_value=="true") }
		else if (hash_key == "enable_keyboard_input") { enable_keyboard_input = (hash_value=="true") }
		else if (hash_key == "enable_mouse_input") { enable_mouse_input = (hash_value=="true") }
		else if (hash_key == "enable_mouse_capture") { enable_mouse_capture = (hash_value=="true") }
		else if (hash_key == "enable_auto_connect") { enable_auto_connect = (hash_value=="true") }
		else if (hash_key == "enable_auto_resize_view") { enable_auto_resize_view = (hash_value=="true") }
		else if (hash_key == "server_command") { server_command = hash_value }
		else if (hash_key == "server_create_w") { server_create_w = parseInt(hash_value) }
		else if (hash_key == "server_create_h") { server_create_h = parseInt(hash_value) }
		else if (hash_key == "enable_auto_create") { enable_auto_create = (hash_value=="true") }
	}
}

// update the hash part of the URL
function update_hash_location() {
	location.hash = [
		"display=" + encodeURIComponent(display),
		"display_framerate=" + encodeURIComponent(display_framerate),
		"display_x=" + encodeURIComponent(display_x),
		"display_y=" + encodeURIComponent(display_y),
		"display_w=" + encodeURIComponent(display_w),
		"display_h=" + encodeURIComponent(display_h),
		"encode_quality=" + encodeURIComponent(encode_quality),
		"encode_low_delay=" + encodeURIComponent(encode_low_delay),
		"enable_keyboard_input=" + encodeURIComponent(enable_keyboard_input),
		"enable_mouse_input=" + encodeURIComponent(enable_mouse_input),
		"enable_mouse_capture=" + encodeURIComponent(enable_mouse_capture),
		"enable_auto_connect=" + encodeURIComponent(enable_auto_connect),
		"enable_auto_resize_view=" + encodeURIComponent(enable_auto_resize_view),
		"server_command=" + encodeURIComponent(server_command),
		"server_create_w=" + encodeURIComponent(server_create_w),
		"server_create_h=" + encodeURIComponent(server_create_h),
		"enable_auto_create=" + encodeURIComponent(enable_auto_create)
	].join("&")
	console.log("new hash location: ", location.hash)
}

// set client dimensions to window dimensions in onresize
function update_window_size() {
	console.log("update_window_size")
	if (width_elem_id) {
		let width_elem = document.getElementById(width_elem_id)
		width_elem.value = window.innerWidth
		if (width_elem.onchange) { width_elem.onchange(width_elem) }
	}
	if (height_elem_id) {
		let height_elem = document.getElementById(height_elem_id)
		height_elem.value = window.innerHeight
		if (height_elem.onchange) { height_elem.onchange(height_elem) }
	}
}

// generate a random id of len characters
function generate_random_id(len) {
	return Array.from(window.crypto.getRandomValues(new Uint8Array(Math.floor(len||8) / 2))).map(function(n) {
		return n.toString(16).padStart(2, "0")
	}).join("")
}

// create a new xvfb display and call callback with the new DISPLAY value
function xvfb_create_display(cmd, args, cb) {
	let random_id = generate_random_id()
	let xvfb_run_url = "/cgi-bin/command.sh?" + enc_xvfb_run(random_id, cmd, args)
	console.log("Creating display: ", random_id, xvfb_run_url)

	// start the X11 server(request only finishes when X11 server terminates)
	let xvfb_run_req = make_xhr(xvfb_run_url, "POST", undefined, undefined, function() {
		// X11 server stopped
		console.log("X11 server stopped!")
		window.location = "about:blank#close"
	})

	// wait for X server to start and write it's DISPLAY variable to xsessions/$random_id
	window.setTimeout(function() {
		let get_display_url = "/cgi-bin/command.sh?" + encode_command("cat", [ "xsessions/" + random_id + ".display" ])
		make_xhr(get_display_url, "POST", undefined, undefined, function(url, resp, req) {
			if (resp !== "") {
				console.log("Got display: ", "'"+resp+"'")
				if (cb) { cb(resp); }
			}
		})
	}, 1000)

	// return the handler for the waiting request(can close to stop X11 server)
	return xvfb_run_req
}

// change the server resolution by generating a new modeline, defining a new mode, adding the new mode, and setting the new mode.
function xrandr_change_resolution(new_w, new_h, cb) {
	let mode_line = get_mode_line(new_w, new_h)
	console.log("mode_line", mode_line)
	let xrandr_new_mode_url = "/cgi-bin/command.sh?" + encode_command(
		"bash",
		[
			"-c",
			"xrandr --newmode " + mode_line.slice(1).join(" ") + " && echo ok"
		],
		undefined, undefined, [ [ "DISPLAY", display ] ]
	)
	let xrandr_add_mode_url = "/cgi-bin/command.sh?" + encode_command(
		"bash",
		[
			"-c",
			"xrandr --addmode screen " + mode_line[1] + " && echo ok"
		],
		undefined, undefined, [ [ "DISPLAY", display ] ]
	)
	let xrandr_set_mode_url = "/cgi-bin/command.sh?" + encode_command(
		"bash",
		[
			"-c",
			"xrandr --output screen --mode " + mode_line[1] + " && echo ok"
		],
		undefined, undefined, [ [ "DISPLAY", display ] ]
	)
	make_xhr(xrandr_new_mode_url, "POST", undefined, undefined, function(_, new_resp) {
		console.log("new mode ok:", new_resp)
		make_xhr(xrandr_add_mode_url, "POST", undefined, undefined, function(_, add_resp) {
			console.log("add mode ok:", add_resp)
			make_xhr(xrandr_set_mode_url, "POST", undefined, undefined, function(_, set_resp) {
				console.log("set mode ok:", set_resp)
				if (cb) { cb(); }
			})
		})
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



// onChange handlers for the input elements(update config value)
function change_display(elem) {
	display = elem.value
}
function change_width(elem) {
	display_w = parseInt(elem.value)
}
function change_height(elem) {
	display_h = parseInt(elem.value)
}
function change_offset_x(elem) {
	display_x = parseInt(elem.value)
}
function change_offset_y(elem) {
	display_y = parseInt(elem.value)
}
function change_framerate(elem) {
	display_framerate = parseInt(elem.value)
}
function change_quality(elem) {
	encode_quality = parseInt(elem.value)
}
function change_enable_low_delay(elem) {
	encode_low_delay = elem.checked
}
function change_enable_keyboard(elem) {
	enable_keyboard_input = elem.checked
}
function change_enable_mouse(elem) {
	enable_mouse_input = elem.checked
}
function change_enable_capture_mouse(elem) {
	enable_mouse_capture = elem.checked
}
function change_enable_auto_connect(elem) {
	enable_auto_connect = elem.checked
}
function change_enable_auto_resize_view(elem) {
	enable_auto_resize_view = elem.checked
}
function change_enable_auto_resize_server(elem) {
	enable_auto_resize_server = elem.checked
}
function change_server_command(elem) {
	server_command = elem.value
}
function change_server_create_w(elem) {
	server_create_w = parseInt(elem.value)
	console.log("server_create_w", server_create_w)
}
function change_server_create_h(elem) {
	server_create_h = parseInt(elem.value)
	console.log("server_create_h", server_create_h)
}
function change_enable_auto_create(elem) {
	enable_auto_create = elem.checked
}

// button handler for connecting to an existing display(hide hide_elem_id on completion)
function btn_connect() {
	// start the stream
	update_stream(function() {
		if (hide_elem_id) { document.getElementById(hide_elem_id).classList.add("hidden") }
		screen_onresize()
	})
}

// button handler for creating a new display
function btn_create() {
	// TODO: This is not correct but would need proper unquoting
	let ssv = server_command.split(" ")
	xvfb_create_display(ssv[0], ssv.slice(1), function(new_display) {
		display = new_display
		update_stream(function() {
			if (hide_elem_id) { document.getElementById(hide_elem_id).classList.add("hidden") }
			screen_onresize()
		})
	})
}



/* --- GLOBAL EVENT HANDLERS --- */

// key was pressed
function screen_onkeydown(e) {
	if ((!enable_keyboard_input) || (!is_running)) { return; }
	if (code_to_keysym[e.code] !== undefined) {
		send_key(code_to_keysym[e.code], true)
		e.preventDefault()
	}
}

// key was released
function screen_onkeyup(e) {
	if ((!enable_keyboard_input) || (!is_running)) { return; }
	if (code_to_keysym[e.code] !== undefined) {
		send_key(code_to_keysym[e.code])
		e.preventDefault()
	} else {
		console.log("Unknown key:", e)
	}
}

// resize view to current dimensions
function screen_onresize() {
	// always update the requested width/height values
	update_window_size()
	if ((!auto_resize_timeout) || (!is_running)) { return; }

	// limit resize requests per second
	let orig_auto_resize_timeout = auto_resize_timeout
	setTimeout(function() {
		console.log("resizing")
		update_window_size()
		if (enable_auto_resize_server) {
			xrandr_change_resolution(display_w, display_h, function() {
				update_stream()
			})
		} else if (enable_auto_resize_view) {
			update_stream()
		}
		auto_resize_timeout = orig_auto_resize_timeout
	}, auto_resize_timeout)
	auto_resize_timeout = undefined
}

// initialize configuration values from the HTML document and start the
function onload(_screen_img_elem_id, _width_elem_id, _height_elem_id, _hide_elem_id) {
	screen_img_elem_id = _screen_img_elem_id
	width_elem_id = _width_elem_id
	height_elem_id = _height_elem_id
	hide_elem_id = _hide_elem_id

	// load the initial configuration values from the HTML data,
	// by calling all onchange functions for input elements with the data-update attribute.
	console.log("onload")
	document.querySelectorAll("input[data-update]").forEach(function(elem) {
		if (elem.onchange) { elem.onchange(elem) }
	})

	// load the hash location settings
	parse_hash_location()

	// put current size into inputs
	window.setTimeout(function() { update_window_size(); }, 250)

	// register event handlers
	let screen_img_elem = document.getElementById(screen_img_elem_id)
	screen_img_elem.onmousemove = screen_img_elem_onmousemove
	screen_img_elem.onmousedown = screen_img_elem_onmousedown
	screen_img_elem.onmouseup = screen_img_elem_onmouseup
	screen_img_elem.oncontextmenu = screen_img_elem_oncontextmenu
	screen_img_elem.onclick = screen_img_elem_onclick

	document.onkeydown = screen_onkeydown
	document.onkeyup = screen_onkeyup
	window.onresize = screen_onresize

	if (enable_auto_create) {
		btn_create()
	} else if (enable_auto_connect) {
		btn_connect()
	}
}

function escapeShellArg (arg) {
    return `'${arg.replace(/'/g, `'\\''`)}'`;
}


