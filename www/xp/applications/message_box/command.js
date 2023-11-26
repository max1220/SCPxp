"use strict";

let cgi_commands = new CgiCommands(CGI_BACKEND)
let args = SEARCH_PARMS

let return_value = undefined
function btn_confirm() {
	win.dialog_return(["confirm", return_value])
}
function btn_cancel() {
	win.dialog_return(["cancel"])
}

// called by the WM when the window receives an event
function win_ev(ev_type) {
	if (ev_type == "close") {
		win.dialog_return(["close"])
	}
}
// called by the WM when the window is loaded
function win_load() {
	// setup a basic window
	win.title = "Running command..."
	win.icon = "file-script"
	win.resize(300, 350)
	win.resizeable = true
	win.closeable = true
	win.minimizeable = true
	win.show_taskbar = true

	// set window properties from args
	if (args.win_icon) {
		win.icon = args.win_icon
	}
	if (args.win_size) {
		win.resize(args.win_size.split("x")[0], args.win_size.split("x")[1])
	}
	if (args.win_closeable !== undefined) {
		win.closeable = args.win_closeable=="true"
	}
	if (args.win_resizeable !== undefined) {
		win.resizeable = args.win_resizeable=="true"
	}
	if (args.win_minimizeable !== undefined) {
		win.minimizeable = args.win_minimizeable=="true"
	}
	if (args.win_show_taskbar !== undefined) {
		win.show_taskbar = args.win_show_taskbar=="true"
	}
	if (args.win_title !== undefined) {
		document.title = args.win_title
		win.title = args.win_title
	}

	// set window content from args
	if (args.title_text !== undefined) {
		let elem = document.getElementById("title")
		elem.classList.remove("hidden")
		elem.innerText = args.title_text
	}
	if (args.title_icon !== undefined) {
		let elem = document.getElementById("title")
		elem.classList.add("icon")
		elem.classList.add("icon-32")
		elem.setAttribute("data-icon", args.title_icon)
	}
	if (args.main_html !== undefined) {
		document.getElementById("content").innerHTML = args.main_html
	} else if (args.main_text !== undefined) {
		document.getElementById("content").innerText = args.main_text
	} else {
		document.getElementById("content").classList.add("hidden")
	}

	if (args.confirm_button !== undefined) {
		if (args.confirm_button=="hidden") {
			document.getElementById("confirm_button").classList.add("hidden")
		} else {
			document.getElementById("confirm_button").innerText = args.confirm_button
		}
	}
	if (args.cancel_button !== undefined) {
		let elem = document.getElementById("cancel_button")
		elem.classList.remove("hidden")
		elem.innerText = args.cancel_button
	}

	win.update()

	function on_line(line) {
		document.getElementById("command_out").innerText += line + "\n"
	}
	function on_ret(ret) {
		return_value = ret
		let b_elem = document.createElement("b")
		b_elem.innerText = "Command returned: "+ ret
		document.getElementById("command_out").appendChild(b_elem)
		document.getElementById("confirm_button").disabled = false
	}

	if (args.command_str !== undefined) {
		// command encoded as a single string, to be evaluated using eval
		cgi_commands.run_command_event_stream(on_line, on_ret, false, false, ["eval", args.command_str], false, true)
	} else if (args.command) {
		// command encoded as string segments, to be taken verbatim
		let cmd = args.command
		if (!Array.isArray(cmd)) { cmd = [ args.command ] }
		cgi_commands.run_command_event_stream(on_line, on_ret, false, false, cmd, false, true)
	}


}
