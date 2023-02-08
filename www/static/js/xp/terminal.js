// the currently active tmux session name
let session_name = undefined

// list of windows
let windows = undefined

// id of current window
let current_window = undefined

// event-source for terminal updates
let event_source = undefined



/* --- UTILLITY FUNCTIONS --- */

// get a random integer between 0 and (max-1), inclusive.
function getRandomInt(max) {
	return Math.floor(Math.random()*Math.floor(max));
}

// this causes the window to close
function close_self() {
	window.location = "about:blank#close"
}



/* --- TMUX COMMANDS --- */

// run a tmux command in control mode and capture it's output
function run_tmux_command(command_args, cb, err_cb) {
	let req_body = []
	for (let command_arg of command_args) {
		if (command_arg !== "") {
			req_body.push("arg="+encodeURIComponent(command_arg))
		}
	}
	req_body = req_body.join("&")

	return make_xhr(
		"/cgi-bin/tmux/run_command.sh",
		"POST",
		"application/x-www-form-urlencoded",
		req_body,
		function(url, resp) {
			let cur_lines = undefined
			let cur_meta = undefined
			let contents = []
			let contents_meta = []
			let errors = []
			let errors_meta = []
			let other_lines = []

			let lines = resp.trim().split("\n")
			for (let line of lines) {
				if (line.startsWith("%begin ")) {
					cur_lines = []
					cur_meta = line
				} else if (line.startsWith("%end ")) {
					contents.push(cur_lines.join("\n"))
					contents_meta.push(cur_meta)
					cur_lines = undefined
					cur_meta = undefined
				} else if (line.startsWith("%error ")) {
					errors.push(cur_lines.join("\n"))
					errors_meta.push(cur_meta)
					cur_lines = undefined
					cur_meta = undefined
				} else if (cur_meta) {
					cur_lines.push(line)
				} else {
					other_lines.push(line)
				}
			}

			if (err_cb && (errors_meta.length>0)) {
				//console.log("run_tmux_command err:", errors)
				err_cb(errors, errors_meta, other_lines)
			} else if (cb) {
				//console.log("run_tmux_command cb:", command_args, "-", contents)
				cb(contents, contents_meta, other_lines)
			}
		}
	)
}

// listen for control_mode events, and dispatch callbacks
function control_mode_events_dispatcher(on_event, on_reply, on_error) {
	console.log("Listening for control mode events from: ", session_name)

	let tmux_control_mode = new EventSource("/cgi-bin/tmux/control_mode.sh?session_name="+encodeURIComponent(session_name));

	let reply_body = undefined
	let reply_meta = undefined
	tmux_control_mode.onmessage = function(e) {
		let line = e.data
		if (line.startsWith("%begin ")) {
			reply_meta = line.substr(7)
			reply_body = []
		} else if (line.startsWith("%end ")) {
			if (on_reply) {
				on_reply(reply_meta, reply_body)
			}
			reply_meta = undefined
			reply_body = undefined
		} else if (line.startsWith("%error ")) {
			reply_meta = undefined
			reply_body = undefined
		} else if (reply_meta){
			reply_body.push(line)
		} else {
			if (on_event) {
				on_event(line)
			}
		}
	}

	tmux_control_mode.onerror = function() {
		if (on_error) {
			on_error()
		}
		tmux_control_mode.close()
	}

	return tmux_control_mode
}

// create a new tmux session
//tmux new-session -d -s "${new_session_name}" "${command_str}"
function cmd_new_session(new_session_name, shell_str, cb, err_cb) {
	run_tmux_command([
		"new-session",
		"-d",
		"-s",
		new_session_name,
		shell_str
	], cb, err_cb)
}

// kill the current tmux session
function cmd_kill_session(cb, err_cb) {
	run_tmux_command([
		"kill-session",
		"-t",
		session_name
	], cb, err_cb)
}

// kill the current tmux window
function cmd_kill_window(cb, err_cb) {
	let target_window = session_name+":"+current_window.window_id
	run_tmux_command([
		"kill-window",
		"-t",
		target_window
	], cb, err_cb)
}

// resize the current window to the specified dimensions
function cmd_resize_window(w, h, cb, err_cb) {
	let target_window = session_name+":"+current_window.window_id
	run_tmux_command([
		"resize-window",
		"-t",
		target_window,
		"-x",
		w,
		"-y",
		h
	], cb, err_cb)
}

// send keys to the current pane
function cmd_send_key(keys_str, literal, cb, err_cb) {
	let target_pane = session_name+":"+current_window.window_id+".0"
	run_tmux_command([
		"send-keys",
		(literal ? "-l" : ""),
		"-t",
		target_pane,
		keys_str
	], cb, err_cb)
}

// get the screen content of the current pane
function cmd_capture_pane(cb, err_cb) {
	let target_pane = session_name+":"+current_window.window_id+".0"
	run_tmux_command([
		"capture-pane",
		"-p",
		"-e",
		"-N",
		"-t",
		target_pane
	], cb, err_cb)
}

// list all windows in the current session
function cmd_list_windows(cb, err_cb) {
	run_tmux_command([
		"list-windows",
		"-t",
		session_name,
		"-F",
		"{ \"window_name\": \"#{q:window_name}\", \"window_id\": \"#{window_id}\", \"pane_id\": \"#{pane_id}\", \"cursor_x\":#{q:cursor_x},\"cursor_y\":#{q:cursor_y},\"window_width\":#{q:window_width},\"window_height\":#{q:window_height} }"
	], cb, err_cb)
}

// create a new pane by splitting the window
function cmd_new_window(cb, err_cb) {
	run_tmux_command([
		"new-window",
		"-t",
		session_name,
		"-P",
		"-F",
		"#{q:window_id}"
	], cb, err_cb)
}



/* --- TERMINAL EMULATOR FUNCTIONS --- */

// from https://github.com/chalk/ansi-regex/blob/main/index.js
const escape_sequence_regexp = new RegExp(
	'([\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~])))'
	, "g"
)

// parse a string into lines, then text sequences with parameters
function parse_escape_sequences(str) {
	// first split the content into lines(escape sequences should not contain newlines)
	let lines = str.split("\n")

	// each line get a list of segments
	let lines_segments = []

	// current parser state
	var fg = undefined
	var bg = undefined
	var is_bold = undefined
	var is_reverse = undefined
	var is_underline = undefined

	// iterate over every line to create a list of segments for each line
	for (let i=0; i<lines.length; i++) {
		let current_line = lines[i]

		// list of segments in current line
		let current_segment = []

		// add sgr reset at beginning, so at least one escape sequence is always present
		if (!current_line.match(escape_sequence_regexp)) {
			// line without any escape sequences
			current_segment.push({
				text: current_line,
				fg: fg,
				bg: bg,
				is_bold: is_bold,
				is_reverse: is_reverse,
				is_underline: is_underline
			})
			lines_segments.push(current_segment)
			continue
		}

		// split the text by the escape sequence regex
		for (let segment of current_line.split(escape_sequence_regexp)) {
			// if segment is an escape sequence, update parser state
			if (segment.match(escape_sequence_regexp)) {
				// foreground color \e[30m - \e[37m, \e[90m - \e[97m
				let has_match = false
				let fg_match = segment.match("\\033\\[(3[0-7])m")
				if (fg_match) { fg = fg_match[1]; has_match=true; }
				fg_match = segment.match("\\033\\[(9[0-7])m")
				if (fg_match) { fg = fg_match[1]; has_match=true; }

				// background color \e[40m - \e[47m, \e[100m - \e[107m
				let bg_match = segment.match("\\033\\[(4[0-7])m")
				if (bg_match) { bg = bg_match[1]; has_match=true; }
				bg_match = segment.match("\\033\\[(10[0-7])m")
				if (bg_match) { bg = bg_match[1]; has_match=true; }

				// iterate semicolon-separated SGR codes
				let sgr_codes = segment.match("\\033\\[(.*)m")[1].split(";")
				for (let sgr_code of sgr_codes) {
					if (sgr_code=="0") {
						// reset SGR parameters
						fg = undefined
						bg = undefined
						is_bold = undefined
						is_reverse = undefined
						is_underline = undefined
						has_match = true
					} else if (sgr_code=="39") {
						// reset fg to default
						fg = undefined
						has_match = true
					} else if (sgr_code == "49") {
						// reset bg to default
						bg = undefined
						has_match = true
					} else if (sgr_code == "1") {
						// set bold
						is_bold = true
						has_match = true
					} else if (sgr_code == "4") {
						// set underline
						is_underline = true
						has_match = true
					} else if (sgr_code == "7") {
						// set reverse
						is_reverse = true
						has_match = true
					}
				}

				if (!has_match) {
					console.log("Unknown escape sequence: ", segment)
				}
			} else {
				// is a text segment, push to segments list with current parameters
				current_segment.push({
					text: segment,
					fg: fg,
					bg: bg,
					is_bold: is_bold,
					is_reverse: is_reverse,
					is_underline: is_underline
				})
			}
		}

		lines_segments.push(current_segment)
	}

	return lines_segments
}

// create a <pre> element from a list of segments
function render_segments(lines_segments) {
	let pre_elem = document.createElement("pre")
	pre_elem.classList = "terminal-content"
	// iterate over every line
	for (let i=0; i<lines_segments.length; i++) {
		let segments = lines_segments[i]

		// create a span for the entire line content
		let row_elem = document.createElement("span")
		row_elem.classList = "terminal-row"

		// iterate over every segment in line
		for (let j=0; j<segments.length; j++) {
			let segment = segments[j]

			// create a span for every segment
			let span_elem = document.createElement("span")
			span_elem.innerText = segment.text
			if (segment.is_reverse) {
				if (segment.bg) {
					let new_fg = parseInt(segment.bg) - 10
					span_elem.classList.add("term-fg-"+new_fg)
				}
				if (segment.fg) {
					let new_bg = parseInt(segment.fg) + 10
					span_elem.classList.add("term-bg-"+new_bg)
				}
				span_elem.classList.add("term-reverse")
			} else {
				segment.fg ? span_elem.classList.add("term-fg-"+segment.fg) : false
				segment.bg ? span_elem.classList.add("term-bg-"+segment.bg) : false
			}
			segment.is_bold ? span_elem.classList.add("term-bold") : false
			segment.is_underline ? span_elem.classList.add("term-underline") : false
			row_elem.appendChild(span_elem)
		}

		row_elem.appendChild(document.createElement("br"))
		pre_elem.appendChild(row_elem)
	}

	return pre_elem
}

// handle a single event for the terminal
function handle_terminal_key_event(e) {
	if (!session_name) { return; }
	if (ignore_keypress) { return; }
	let key = e.key
	let has_match = false

	// TODO: special handling required: "^" "`" ";"
	let single_char_keys = [
		"*",
		"*",
		"\"",
		"\\",
		"'",
		"=",
		"?",
		"~",
		"!",
		"+",
		"$",
		"%",
		"&",
		"/",
		"(",
		")",
		"{",
		"}",
		"[",
		"]",
		",",
		"<",
		">",
		"|",
		".",
		":",
		"_",
		"-",
		"#"
	]

	if (key=="Enter") {
		cmd_send_key("Enter", false)
		has_match = true
	} else if (key=="Backspace") {
		cmd_send_key("BSpace", false)
		has_match = true
	} else if (key=="Tab") {
		cmd_send_key("Tab", false)
		has_match = true
	} else if (key=="Delete") {
		cmd_send_key("DC", false)
		has_match = true
	} else if (key=="ArrowUp") {
		cmd_send_key("Up", false)
		has_match = true
	} else if (key=="ArrowDown") {
		cmd_send_key("Down", false)
		has_match = true
	} else if (key=="ArrowLeft") {
		cmd_send_key("Left", false)
		has_match = true
	} else if (key=="ArrowRight") {
		cmd_send_key("Right", false)
		has_match = true
	} else if (key.length==1) {
		if (e.ctrlKey && key.match(/[a-zA-Z]/)) {
			cmd_send_key("C-" + key, false)
			has_match = true
		} else if (key.match(/[a-zA-Z0-9]/)){
			cmd_send_key(key, true)
			has_match = true
		} else if (single_char_keys.includes(key)) {
			cmd_send_key(key, true)
			has_match = true
		} else if (key == ";") {
			cmd_send_key("\\;", true)
		}
	}

	if (has_match) {
		e.preventDefault()
	} else {
		console.log("Unknown key:", e)
	}
}



/* --- WINDOW MANAGEMENT --- */

// set current window by id
function set_window(new_window_id) {
	for (let window of windows) {
		if (window.window_id == new_window_id) {
			console.log("set_window", new_window_id)
			current_window = window
			update_hash()
			update_terminal_content()
			return true
		}
	}
}

// update the windows array and current_window
function update_windows(cb) {
	cmd_list_windows(function(resp) {
		// prepare a new array of windows, to eventually replace the global windows array
		let new_windows = []

		// unset the current window(points to possibly non-exisiting window)
		let previous_window = current_window
		current_window = undefined

		// get newline-separated JSON window stanzas generated by tmux
		if (resp[0]) {
			let windows_jsons = resp[0].split("\n")
			for (let window_json of windows_jsons) {
				// append decoded JSON to new_windows array
				let window_obj = JSON.parse(window_json)
				new_windows.push(window_obj)

				// the previously current window still exists
				if ((previous_window) && (window_obj.window_id == previous_window.window_id)) {
					// re-set current_window
					current_window = window_obj
				}
			}
		}
		windows = new_windows

		// no current_window, default to first window
		if ((!current_window) && (windows[0])) {
			set_window(windows[0].window_id)
		}

		// run callback
		if (cb) { cb() }

		// update the menu entries
		update_windows_menu()
	})
}

// create a new window and switch to it
function make_new_window(cb) {
	cmd_new_window(function(resp) {
		update_windows(function() {
			set_window(resp)
		})
	})
}



/* --- SESSION MANAGEMENT --- */

// create a new tmux session, on success set current session
function connect_new_session(command_str, cb) {
	let new_session_name = "web-" + getRandomInt(9999999)
	command_str = command_str || "bash"
	cmd_new_session(new_session_name, command_str, function(resp) {
		connect_session(new_session_name, cb)
	})
}

// start using the session
function connect_session(new_session_name, cb) {
	session_name = new_session_name
	update_windows(function() {
		if (windows.length == 0) { close_self(); }

		// initial update of elements
		update_windows_menu()
		update_terminal_content()

		// register event handlers for session for update notifications
		event_source = control_mode_events_dispatcher(function(event_line) {
			if (event_line.startsWith("%output ")) {
				let output_pane_id = event_line.match(/^%output (%[0-9]+)/)[1]
				if (current_window && (output_pane_id == current_window.pane_id)) {
					update_windows(function() {
						update_terminal_content()
					})
				}
			} else if (event_line.startsWith("%window-add")) {
				update_windows()
			} else if (event_line.startsWith("%unlinked-window-close")) {
				update_windows()
				if (windows.length == 0) { close_self(); }
			} else if (event_line.startsWith("%session-changed")) {
				update_windows()
				if (windows.length == 0) { close_self(); }
			} else if (event_line.startsWith("%exit")) {
				console.log("tmux exit event received", event_line)
				close_self()
			} else {
				console.log("Unknown event:", event_line)
			}
		})

		if (cb) { cb(); }
	})
}

// called to run the instruction in the hash part of the URL(part after the #)
function session_from_hash() {
	let hash_str = window.location.hash.substr(1)

	// get session arguments
	let session_args = hash_str.split(":")
	session_args = session_args.map(decodeURIComponent)

	if (hash_str=="") {
		// create a new default session
		console.log("Creating and connecting to a default session")
		connect_new_session()
	} else if (session_args[0] == "new-session") {
		// create a new session with custom command
		let custom_command_str = session_args[1]
		console.log("Creating and connecting to a session with command: ", custom_command_str)
		connect_new_session(custom_command_str)
	} else if (session_args[0] && session_args[1]) {
		// connect to existing named session and window
		let existing_session_name = session_args[0]
		let existing_window_id = session_args[1]
		console.log("Connecting to existing session and window: ", existing_session_name, existing_window_id)
		connect_session(existing_session_name, function() {
			set_window(existing_window_id)
		})
	} else if (session_args[0]) {
		// connect to existing named session
		let existing_session_name = session_args[0]
		console.log("Connecting to existing session: ", existing_session_name)
		connect_session(existing_session_name)
	}
}



/* --- UI FUNCTIONS --- */

// update the URL hash-part
function update_hash() {
	window.location.hash = encodeURIComponent(session_name) + ":" + encodeURIComponent(current_window.window_id)
}

// update all DOM elements associated with the windows object
function update_windows_menu() {
	let windows_menu = document.getElementById("windows_list")
	windows_menu.innerHTML = ""
	if (!windows) { return; }
	for (let window of windows) {
		let menu_entry = document.createElement("a")
		menu_entry.classList = "menu-item"
		menu_entry.textContent = window.window_id
		menu_entry.onclick = function() {
			set_window(window.window_id)
		}
		windows_menu.appendChild(menu_entry)
	}
}

// capture tmux screen content, and update the terminal-content
function update_terminal_content() {
	let term_elem = document.getElementById("terminal-content")
	cmd_capture_pane(function(screen_content) {
		// turn string into lines of segments with parameters
		let lines_segments = parse_escape_sequences(screen_content[0])
		// render list of lines into a <pre> element
		let new_term_elem = render_segments(lines_segments)

		// replace old element
		new_term_elem.id = term_elem.id
		term_elem.replaceWith(new_term_elem)

		// update cursor indent element
		let cursor_x = current_window.cursor_x
		let cursor_y = current_window.cursor_y
		let cursor_indent_elem = document.getElementById("cursor-indent")
		cursor_indent_elem.innerText = ("\n").repeat(cursor_y) + (" ").repeat(cursor_x)
	})
}



/* --- DIALOG SHOW/CLOSE BUTTON HANDLERS --- */

on_show_popup_cb = function() {
	ignore_keypress = true
}
on_close_popup_cb = function() {
	ignore_keypress = false
}



/* --- BUTTON HANDLERS --- */

function btn_new_window() {
	make_new_window()
}

function btn_resize() {
	let rows = document.getElementById("rows").value
	let cols = document.getElementById("cols").value
	cmd_resize_window(cols, rows)
	close_popup()
}

function btn_resize_window() {
	let terminal_content_elem = document.querySelector(".terminal-content")
	let term_cursor_elem = document.getElementById("term-cursor")
	let cur_size = term_cursor_elem.getBoundingClientRect()
	let cols = Math.floor((terminal_content_elem.offsetWidth)/ cur_size.width)
	let rows = Math.floor((terminal_content_elem.offsetHeight) / cur_size.height)
	console.log("Calculated new dimensions in characters: ", cols, rows)
	cmd_resize_window(cols, rows)
	close_popup()
}

function btn_kill_session() {
	cmd_kill_session(close_self)
}

function btn_kill_window() {
	cmd_kill_window(function() {
		update_windows()
		if (windows.length == 0) { close_self(); }
	})
}

function btn_input() {
	let input_value = document.getElementById("input").value
	cmd_send_key(input_value)
	btn_close_input()
}



/* Checkbox handlers */

let auto_resize_enable = false
function checkbox_auto_resize() {
	auto_resize_enable = window.event.currentTarget.checked
}



/* --- GLOBAL EVENT HANDLERS --- */

function window_on_resize() {
	if (!checkbox_auto_resize) {
		btn_resize_window()
		window.onresize = undefined
		console.log("Window resizing...")
		window.setTimeout(function() {
			btn_resize_window()
			window.onresize = window_on_resize
			console.log("Window resized!")
		}, 1000)
	}
}
window.onresize = window_on_resize

// handle key press
let ignore_keypress = false
document.onkeydown = function(e) {
	if (!ignore_keypress) {
		return handle_terminal_key_event(e)
	}
}



/* --- INITIALIZATION --- */

session_from_hash()
