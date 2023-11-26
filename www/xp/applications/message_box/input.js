"use strict";

let args = SEARCH_PARMS

function btn_confirm() {
	let elem = document.getElementById((args.blocktext !== undefined) ? "blocktext" : "text")
	win.dialog_return(["confirm", elem.value])
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
	win.title = "Input"
	win.icon = "generic-info"
	win.resize(300, 250)
	win.resizeable = false
	win.closeable = true
	win.minimizeable = false
	win.show_taskbar = false

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
	if (args.blocktext !== undefined) {
		let blocktext_elem = document.getElementById("blocktext")
		blocktext_elem.innerText = args.blocktext
		blocktext_elem.classList.add("bt-visible")
		blocktext_elem.classList.remove("hidden")
		let input_row_elem = document.getElementById("input_row")
		input_row_elem.classList.add("hidden")
		let expander_elem = document.getElementById("expander")
		expander_elem.classList.add("hidden")
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

	if (args.text_label !== undefined) {
		let elem = document.getElementById("text_label")
		elem.innerText = args.text_label
	}
	if (args.text_value !== undefined) {
		let elem = document.getElementById((args.blocktext !== undefined) ? "blocktext" : "text")
		elem.value = args.text_value
	}

	win.update()

	let text_elem = document.getElementById("text")
	text_elem.focus()
	text_elem.onkeydown = function(e) {
		if (e.key == "Enter") { btn_confirm(); }
	}
}
