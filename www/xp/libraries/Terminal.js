"use strict";

function Terminal(cgi_commands) {

	// generate a format string to get the specified tmux properties
	this.format_string_from_props = function(props) {
		let seperator = ";"
		return props.map(function(s) { return "#{"+s+"}" }).join(seperator)
	}

	// parse a string containing the specified tmux properties
	this.parse_formatted_string = function(str, props) {
		let seperator = ";"
		let str_segs = str.split(seperator)
		let obj = {}
		for (let i=0; i<str_segs.length; i++) {
			let prop_name = props[i]
			let prop_value = str_segs[i]
			obj[prop_name] = prop_value
		}
		return obj
	}

	// create session by name
	this.new_session = function(session_name, command) {
		let props = ["session_id", "window_id", "pane_id"]
		let resp_str = cgi_commands.run_command_sync([
			"tmux",
			"new-session",
			"-P",
			"-d",
			"-F", this.format_string_from_props(props),
			"-s", session_name,
			command
		]).trim()
		let info = this.parse_formatted_string(resp_str, props)
		if (info.session_id == "") { return; }
		return info
	}

	// create a new window
	this.new_window = function(target_session, command) {
		let props = ["session_id", "window_id", "pane_id"]
		let resp_str = cgi_commands.run_command_sync([
			"tmux",
			"new-window",
			"-P",
			"-t",
			target_session+":",
			"-F", this.format_string_from_props(props),
			command
		])
		let info = this.parse_formatted_string(resp_str, props)
		if (info.session_id == "") { return; }
		return info
	}

	// kill session by name
	this.kill_session = function(target_session) {
		return cgi_commands.run_command_sync([
			"tmux",
			"kill-session",
			"-t", target_session
		])
	}

	// get a list of all session id's and names
	this.list_sessions = function() {
		let props = ["session_id", "window_id", "pane_id", "session_name"]
		let resp_str = cgi_commands.run_command_sync([
			"tmux",
			"list-sessions",
			"-F",
			 this.format_string_from_props(props)
		])
		return resp_str.split(/\r?\n/).flatMap(function(line) {
			if (line=="") { return []; }
			let info = this.parse_formatted_string(line, props)
			if (info.session_id=="") { return []; }
			return [info]
		}, this)
	}

	// get a list of all panes on all windows in the specified session
	this.list_panes = function(target_session) {
		let props = ["session_id", "window_id", "pane_id", "pane_width", "pane_height", "pane_title"]
		let resp_str = cgi_commands.run_command_sync([
			"tmux",
			"list-panes",
			"-s",
			"-t",
			target_session,
			"-F",
			 this.format_string_from_props(props)
		])
		return resp_str.split(/\r?\n/).flatMap(function(line) {
			if (line=="") { return []; }
			let info = this.parse_formatted_string(line, props)
			if (info.session_id=="") { return []; }
			return [info]
		}, this)
	}

	// resize the specified window
	this.resize_window = function(target_window, new_w, new_h) {
		return cgi_commands.run_command_sync([
			"tmux",
			"resize-window",
			"-t", target_window,
			"-x", new_w,
			"-y", new_h
		])
	}

	// send keys to the specified pane
	this.send_keys = function(target_pane, keys_str, literal) {
		return cgi_commands.run_command_sync([
			"tmux",
			"send-keys",
			(literal ? "-l" : ""),
			keys_str
		])
	}

	// get info about a specified pane
	this.info = function(target_pane, cb, arg_props) {
		// list of tmux property names to query
		let default_props = [
			"cursor_x",
			"cursor_y",
			"cursor_character",
			"cursor_flag",
			"pane_active",
			"pane_fg",
			"pane_bg",
			"pane_pid",
			"pane_tty",
			"pane_width",
			"pane_height",
			"pane_current_command",
			"pane_current_path",
			"pane_title",
			"pane_id",
			"window_index",
			"window_id",
			"window_name",
			"session_id",
			"session_name"
		]
		let props = arg_props || default_props

		// run display-message to query the specified props
		let command = [
			"tmux",
			"display-message",
			"-p",
			"-t", target_pane,
			"-F", this.format_string_from_props(props)
		]
		if (cb) {
			cgi_commands.run_command_async((function(resp_str) {
				cb(this.parse_formatted_string(resp_str.trim(), props))
			}).bind(this), command)
		} else {
			let resp_str = cgi_commands.run_command_sync(command).trim()
			return this.parse_formatted_string(resp_str, props)
		}
	}

	// capture terminal content on specified pane
	this.capture = function(target_pane, cb) {
		let cmd = [
			"tmux",
			"capture-pane",
			"-p",
			"-e",
			"-N",
			"-t",
			target_pane
		]
		if (cb) {
			return cgi_commands.run_command_async(function(resp_str) {
				let lines = resp_str.split(/\r?\n/)
				lines.pop()
				cb(lines.join("\n"))
			}, cmd)
		} else {
			let resp_str = cgi_commands.run_command_sync(cmd)
			let lines = resp_str.split(/\r?\n/)
			lines.pop()
			return lines.join("\n")
		}
	}

	// capture terminal content on specified pane and also cursor position
	this.capture_with_info = function(target_pane, cb) {
		let props = [
			"cursor_x",
			"cursor_y",
			"cursor_flag",
			"pane_width",
			"pane_height"
		]
		let command = [
			"tmux",
			"capture-pane",
			"-p",
			"-e",
			"-N",
			"-t",
			target_pane,
			";",
			"display-message",
			"-p",
			"-t",
			target_pane,
			"-F",
			this.format_string_from_props(props)
		]
		if (cb) {
			cgi_commands.run_command_async((function(resp_str) {
				if (resp_str == "") { return; }
				let lines = resp_str.split(/\r?\n/)
				lines.pop()
				let info_line = lines.pop()
				let lines_text = lines.join("\n")
				let info = this.parse_formatted_string(info_line, props)
				cb(lines_text, info)
			}).bind(this), command)
		} else {
			let resp_str = cgi_commands.run_command_sync(command)
			if (resp_str == "") { return; }
			let lines = resp_str.split(/\r?\n/)
			lines.pop()
			let info_line = lines.pop()
			let lines_text = lines.join("\n")
			let info = this.parse_formatted_string(info_line, props)
			return [lines_text, info]
		}
	}

	// regex for matching an escape sequence
	// see https://github.com/chalk/ansi-regex/blob/main/index.js
	const escape_sequence_regexp = new RegExp(
		'([\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~])))'
		, "g"
	)

	// split a string into segments with rendering parameters by
	// parsing the escape sequences
	this.parse_escape_sequences = function(str) {
		// first split the content into lines
		// (escape sequences should not contain newlines)
		let lines = str.split("\n")

		// each line get a list of segments
		let lines_segments = []

		// current parser state
		let state = {
			fg: false,
			bg: false,
			bold: false,
			reverse: false,
			underline: false
		}

		for (let i=0; i<lines.length; i++) {
			let current_line = lines[i]

			// list of segments in current line
			let current_line_segments = []

			// line without any escape sequences
			if (!current_line.match(escape_sequence_regexp)) {
				// add sgr reset at beginning, so at least one escape sequence is always present
				let current_state = { ...state }
				current_state.text = current_line
				current_line_segments.push(current_state)
				lines_segments.push(current_line_segments)
				continue
			}

			// split the line by the escape sequence regex
			for (let segment of current_line.split(escape_sequence_regexp)) {
				// if segment is an escape sequence, update parser state
				if (segment.match(escape_sequence_regexp)) {
					let has_match = false

					// foreground color \e[30m - \e[37m
					let fg_match = segment.match("\\033\\[(3[0-7])m")
					if (fg_match) {
						state.fg = fg_match[1]
						has_match = true
					}
					// foreground color \e[90m - \e[97m
					fg_match = segment.match("\\033\\[(9[0-7])m")
					if (fg_match) {
						state.fg = fg_match[1]
						has_match = true
					}
					// background color \e[40m - \e[47m
					let bg_match = segment.match("\\033\\[(4[0-7])m")
					if (bg_match) {
						state.bg = bg_match[1]
						has_match = true
					}
					// background color \e[100m - \e[107m
					bg_match = segment.match("\\033\\[(10[0-7])m")
					if (bg_match) {
						state.bg = bg_match[1]
						has_match = true
					}
					// iterate semicolon-separated SGR codes
					let sgr_codes = segment.match("\\033\\[(.*)m")[1].split(";")
					for (let sgr_code of sgr_codes) {
						if (sgr_code=="0") {
							// reset SGR parameters
							state.fg = false
							state.bg = false
							state.bold = false
							state.reverse = false
							state.underline = false
							has_match = true
						} else if (sgr_code=="39") {
							// reset fg to default
							state.fg = false
							has_match = true
						} else if (sgr_code == "49") {
							// reset bg to default
							state.bg = false
							has_match = true
						} else if (sgr_code == "1") {
							// set bold
							state.bold = true
							has_match = true
						} else if (sgr_code == "4") {
							// set underline
							state.underline = true
							has_match = true
						} else if (sgr_code == "7") {
							// set reverse
							state.reverse = true
							has_match = true
						}
					}

					// log unknown escape sequences
					// tmux should only generate the above escape sequences in it's pane dump output
					if (!has_match) {
						console.log("Unknown escape sequence: ", segment)
					}
				} else {
					// is a text segment, push to segments list with current parameters
					let current_state = { ...state }
					current_state.text = segment
					current_line_segments.push(current_state)
				}
			}

			// add generated line segments for currerent line
			lines_segments.push(current_line_segments)
		}

		return lines_segments
	}

	// create a <pre> element from a list of lines of segments
	this.render_segments = function(parent_elem, lines_segments) {
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
				span_elem.classList.add("terminal-segment")
				span_elem.innerText = segment.text
				if (segment.reverse) {
					if (segment.bg) {
						let new_fg = parseInt(segment.bg) - 10
						span_elem.classList.add("terminal-fg-"+new_fg)
					}
					if (segment.fg) {
						let new_bg = parseInt(segment.fg) + 10
						span_elem.classList.add("terminal-bg-"+new_bg)
					}
					span_elem.classList.add("terminal-reverse")
				} else {
					if (segment.fg) { span_elem.classList.add("terminal-fg-"+segment.fg) }
					if (segment.bg) { span_elem.classList.add("terminal-bg-"+segment.bg) }
				}
				if (segment.bold) { span_elem.classList.add("terminal-bold") }
				if (segment.underline) { span_elem.classList.add("terminal-underline") }
				row_elem.appendChild(span_elem)
			}

			// add a newline after every row
			let linebreak = document.createElement("br")
			linebreak.classList.add("terminal-newline")
			row_elem.appendChild(linebreak)

			// append row to parrent
			parent_elem.appendChild(row_elem)
		}
	}

	// characters that can be send to tmux directly
	const single_char_keys = [
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
		"#",
		" "
	]

	// return a string for termux from a JS key event
	this.key_event_to_tmux = function(key_ev) {
		let key = key_ev.key
		if (key=="Enter") {
			return ["Enter", false]
		} else if (key=="PageUp") {
			return ["PageUp", false]
		} else if (key=="PageDown") {
			return ["PageDown", false]
		} else if (key=="Backspace") {
			return ["BSpace", false]
		} else if (key=="Tab") {
			return ["Tab", false]
		} else if (key=="Delete") {
			return ["DC", false]
		} else if (key=="ArrowUp") {
			return ["Up", false]
		} else if (key=="ArrowDown") {
			return ["Down", false]
		} else if (key=="ArrowLeft") {
			return ["Left", false]
		} else if (key=="ArrowRight") {
			return ["Right", false]
		} else if (key.length==1) {
			if (key_ev.ctrlKey && key.match(/[a-zA-Z]/)) {
				return ["C-" + key, false]
			} else if (key.match(/[a-zA-Z0-9]/)){
				return [key, true]
			} else if (single_char_keys.includes(key)) {
				return [key, true]
			} else if (key == ";") {
				return ["\\;", true]
			}
		}
	}

	// handle a single line of the control-mode event
	this.control_mode_events_dispatcher = function() {
		let dispatcher = {}
		dispatcher.reply_meta = undefined
		dispatcher.reply_body = undefined
		dispatcher.callbacks = {}
		dispatcher.handle_line = function(line) {
			if (line.startsWith("%begin")) {
				// beginning of command reply
				this.reply_meta = line.substr(7)
				this.reply_body = []
			} else if (line.startsWith("%end")) {
				// end of command reply
				if (this.callbacks.on_reply && this.reply_body) {
					this.callbacks.on_reply(this.reply_meta, this.reply_body)
				}
				this.reply_meta = undefined
				this.reply_body = undefined
			} else if (line.startsWith("%error")) {
				// tmux error
				if (this.callbacks.on_error) {
					this.callbacks.on_error(line)
				}
				this.reply_meta = undefined
				this.reply_body = undefined
			} else if (this.reply_meta !== undefined) {
				// inside command reply
				this.reply_body.push(line)
			} else {
				// tmux event
				let args = line.substr(1).split(" ")
				let event_name = args.splice(0,1)[0];
				if (this.callbacks["on_"+event_name]) {
					this.callbacks["on_"+event_name](line, event_name, args)
				} else if (this.callbacks.on_event) {
					this.callbacks.on_event(line, event_name, args)
				}
			}
		}
		return dispatcher
	}

}
