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
function kill_session(session_name, cb) {
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
function send_key(session_name, keys_str, cb) {
	console.log("Sending key...", session_name, keys_str)
	const req_body =
		"session_name=" + encodeURIComponent(session_name) +
		"&keys_str=" + encodeURIComponent(keys_str)
	make_xhr(
		"/cgi-bin/tmux/send_keys.sh",
		"POST",
		"application/x-www-form-urlencoded",
		req_body,
		function(url, resp) {
			console.log("Sent key!")
			if (!cb) { return; }
			let decoded_obj = JSON.parse(resp)
			if (decoded_obj && decoded_obj.success) {
				cb(decoded_obj)
			}
		}
	)
}

// get the current screen content
// TODO: set enable_escape=true, and implement base64 decoding and ANSI escape parsing
function get_screen(session_name, cb) {
	//console.log("Getting screen...", session_name)
	const resp_body =
		"session_name=" + encodeURIComponent(session_name) +
		"&escape=true"

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

// from https://github.com/chalk/ansi-regex/blob/main/index.js
const escape_sequence_regexp = new RegExp(
	'([\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~])))'
	, "g"
)

// parse a string into segments with parameters
function parse_escape_sequences(str) {
	let segments = []
	var fg = undefined
	var bg = undefined
	var is_bold = undefined
	for (let segment of str.split(escape_sequence_regexp)) {
		if (segment.match(escape_sequence_regexp)) {
			// is an escape sequence, set current parameters
			let fg_match = segment.match("\\033\\[(3[0-7])")
			fg = fg_match ? fg_match[1] : fg;
			let bg_match = segment.match("\\033\\[(4[0-7])")
			bg = bg_match ? bg_match[1] : bg;
			if (segment=="\033[0m") {
				fg = undefined
				bg = undefined
				is_bold = undefined
			}
		} else {
			// is a text segment, push to segments list with current parameters
			segments.push({
				text: segment,
				fg: fg,
				bg: bg,
				is_bold: is_bold
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
		segment.fg ? span_elem.classList.add("term-fg-"+segment.fg) : false
		segment.bg ? span_elem.classList.add("term-bg-"+segment.bg) : false
		segment.is_bold ? span_elem.classList.add("term-bold") : false
		span_elem.appendChild(text_node)
		pre_elem.appendChild(span_elem)
	}
	return pre_elem
}


function use_session(session_name) {
	// handle key press
	document.onkeydown = function(e) {
		let key = e.key
		e.preventDefault()
		if (key=="Enter") {
			send_key(session_name, "C-m")
		} else if (key=="Backspace") {
			send_key(session_name, "C-h")
		} else if (key.length==1) {
			if (e.ctrlKey && key.match(/[a-zA-Z]/)) {
				send_key(session_name, "C-" + key)
			} else {
				send_key(session_name, key)
			}
		} else if (key=="Tab") {
			send_key(session_name, "Tab")
		}
	}

	// ask the user to quit the session on leave
	document.onbeforeunload = function() {
		if (confirm("Kill session? (Press cancel to leave running in background)")) {
			kill_session(session_name)
		}
	}

	// handle screen updates
	// TODO: replace this ugly hack
	function update_screen() {
		get_screen(session_name, function(screen_content) {
			let segments = parse_escape_sequences(screen_content)

			let new_term_elem = render_segments(segments)
			new_term_elem.id = term_elem.id
			term_elem.replaceWith(new_term_elem)
			term_elem = new_term_elem
			setTimeout(update_screen, 100)
		})
	}

	update_screen()
}

// the terminal element to control
let term_elem = document.getElementById("terminal-content")

let session_name = window.location.hash.substr(1)
console.log("session_name",session_name)
if (session_name == "new-session") {
	// create a new session, on success register event handlers
	create_session("bash", function(resp) {
		// got new session
		session_name = resp.session_name
		use_session(session_name)
	})
} else if (session_name !== "") {
	// use pre-existing session by hash part of URL
	use_session(session_name)
} else {
	console.log("No terminal session!")
}

