function X11Steamer(config_obj, cgi_commands) {

	// utillity functions to run a command with the display and session_id set
	this.run_command_async = function(cmd, cb) {
		let env = [
			[ "DISPLAY", config_obj.display ],
			[ "SESSION_ID", config_obj.session_id ]
		]
		return cgi_commands.run_command_async(cb, cmd, undefined, undefined, env)
	}
	this.run_command_sync = function(cmd) {
		let env = [
			[ "DISPLAY", config_obj.display ],
			[ "SESSION_ID", config_obj.session_id ]
		]
		return cgi_commands.run_command_sync(cmd, undefined, undefined, env)
	}

	// get the URL arguments for a command that runs ffmpeg to capture the screen,
	// and encode an multipart-replace JPEG stream(mpjpeg).
	this.enc_ffmpeg_mpjpeg = function(display, width, height, offset_x, offset_y, framerate, quality, low_delay) {
		let cmd = [ "ffmpeg" ]
		cmd.push(
			"-loglevel", "fatal",
			"-framerate", framerate,
			"-video_size", width+"x"+height,
			"-f", "x11grab",
			"-i", display+"+"+x_offset+","+y_offset,
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
		return cgi_commands.encode_command(cmd, "multipart/x-mixed-replace; boundary=--ffmpeg")
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
	this.enc_xvfb_run = function(session_id, cmd, session_wm, create_width, create_height, xauthority ) {
		let xvfb_cmd = [
			"xvfb-run",
			"-a",
			"-f", xauthority,
			"--server-args=\"-screen 0 " + create_width + "x" + create_height + "x24\"",
			"bin/xvfb_runner.sh"
		].concat(cmd)
		return encode_command(xvfb_cmd, [
			[ "SESSION_ID", session_id ],
			[ "SESSION_WM", session_wm ]
		])
	}

	// send a mouse move event
	this.send_mouse_move = function(x,y, rel, cb) {
		let mouse_move_cmd = [ "xdotool", rel ? "mousemove_relative" : "mousemove", "--", x, y ]
		return cgi_commands.run_command_async(mouse_move_cmd, undefined, undefined, undefined, undefined, cb)
	}

	// send a mouse button event
	this.send_mouse_btn = function(btn, down, cb) {
		let mouse_btn_cmd = [ "xdotool", down ? "mousedown" : "mouseup", btn ]
		return cgi_commands.run_command_async(mouse_btn_cmd, undefined, undefined, undefined, undefined, cb)
	}

	// send a keyboard event
	this.send_key = function(keysym, down, cb) {
		let send_key_cmd = [ "xdotool", down ? "keydown" : "keyup", keysym ]
		return cgi_commands.run_command_async(mouse_btn_cmd, undefined, undefined, undefined, undefined, cb)
	}

	// change the server resolution by generating a new modeline, defining a new mode, adding the new mode, and setting the new mode.
	this.xrandr_change_resolution = function(new_w, new_h) {
		let mode_line = get_mode_line(new_w, new_h)
		let newmode_cmd = [ "eval", "xrandr --newmode", mode_line.slice(1).join(" "), "&& echo ok || echo err" ],
		let addmode_cmd = [ "eval", "xrandr --addmode screen", mode_line[1], "&& echo ok || echo err" ],
		let setmode_cmd = [ "eval", "xrandr --output screen --mode", mode_line[1], "&& echo ok || echo err" ],
		let newmode_resp = this.run_command_sync(newmode_cmd)
		let addmode_resp = this.run_command_sync(addmode_cmd)
		let setmode_resp = this.run_command_sync(setmode_cmd)
		return (setmode_resp=="ok")
	}

	// get the DISPLAY for a session
	this.get_display_from_session = function(session_id) {
		let get_display_cmd = [ "cat", "xsessions/" + session_id + "/display" ]
		return cgi_commands.run_command_sync(get_display_cmd)
	}

	// get the size of the DISPLAY
	this.get_display_dimensions = function(display) {
		let xwininfo = cgi_commands.run_command_sync([ "xwininfo", "-root" ], undefined, undefined, [ [ "DISPLAY", display ] ])

		let dimensions = {}
		xwininfo.forEach(function(line) {
			if (line.trim().startsWith("Width:")) {
				dimensions.width = parseInt(line.split(":")[1].trim())
			} else if (line.trim().startsWith("Height:")) {
				dimensions.height = parseInt(line.split(":")[1].trim())
			}
		})
		return dimensions
	}

	// update the display dimensions and view configuration in config_obj
	this.update_display_dimensions = function() {
		let c = config_obj
		let dimensions = this.get_display_dimensions(c.display)
		c.server_width = dimensions.width
		c.server_height = dimensions.height

		// clip the view rectangle to the server
		c.view_offset_x = Math.min(c.view_offset_x, c.server_width)
		c.view_offset_y = Math.min(c.view_offset_y, c.server_height)
		c.view_width = Math.min(c.view_width, c.server_width)
		c.view_height = Math.min(c.view_height, c.server_height)
		c.view_width = Math.min(c.view_width, Math.min(c.server_width - c.view_offset_x))
		c.view_height = Math.min(c.view_height, Math.min(c.server_height - c.view_offset_y))
	}

	// update the display for the current session
	this.update_display = function() {
		config_obj.display = get_display_from_session(config_obj.session_id)
		this.update_display_dimensions()
	}

	// resolving JS key codes to X11 keysyms
	this.code_to_keysym = {
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
		let ch = alphabet.charAt(i).toLowerCase()
		this.code_to_keysym["Key"+ch] = ch.toLowerCase()
	}
	for (let i=0; i<10; i++) {
		this.code_to_keysym["Digit"+i] = i
	}

}
