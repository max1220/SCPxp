"use strict";

function X11Streamer(config_obj, cgi_commands) {

	this.xvfb_run_script = "bin/x_session_xvfb.sh"
	this.mirror_run_script = "bin/x_session_mirror.sh"
	this.sessions_dir = "xsessions"

	// utillity functions to run a command with the display and session_id set
	this.run_command_async = function(cmd, cb) {
		let env = [
			[ "SESSIONS_DIR", this.sessions_dir ],
			[ "SESSION_ID", config_obj.session_id ],
			[ "DISPLAY", config_obj.display ],
		]
		return cgi_commands.run_command_async(cb, cmd, undefined, undefined, env)
	}

	this.run_command_sync = function(cmd) {
		let env = [
			[ "SESSIONS_DIR", this.sessions_dir ],
			[ "SESSION_ID", config_obj.session_id ],
			[ "DISPLAY", config_obj.display ],
		]
		return cgi_commands.run_command_sync(cmd, undefined, undefined, env)
	}

	// get the URL arguments for a command that runs ffmpeg to capture the screen,
	// and encode an multipart-replace JPEG stream(mpjpeg).
	this.enc_ffmpeg_mpjpeg = function(display, width, height, offset_x, offset_y, framerate, quality, low_delay, event_stream) {
		let cmd = [ "ffmpeg" ]
		cmd.push(
			"-loglevel", "fatal",
			"-framerate", framerate,
			"-video_size", width+"x"+height,
			"-f", "x11grab",
			"-i", display+"+"+offset_x+","+offset_y,
			"-c:v", "mjpeg",
		)
		if (quality) {
			cmd.push("-q:v", quality)
		}
		cmd.push(
			"-pix_fmt", "yuv420p",
			"-f", "mpjpeg",
			"-strict", "experimental",
			"-avioflags", "direct",
			"-fflags", "nobuffer"
		)
		if (low_delay) {
			cmd.push("-flags", "low_delay")
		}
		cmd.push("-")
		return cgi_commands.encode_command(cmd, "multipart/x-mixed-replace; boundary=--ffmpeg", undefined, undefined, undefined, event_stream)
	}

	// wrapper that reads config values from config_obj
	this.enc_ffmpeg_mpjpeg_config = function() {
		return this.enc_ffmpeg_mpjpeg(
			config_obj.display,
			config_obj.view_width,
			config_obj.view_height,
			config_obj.view_offset_x,
			config_obj.view_offset_y,
			config_obj.encode_framerate,
			config_obj.encode_quality,
			config_obj.encode_low_delay
		)
	}

	// encode a xvfb-run command to create a new session
	// session_id is the ID of the new session, and the foldername in xsessions/ where session info is.
	// session_wm is the name of the window manager to use, if any
	// create_width, create_height specify the initial dimensions
	// xauthority is the path to an xauthority file to use.
	this.enc_create_session_xvfb = function(new_session_id, cmd, session_wm, create_width, create_height, xauthority, event_stream) {
		let server_args_str = "-screen 0 " + create_width+"x"+create_height+"x24"

		return cgi_commands.encode_command(
			[
				"xvfb-run",
				"-a",
				"-f",
				xauthority,
				"-s",
				server_args_str,
				this.xvfb_run_script,
				cmd,
			],
			undefined,
			undefined,
			[
				[ "SESSIONS_DIR", this.sessions_dir ],
				[ "SESSION_ID", new_session_id ],
				[ "XAUTHORITY", xauthority ],
				[ "SESSION_WM", session_wm ],
				[ "CREATE_WIDTH", create_width ],
				[ "CREATE_HEIGHT", create_height ]
			],
			event_stream,
			true
		)
	}

	// encode a command create a new session from an exisiting X11 server.
	this.enc_create_session_mirror = function(new_session_id, mirror_display, xauthority, event_stream) {
		return cgi_commands.encode_command(
			[ this.mirror_run_script ],
			undefined,
			undefined,
			[
				[ "SESSIONS_DIR", this.sessions_dir ],
				[ "SESSION_ID", new_session_id ],
				[ "XAUTHORITY", xauthority ],
				[ "DISPLAY", mirror_display ]
			],
			event_stream,
			true
		)
	}

	// list all active sessions and info about them(TODO: Uses fewer requests)
	this.list_sessions = function() {
		let sessions_list_str = cgi_commands.run_command_sync( ["ls", this.sessions_dir] )
		if (!sessions_list_str || sessions_list_str=="") { return; }
		let session_list = sessions_list_str.split("\n")
		let sessions = []
		session_list.forEach(function(session_id) {
			if (session_id=="") { return; }
			let session_pid = cgi_commands.run_command_sync([ "cat", this.sessions_dir+"/"+session_id+"/pid" ])
			let session_display = cgi_commands.run_command_sync([ "cat", this.sessions_dir+"/"+session_id+"/display" ])
			let session_command = cgi_commands.run_command_sync([ "cat", this.sessions_dir+"/"+session_id+"/command"])
			if (session_command == "") { session_command=undefined; }
			sessions.push({
				id: session_id,
				pid: session_pid,
				display: session_display,
				command: session_command
			})
		}, this)
		return sessions
	}

	// kill the current session
	this.kill_session = function() {
		this.run_command_sync(["eval", "kill \"$(cat $SESSIONS_DIR/$SESSION_ID/pid)\""])
	}

	// run the xdotool command, call cb on success
	this.send_xdotool_cmd_direct = function(xdotool_args, cb) {
		let xdotool_cmd_direct = [ "xdotool" ].concat(xdotool_args)
		return this.run_command_async(xdotool_cmd_direct, cb)
	}

	// run the xdotool command via an already-prepared FIFO for a session
	this.send_xdotool_cmd_session = function(xdotool_args) {
		let xdotool_cmd_session = [
			"eval",
			"echo",
			cgi_commands.escape_shell_args(xdotool_args),
			">",
			"xsessions/"+config_obj.session_id+"/xdotool"
		]
		// can't capture output of xdotool anyway, so run async without callback to return immediatly.
		return this.run_command_async(xdotool_cmd_session)
	}

	// send a mouse move event
	this.send_mouse_move = function(x,y, rel, cb) {
		let move_type = rel ? "mousemove_relative" : "mousemove"
		let xdotool_move_args = [ move_type, "--", x, y ]
		if (cb) {
			this.send_xdotool_cmd_direct(xdotool_move_args)
		} else {
			this.send_xdotool_cmd_session(xdotool_move_args)
		}
	}

	// send a mouse button event
	this.send_mouse_btn = function(btn, down, cb) {
		let btn_type = down ? "mousedown" : "mouseup"
		let xdotool_btn_args = [ btn_type, btn ]
		if (cb) {
			this.send_xdotool_cmd_direct(xdotool_btn_args)
		} else {
			this.send_xdotool_cmd_session(xdotool_btn_args)
		}
	}

	// send a keyboard event
	this.send_key = function(keysym, down, cb) {
		let key_type = down ? "keydown" : "keyup"
		let xdotool_key_args = [ key_type, keysym ]
		if (cb) {
			this.send_xdotool_cmd_direct(xdotool_key_args)
		} else {
			this.send_xdotool_cmd_session(xdotool_key_args)
		}
	}

	// change the server resolution by generating a new modeline, defining a new mode, adding the new mode, and setting the new mode.
	this.xrandr_change_resolution = function(new_w, new_h) {
		let mode_line = get_mode_line(new_w, new_h)
		let newmode_cmd = [ "eval", "xrandr --newmode", mode_line.slice(1).join(" "), "2> /dev/zero && echo ok || echo err" ]
		let addmode_cmd = [ "eval", "xrandr --addmode screen", mode_line[1], "2> /dev/zero && echo ok || echo err" ]
		let setmode_cmd = [ "eval", "xrandr --output screen --mode", mode_line[1], "2> /dev/zero && echo ok || echo err" ]
		let newmode_resp = this.run_command_sync(newmode_cmd)
		let addmode_resp = this.run_command_sync(addmode_cmd)
		let setmode_resp = this.run_command_sync(setmode_cmd)
		return (setmode_resp=="ok")
	}

	// get the DISPLAY for a session
	this.get_display_from_session = function(session_id) {
		let get_display_cmd = [ "cat", this.sessions_dir + "/" + session_id + "/display" ]
		return cgi_commands.run_command_sync(get_display_cmd)
	}

	// get the size of the DISPLAY
	this.get_display_dimensions = function(display) {
		let xwininfo = cgi_commands.run_command_sync([ "xwininfo", "-root" ], undefined, undefined, [ [ "DISPLAY", display ] ])
		let dimensions = {}
		xwininfo.split("\n").forEach(function(line) {
			if (line.trim().startsWith("Width:")) {
				dimensions.width = parseInt(line.split(":")[1].trim())
			} else if (line.trim().startsWith("Height:")) {
				dimensions.height = parseInt(line.split(":")[1].trim())
			}
		})
		if (!dimensions.width || !dimensions.height) { return; }
		return dimensions
	}

	// update the display dimensions and view configuration in config_obj
	this.update_display_dimensions = function() {
		let c = config_obj
		let dimensions = this.get_display_dimensions(c.display)
		if (!dimensions) { return; }
		c.display_width = dimensions.width
		c.display_height = dimensions.height

		// clip the view rectangle to the server
		c.view_offset_x = Math.min(c.view_offset_x, c.display_width)
		c.view_offset_y = Math.min(c.view_offset_y, c.display_height)
		c.view_width = Math.min(c.view_width, c.display_width)
		c.view_height = Math.min(c.view_height, c.display_height)
		c.view_width = Math.min(c.view_width, Math.min(c.display_width - c.view_offset_x))
		c.view_height = Math.min(c.view_height, Math.min(c.display_height - c.view_offset_y))

		return dimensions
	}

	// update the display for the current session
	this.update_display = function() {
		if (((!config_obj.display) || config_obj.display=="") && config_obj.session_id && (config_obj.session_id !== "")) {
			config_obj.display = this.get_display_from_session(config_obj.session_id)
			if ((!config_obj.display) || config_obj.display=="") {
				return
			}
		}
		return this.update_display_dimensions()
	}

	// resolving JS key codes to X11 keysyms
	this.code_to_keysym = {
		"Enter": "Return",
		"Escape": "Escape",
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
		"ControlLeft": "Control_L",
		"IntlBackslash": "less",
		"Backquote": "dead_circumflex",
	}
	let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	for (let i=0; i<alphabet.length; i++) {
		let ch = alphabet.charAt(i)
		this.code_to_keysym["Key"+ch] = ch.toLowerCase()
	}
	for (let i=0; i<10; i++) {
		this.code_to_keysym["Digit"+i] = i
	}

}
