let session_name = undefined
let pane_name = undefined

// create a new tmux session
function create_session(command_str, cb) {
	console.log("Starting session...", command_str)
	const req_body = "command_str=" + encodeURIComponent(command_str)
	make_xhr(
		"/cgi-bin/tmux/create_session.sh",
		"POST",
		"application/x-www-form-urlencoded",
		req_body,
		function(url, resp) {
			console.log("Started session!")
			if (!cb) { return; }
			let decoded_obj = JSON.parse(resp)
			if (decoded_obj && decoded_obj.success) {
				cb(decoded_obj)
			}
		}
	)
}

// kill an existing tmux session
function kill_session(cb) {
	console.log("Killing session...", session_name)
	const req_body = "session_name=" + encodeURIComponent(session_name)
	make_xhr(
		"/cgi-bin/tmux/kill_session.sh",
		"POST",
		"application/x-www-form-urlencoded",
		req_body,
		function(url, resp) {
			console.log("Killed session!")
			if (!cb) { return; }
			let decoded_obj = JSON.parse(resp)
			if (decoded_obj && decoded_obj.success) {
				cb(decoded_obj)
			}
		}
	)
}

// send a key to tmux. See tmux manpage for possible keys
function send_key(keys_str, cb) {
	//console.log("Sending key...", session_name, keys_str)
	const req_body =
		"session_name=" + encodeURIComponent(session_name) +
		"&keys_str=" + encodeURIComponent(keys_str)
	make_xhr(
		"/cgi-bin/tmux/send_keys.sh",
		"POST",
		"application/x-www-form-urlencoded",
		req_body,
		function(url, resp) {
			//console.log("Sent key!")
			if (!cb) { return; }
			let decoded_obj = JSON.parse(resp)
			if (decoded_obj && decoded_obj.success) {
				cb(decoded_obj)
			}
		}
	)
}

// get the current screen content
function get_screen(cb) {
	//console.log("Getting screen...", session_name)
	const resp_body =
		"target_name=" + encodeURIComponent(session_name) +
		"&escape=true"
	if (pane_name) {
		resp_body =
			"target_name=" + encodeURIComponent(session_name + ":0." + pane_name) +
			"&escape=true"
	}


	make_xhr(
		"/cgi-bin/tmux/get_screen.sh",
		"POST",
		"application/x-www-form-urlencoded",
		resp_body,
		function(url, resp) {
			//console.log("Got screen!", resp.length)
			if (!cb) { return; }
			cb(resp)
		}
	)
}

// get a list of panes from the server, based on a session_name
function get_panes(cb) {
	console.log("Getting list of panes...")
	const resp_body =
		"session_name=" + encodeURIComponent(session_name)

	make_xhr(
		"/cgi-bin/tmux/list_panes.sh",
		"POST",
		"application/x-www-form-urlencoded",
		resp_body,
		function(url, resp) {
			console.log("Got list of panes!", resp.length)
			let decoded_obj = JSON.parse(resp)
			if (decoded_obj && decoded_obj.success) {
				cb(decoded_obj)
			}
		}
	)
}

// from https://github.com/chalk/ansi-regex/blob/main/index.js
const escape_sequence_regexp = new RegExp(
	'([\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~])))'
	, "g"
)

// parse a string into segments with parameters
function parse_escape_sequences(str) {
	let segments = []

	// current parser state
	var fg = undefined
	var bg = undefined
	var is_bold = undefined
	var is_reverse = undefined
	var is_underline = undefined

	// split the text by the escape sequence regex
	for (let segment of str.split(escape_sequence_regexp)) {
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
			segments.push({
				text: segment,
				fg: fg,
				bg: bg,
				is_bold: is_bold,
				is_reverse: is_reverse,
				is_underline: is_underline
			})
		}
	}
	return segments
}

// create a <pre> element from a list of segments
function render_segments(segments) {
	let pre_elem = document.createElement("pre")
	for (let segment of segments) {
		let span_elem = document.createElement("span")
		let text_node = document.createTextNode(segment.text)
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
		span_elem.appendChild(text_node)
		pre_elem.appendChild(span_elem)
	}
	return pre_elem
}

// handle key press
let ignore_keypress = false
document.onkeydown = function(e) {
	if (!session_name) { return; }
	if (ignore_keypress) { return; }
	let key = e.key
	let has_match = false

	if (key=="Enter") {
		send_key("Enter")
		has_match = true
	} else if (key=="Backspace") {
		send_key("BSpace")
		has_match = true
	} else if (key=="Tab") {
		send_key("Tab")
		has_match = true
	} else if (key=="Delete") {
		send_key("DC")
		has_match = true
	} else if (key=="ArrowUp") {
		send_key("Up")
		has_match = true
	} else if (key=="ArrowDown") {
		send_key("Down")
		has_match = true
	} else if (key=="ArrowLeft") {
		send_key("Left")
		has_match = true
	} else if (key=="ArrowRight") {
		send_key("Right")
		has_match = true
	} else if (key.length==1) {
		if (e.ctrlKey && key.match(/[a-zA-Z]/)) {
			send_key("C-" + key)
			has_match = true
		} else {
			send_key(key)
			has_match = true
		}
	}

	if (has_match) {
		e.preventDefault()
	}
}

// ask the user to quit the session on leave
window.onbeforeunload = function() {
	if (session_name && confirm("Kill session? (Press cancel to leave running in background)")) {
		kill_session(session_name)
	}
}

// handle changes in has part of URL
window.onhashchange = function() {
	session_name = window.location.hash.substr(1)
	if (session_name == "new-session") {
		console.log("hash changed, making new session")
		make_new_session()
	} else if (session_name !== "") {
		console.log("hash changed, using session"+session_name)
		attach_session_events()
	} else {
		console.log("No terminal session!")
	}
}

// update the list of panes in the menubar
function update_panes() {
	let panes_menu = document.getElementById("panes_list")
	panes_menu.innerHTML = ""
	get_panes(function(resp) {
		for (let pane of resp.panes) {
			console.log("Got pane:", pane)
			let change_to_pane_elem = document.createElement("a")
			change_to_pane_elem.onclick = function() {
				pane_name = pane.pane_name
			}
			panes_menu.appenChild(change_to_pane_elem)
		}
	})
}

// request a complete screen dump from tmux
// If delay_time is set, automatically request next update after delay_time(auto-refresh)
function update_screen(delay_time) {
	let term_elem = document.getElementById("terminal-content")
	get_screen(function(screen_content) {
		let segments = parse_escape_sequences(screen_content)
		let new_term_elem = render_segments(segments)
		new_term_elem.id = term_elem.id
		term_elem.replaceWith(new_term_elem)
		if (delay_time)  {
			setTimeout(update_screen, delay_time, delay_time)
		}
	})
}

function handle_control_mode_reply_block(meta, body) {
	console.log("handle_control_mode_reply_block", meta, body)
}
function handle_control_mode_event(line) {
	console.log("handle_control_mode_event", line)
	if (line.substr(0, 8) == "%output ") {
		update_screen()
	} else if (line.substr(0, 5) == "%exit") {
		window.location = "about:blank#close"
	}
}

let reply_body = undefined
let reply_meta = undefined
function handle_control_mode_line(line) {
	if (line.substr(0, 7) == "%begin ") {
		reply_meta = line.substr(7)
		reply_body = ""
	} else if (line.substr(0, 5) == "%end ") {
		handle_control_mode_reply_block(reply_meta, reply_body)
		reply_body = undefined
		reply_meta = undefined
	} else if (line.substr(0, 7) == "%error ") {
		Error("tmux sent error reply!");
	} else if (reply_meta){
		reply_body = reply_body + line + "\n"
	} else {
		handle_control_mode_event(line)
	}
}

function attach_session_events() {
	update_screen()
	const tmux_control_mode = new EventSource("/cgi-bin/tmux/control_mode.sh?session_name="+encodeURIComponent(session_name));
	tmux_control_mode.onmessage = function(e) {
		handle_control_mode_line(e.data)
	}
}

// create a new tmux session
function make_new_session() {
	console.log("Creating new session")
	create_session("bash", function(resp) {
		// got new session
		session_name = resp.session_name
		window.location.hash = session_name
	})
}


function show_theme() {
	ignore_keypress = true
	document.getElementById("theme").hidden = false
}
function close_theme() {
	ignore_keypress = false
	document.getElementById("theme").hidden = true
}

function show_about() {
	document.getElementById("about").hidden = false
}
function close_about() {
	document.getElementById("about").hidden = true
}


window.onhashchange()
