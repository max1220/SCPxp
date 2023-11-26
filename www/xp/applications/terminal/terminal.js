"use strict";

let state_obj = {}
let state = new AppState(state_obj)
state.add_key_parameters("session_id", "text", true, true);
state.add_key_parameters("window_id", "text", true, true);
state.add_key_parameters("pane_id", "text", true, true);
state.add_key_parameters("create_session_and_connect", "text", true, true);


let cgi_commands = new CgiCommands(CGI_BACKEND)
let term = new Terminal(cgi_commands)
let message_box = new MessageBox()


function target_session() {
	return state.data.session_id
}
function target_window() {
	return state.data.session_id + ":" + state.data.window_id
}
function target_pane() {
	return state.data.session_id + ":" + state.data.window_id + "." + state.data.pane_id
}

// get the dimensions of a single character in the
let _char_size = undefined
function get_char_size() {
	if (_char_size==undefined) {
		_char_size = document.getElementById("terminal-cursor").getBoundingClientRect()
	}
	return _char_size
}

// resize the terminal content to fit the available space
function resize_terminal_to_window() {
	let window_content_elem = document.getElementById("window-content")
	let content_rect = window_content_elem.getBoundingClientRect()
	let content_w = content_rect.width - 2
	let content_h = content_rect.height - 24
	let char_size = get_char_size()
	let new_w = Math.floor(content_w / char_size.width)
	let new_h = Math.floor(content_h / char_size.height)
	term.resize_window(target_window(), new_w, new_h)
}

// resize the window to the current terminal content
function resize_window_to_terminal() {
	let char_size = get_char_size()
	let pane_info = term.info(target_pane())
	if (pane_info.session_id=="") { return; }
	if (pane_info.session_id===undefined) { return; }
	let required_width = char_size.width * pane_info.pane_width
	let required_height = char_size.height * pane_info.pane_height
	console.log("required_width", required_width)
	win.width = required_width + 2
	win.height = required_height + 24
	win.update()
}

// get the terminal content and update
function update_terminal_content(term_data) {
	let term_content_elem = document.getElementById("terminal-content")

	// remove old terminal content
	let old_elems = term_content_elem.querySelectorAll(".terminal-row")
	for (let i=0; i<old_elems.length; i++) {
		let elem = old_elems[i]
		elem.remove()
	}

	// render the current terminal state
	term.render_segments(term_content_elem, term.parse_escape_sequences(term_data))
}

// update the size of the terminal element to fit it's content(tmux pane width)
function update_terminal_size(info) {
	let char_size = get_char_size()
	let term_elem = document.getElementById("terminal-content")
	term_elem.style.width = char_size.width*info.pane_width+"px"
	term_elem.style.height = char_size.height*info.pane_height+"px"
}

// update the position and visibillity of the cursor
function update_cursor_position(info) {
	let cursor = document.getElementById("terminal-cursor")
	let char_size = get_char_size()
	cursor.style.left = info.cursor_x*char_size.width + "px"
	cursor.style.top = info.cursor_y*char_size.height + "px"
	if ((info.cursor_flag==0) || (info.cursor_x>=info.pane_width) || (info.cursor_y>=info.pane_height)) {
		cursor.classList.add("hidden")
	} else {
		cursor.classList.remove("hidden")
	}
}


let request_sent = false
let request_again = false

// perform a full refresh of the terminal content by capturing the entire pane using tmux
function full_refresh() {
	term.capture_with_info(target_pane(), function(data, info) {
		//console.log("Got terminal capture:", info, data.length)
		update_terminal_size(info)
		update_cursor_position(info)
		request_sent = false;
		update_terminal_content(data);
		if (request_again) {
			request_again = false;
			request_full_refresh();
		}
	})
}
// request a full refresh. Requesting again during an outstanding request
// will at most cause one more refresh after the outstanding request is handled.
function request_full_refresh() {
	if (state.data.session_id=="") { return; }

	if (request_sent && request_again) {
		//console.log("Still awaiting request and already requesting again")
		return;
	}
	if (request_sent) {
		//console.log("Still awaiting request, requesting again after")
		request_again = true;
		return;
	}
	//console.log("Sending request")
	request_sent = true
	full_refresh();
}

// perform a partial update. new_data is the output that the terminal produced.
function perform_partial_update(new_data) {
	// TODO: perform a partial update when all escape sequences in new_data are known
	request_full_refresh()
}

// create a handler for lines from tmux control mode streamed via EventSource
let ev_dispatcher = term.control_mode_events_dispatcher()
ev_dispatcher.callbacks.on_output = function(line, event_name, args) {
	console.log("on_output")
	perform_partial_update(line)
}
ev_dispatcher.callbacks.on_exit = function(line, event_name, args) {
	console.log("on_exit")
	reconnect()
}
ev_dispatcher.callbacks.on_event = function(line, event_name, args) {
	console.log("other event",event_name)
}
ev_dispatcher.callbacks.on_reply = function(meta, body) {
	console.log("reply", meta, body)
}

// handle tmux process stdout
let tmux_stdout_cb = function(line) {
	ev_dispatcher.handle_line(line)
}
// handle tmux process return value
let tmux_ret_cb = function(code) {
	connect_session_event_listener()
}

// start tmux in control mode attached to the session to listen for events.
let ev_stream = undefined
function connect_session_event_listener() {
	// TODO HACK: sleep 60 | tmux, since tmux can't deal with having no stdin
	// TODO HACK: -d/-x don't work *sometimes*, so pkill manually(DANGEROUS!).
	let tmux_cmd = "tmux -C attach-session -t " + cgi_commands.escape_shell_arg(target_session())
	cgi_commands.run_command_sync([
		"pkill",
		"-xf",
		"tmux -C attach-session -t \\$" + target_session().substr(1)
	])
	let command = [
		"eval",
		"sleep 60 | " + tmux_cmd,
	]
	if (ev_stream) {
		ev_stream.close()
		ev_stream = undefined
	}
	ev_stream = cgi_commands.run_command_event_stream(tmux_stdout_cb, tmux_ret_cb, undefined, false, command, undefined, false)
}

// handle a single keydown event
function on_key(key_ev) {
	if (state.data.session_id=="") { return; }

	let tmux_key = term.key_event_to_tmux(key_ev)
	if (tmux_key) {
		console.log("Sending key:",tmux_key)
		term.send_keys(target_pane(), tmux_key[0], tmux_key[1])
		event.preventDefault()
	} else {
		console.log("Unknown key pressed:", key_ev.key)
	}
}

// unset session and display "No session!" screen
function no_session() {
	console.log("No session!")
	let term_content_elem = document.getElementById("terminal-content")
	update_terminal_content("\x1b[31mNo session!")
	term_content_elem.style.width = ""
	term_content_elem.style.height = ""

	let cursor = document.getElementById("terminal-cursor")
	cursor.style.left = 0
	cursor.style.top = 0

	location.hash = ""
	update_sessions_list()
}

// call after changing session_id/window_id/pane_id to reconnect
function reconnect() {
	let info = term.info(target_pane())
	if (info.session_id=="") { return no_session(); }
	if (info.session_id===undefined) { return no_session(); }
	console.log("info", info)

	request_sent = false
	request_again = false

	state.data.session_id = info.session_id
	state.data.window_id = info.window_id
	state.data.pane_id = info.pane_id

	console.log("target_session", target_session())
	console.log("target_window", target_window())
	console.log("target_pane", target_pane())

	// connect session
	request_full_refresh()
	connect_session_event_listener()
	update_sessions_list()
	update_panes_list()
	update_terminal_size(info)

	document.getElementById("terminal-content").focus()
}

// update the list of sessions in the "File" menu
function update_sessions_list() {
	let sessions_list_elem = document.getElementById("sessions_list")
	sessions_list_elem.innerHTML = ""
	let sessions_list = term.list_sessions()
	if (sessions_list.length == 0) {
		sessions_list_elem.innerHTML = '<div class="menu-item">No sessions!</div>'
		return;
	}
	for (let i=0; i<sessions_list.length; i++) {
		let session = sessions_list[i]
		let session_item = document.createElement("a")
		session_item.classList.add("menu-item")
		session_item.innerText = session.session_id + ": " + session.session_name
		//let href = "#session_id=" + encodeURIComponent(session.session_id) + "&window_id=" + encodeURIComponent(session.window_id) + "&pane_id=" + encodeURIComponent(session.pane_id)
		//session_item.href = href
		session_item.onclick = function() {
			state.data.session_id = session.session_id
			state.data.window_id = session.window_id
			state.data.pane_id = session.pane_id
			reconnect()
		}
		sessions_list_elem.appendChild(session_item)
	}
}

// update the list of panes in the "Panes" menu
function update_panes_list() {
	let panes_list_elem = document.getElementById("panes_list")
	panes_list_elem.innerHTML = ""
	let panes_list = term.list_panes(target_session())
	if (panes_list.length == 0) {
		panes_list_elem.innerHTML = '<div class="menu-item">No panes!</div>'
		return;
	}
	for (let i=0; i<panes_list.length; i++) {
		let pane = panes_list[i]
		let pane_item = document.createElement("a")
		pane_item.classList.add("menu-item")
		pane_item.innerText = pane.pane_id + ": " +pane.pane_title
		pane_item.onclick = function() {
			state.data.window_id = pane.window_id
			state.data.pane_id = pane.pane_id
			reconnect()
		}
		panes_list_elem.appendChild(pane_item)
	}
}

// create a session with a random name and connect to it
function create_session_and_connect(cmd) {
	let session_name = "xp-"+Math.floor(10000+Math.random()*89999)
	let new_session = term.new_session(session_name, cmd)
	if (new_session.session_id == undefined) { return no_session(); }
	state.data.session_id = new_session.session_id
	state.data.window_id = new_session.window_id
	state.data.pane_id = new_session.pane_id
	reconnect()
}

// send a key from the "Send" menu
function menu_send_key(key_name) {
	term.send_keys(target_pane(), key_name)
}

// create a new session and switch to it
function menu_new_session() {
	create_session_and_connect("bash")
}

// create a new window and switch to it
function menu_new_window() {
	let new_window = term.new_window(target_session(), "bash")
	state.data.window_id = new_window.window_id
	state.data.pane_id = new_window.pane_id
	reconnect()
}

// kill the current pane and switch to the next pane
function menu_kill_pane() {
	cgi_commands.run_command_sync([
		"tmux",
		"kill-pane",
		"-t",
		target_pane()
	])
	reconnect()
}

function menu_kill_session() {
	term.kill_session(target_session())
	reconnect()
}

function menu_resize_to_80x24() {
	term.resize_window(target_window(), 80, 24)
}

function menu_resize_to_custom() {
	win.dialog_show("/xp/applications/terminal/resize.html", function(ret) {
		if (ret) {
			console.log("Custom dimensions:", ret)
			term.resize_window(target_window(), ret[0], ret[1])
		}
	})
}

// show the send-text dialog activated from the "Send" menu
function menu_send_text() {
	message_box.show_message_box_input({
		win_icon: "application-terminal",
		win_size: "300x200",
		win_title: "Send text",
		main_text: "Enter text to send to the terminal pane verbatim:",
		blocktext: "",
		greyout: true,
	}, function(ret) {
		if (ret[0]=="confirm") {
			console.log("got input:", ret[1])
			term.send_keys(target_pane(), ret[1], true)
		}
	})
}

function menu_info() {
	let info = term.info(target_pane())
	let info_segs = []
	for (let parm in info) {
		info_segs.push(parm + ":\t" + info[parm])
	}
	let info_text = info_segs.join("\n")
	message_box.show_message_box_info({
		win_icon: "application-terminal",
		win_size: "350x400",
		win_title: "Session info",
		main_text: "Details about the current terminal session:",
		blocktext: info_text,
		greyout: true,
	})
}

function menu_about() {
	message_box.show_message_box_info({
		win_icon: "application-terminal",
		win_size: "300x250",
		win_title: "About Terminal",
		title_text: "About Terminal Emulator",
		title_icon: "application-terminal",
		main_html: `
		Just a simple terminal emulator.
		<ul>
			<li>generic CGI backend written in Bash</li>
			<li>front-end written in vanilla javascript</li>
			<li>uses tmux for sessions, rendering</li>
		</ul>
		`,
		okay_button: "Close",
		greyout: false,
	})
}

// called by the WM when the window is loaded
function win_load() {
	win.title = "Terminal"
	win.icon = "application-terminal"
	win.resize(685, 485)
	win.resizeable = true
	win.update()
}

// called when the page is read(body onload)
function body_onload() {
	// load the initial configuration values from the HTML data,
	// by calling all onchange functions for input elements with the data-update attribute.
	console.log("Loading state...")
	state.load()
	console.log("Loaded state:", state.data)
	if (state.data.create_session_and_connect) {
		let cmd = state.data.create_session_and_connect
		state.data.create_session_and_connect = undefined
		create_session_and_connect(state.data.create_session_and_connect)
	}

	// connect the keydown event handler
	let term_content_elem = document.getElementById("terminal-content")
	term_content_elem.onkeydown = on_key

	// connect to session
	reconnect()
}
