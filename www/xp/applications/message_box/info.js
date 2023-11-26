"use strict";

let args = SEARCH_PARMS

function btn_confirm() {
	win.dialog_return("confirm")
}
function btn_cancel() {
	win.dialog_return("cancel")
}


function update_from_args() {
	// window properties
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

	// title element
	let title_elem = document.getElementById("title")
	if (args.title_text !== undefined) {
		title_elem.classList.remove("hidden")
		title_elem.innerText = args.title_text
	} else {
		title_elem.classList.add("hidden")
	}
	if (args.title_icon !== undefined) {
		title_elem.classList.add("icon")
		title_elem.classList.add("icon-32")
		title_elem.setAttribute("data-icon", args.title_icon)
	}

	// main content element
	let content_elem = document.getElementById("content")
	if (args.main_html !== undefined) {
		content_elem.innerHTML = args.main_html
		content_elem.classList.remove("hidden")
	} else if (args.main_text !== undefined) {
		content_elem.innerText = args.main_text
		content_elem.classList.remove("hidden")
	} else {
		content_elem.classList.add("hidden")
	}

	// blocktext element
	let blocktext_elem = document.getElementById("blocktext")
	if (args.blocktext !== undefined) {
		blocktext_elem.innerText = args.blocktext
		blocktext_elem.classList.add("bt-visible")
	} else {
		blocktext_elem.innerText = ""
		blocktext_elem.classList.remove("bt-visible")
	}

	// confirm button
	let confirm_button_elem = document.getElementById("confirm_button")
	if (args.confirm_button !== "hidden") {
		confirm_button_elem.classList.remove("hidden")
		confirm_button_elem.innerText = args.confirm_button || "Confirm"
	} else {
		confirm_button_elem.classList.add("hidden")
		confirm_button_elem.innerText = "Confirm"
	}

	// cancel button
	let cancel_button_elem = document.getElementById("cancel_button")
	if ((args.cancel_button !== undefined) && (args.cancel_button !== "hidden")) {
		cancel_button_elem.classList.remove("hidden")
		cancel_button_elem.innerText = args.cancel_button
	} else {
		cancel_button_elem.classList.add("hidden")
		cancel_button_elem.innerText = "Cancel"
	}

	// update window properties
	win.update()
}

// called by the WM when the window receives an event
function win_ev(ev_type, win, arg) {
	console.log("win_ev",ev_type, arg)
	if (ev_type == "close") {
		win.dialog_return("close")
	} else if (ev_type == "update_message_box") {
		console.log("Updating message box...")
		args = decode_parms_str(arg)
		update_from_args()
	}
}
// called by the WM when the window is loaded
function win_load() {
	win.title = "Info"
	win.icon = "generic-info"
	win.resize(300, 250)
	win.resizeable = false
	win.closeable = true
	win.minimizeable = false
	win.show_taskbar = false

	update_from_args()
}
