// the list of active windows
let windows_list = []

// position of the next created window
let place_x = 50
let place_y = 50

let windows_elem = document.getElementById("windows")
let windowlist_elem = document.getElementById("windowlist")
let clock_elem = document.getElementById("clock")
let start_buttton_elem = document.getElementById("start-button")
let start_menu_elem = document.getElementById("start-menu")

// handle clicking the start button(show/hide start menu)
start_buttton_elem.onclick = function(e) {
	show_start_menu()
}
function show_start_menu() {
	if (start_menu_elem.hidden) {
		start_menu_elem.hidden = false
		start_buttton_elem.onclick = function(e) {
			hide_start_menu()
		}
	}
}
function hide_start_menu() {
	if (!start_menu_elem.hidden) {
		start_menu_elem.hidden = true
		start_buttton_elem.onclick = function(e) {
			show_start_menu()
		}
	}
}

// Update the clock element
setInterval(function() {
	let currentdate = new Date()
	let time_str = currentdate.getHours().toString().padStart(2, "0") + ":" + currentdate.getMinutes().toString().padStart(2, "0") + ":" + currentdate.getSeconds().toString().padStart(2, "0")
	clock_elem.innerHTML = time_str
}, 1000);

/* Window movement by dragging title bar */
let drag_window = undefined
let mouse_x = undefined
let mouse_y = undefined
document.body.onmousedown = function(mousedown_ev) {
	// only lmb
	if (mousedown_ev.button !== 0) { return }

	// check if mouse hit a window titlebar
	for (let window_obj of windows_list) {
		if ((mousedown_ev.target == window_obj.titlebar) || (mousedown_ev.target == window_obj.titlebar_text)) {
			console.log("titlebar mouse down", window_obj)
			drag_window = window_obj
			focus_window(window_obj)
			mouse_x = mousedown_ev.clientX
			mouse_y = mousedown_ev.clientY
			mousedown_ev.preventDefault()
		}
	}
}
document.body.onmousemove = function(mousemove_ev) {
	if (!drag_window) {
		return
	}
	let delta_x = mouse_x-mousemove_ev.clientX
	let delta_y = mouse_y-mousemove_ev.clientY
	mouse_x = mousemove_ev.clientX
	mouse_y = mousemove_ev.clientY
	let pos_x = drag_window.window.offsetLeft - delta_x
	let pos_y = drag_window.window.offsetTop - delta_y
	drag_window.x = pos_x
	drag_window.y = pos_y
	drag_window.window.style.left = pos_x + "px"
	drag_window.window.style.top = pos_y + "px"
	mousemove_ev.preventDefault()
}
document.body.onmouseup = function(mouseup_ev) {
	if (drag_window) {
		drag_window = undefined
		mouse_x = undefined
		mouse_y = undefined
		mouseup_ev.preventDefault()
	}
	if (mouseup_ev.target !== start_buttton_elem) {
		hide_start_menu()
	}
}

// Create a window object with an empty body
function make_window(title, resizeable, width, height) {
	// create all needed (sub-)elements
	let window_elem = document.createElement("div")
	let body_elem = document.createElement("div")
	let titlebar_elem = document.createElement("div")
	let titlebar_text_elem = document.createElement("div")
	let titlebar_controls_elem = document.createElement("div")
	let titlebar_controls_minimize_elem = document.createElement("button")
	let titlebar_controls_maximize_elem = document.createElement("button")
	let titlebar_controls_close_elem = document.createElement("button")
	let taskbar_button_elem = document.createElement("button")

	// create the window object
	let window_obj = {
		x: place_x,
		y: place_y,
		width: width,
		height: height,

		title: title,
		resizeable: resizeable,
		minimized: false,
		maximized: false,

		body: body_elem,
		titlebar: titlebar_elem,
		window: window_elem,
		taskbar_button: taskbar_button_elem,
		titlebar_text: titlebar_text_elem,
		minimize: titlebar_controls_minimize_elem,
		maximize: titlebar_controls_maximize_elem,
		close: titlebar_controls_close_elem

	}
	// update next window placement position
	place_x = (place_x + 50) % window.innerWidth
	place_y = (place_y + 50) % window.innerHeight

	// update to the initial state of the title, position, dimensions
	update_window(window_obj)

	// add classes and put windows into proper hierarchy
	taskbar_button_elem.classList += " windowbutton overflow-ellipsis"
	window_elem.appendChild(titlebar_elem)
	window_elem.appendChild(body_elem)
	window_elem.classList += " window noselect"

	body_elem.classList += " window-body"
	titlebar_elem.classList += " title-bar"
	titlebar_elem.appendChild(titlebar_text_elem)
	titlebar_elem.appendChild(titlebar_controls_elem)
	titlebar_text_elem.classList += " title-bar-text"
	titlebar_controls_elem.classList += " title-bar-controls"
	titlebar_controls_elem.appendChild(titlebar_controls_minimize_elem)
	titlebar_controls_elem.appendChild(titlebar_controls_maximize_elem)
	titlebar_controls_elem.appendChild(titlebar_controls_close_elem)
	titlebar_controls_minimize_elem.setAttribute("aria-label", "Minimize")
	titlebar_controls_maximize_elem.setAttribute("aria-label", "Maximize")
	titlebar_controls_close_elem.setAttribute("aria-label", "Close")

	// The minimize/"_" button in the top-right corner was pressed
	titlebar_controls_minimize_elem.onclick = function() {
		minimize_window(window_obj)
	}

	// The maximize button in the top-right corner was pressed
	titlebar_controls_maximize_elem.onclick = function() {

	}

	// The close/"X" button in the top-right corner was pressed
	titlebar_controls_close_elem.onclick = function() {
		remove_window(window_obj)
	}

	// the taskbar window button was pressed(overridden on minimize/unminimize)
	window_obj.taskbar_button.onclick = function(e) {
		minimize_window(window_obj)
		e.preventDefault()
	}

	return window_obj
}

// Create a window object with a body containing an iframe
function make_iframe_window(title, url, resizeable, width, height, pre_iframe_elem) {
	let window_obj = make_window(title, resizeable, width, height)
	let iframe_elem = pre_iframe_elem || document.createElement("iframe")

	iframe_elem.onload = function() {
		let inner_source = iframe_elem.contentDocument.documentElement.outerHTML
		let current_url = iframe_elem.contentWindow.location.href
		let prefered_width = inner_source.match(/{{{window_width=([0-9]*)}}}/)
		let prefered_height = inner_source.match(/{{{window_height=([0-9]*)}}}/)
		let resizeable = inner_source.includes("{{{window_resizeable}}}")
		let title = iframe_elem.contentDocument.title
		window_obj.title = title || window.title
		window_obj.resizeable = resizeable ? true : false
		window_obj.width = prefered_width ? prefered_width[1] : window.width
		window_obj.height = prefered_height ? prefered_height[1] : window.height
		update_window(window_obj)

		// Close if the page navigated to about:blank.
		// (This makes it easy to close a windows from HTML or JS.
		if (current_url=="about:blank#close") {
			remove_window(window_obj)
		}
	}

	if (url) {
		iframe_elem.src = url
	}
	window_obj.iframe = iframe_elem
	window_obj.body.classList.add("window-body-iframe")
	window_obj.body.appendChild(iframe_elem)
	return window_obj
}

// Add a window(show it)
function add_window(window_obj) {
	windows_list.push(window_obj)

	windows_elem.appendChild(window_obj.window)
	windowlist_elem.appendChild(window_obj.taskbar_button)

	return window_obj
}

// Remove a window(close it)
function remove_window(window_obj) {
	// Remove from list of windows
	console.log("removing", window_obj)
	var index = windows_list.indexOf(window_obj)
	if (index !== -1) {
		windows_list.splice(index, 1);
	}
	// remove from DOM
	window_obj.window.remove()
	window_obj.taskbar_button.remove()
	if (windows_list[0]) {
		focus_window(windows_list[0])
	}
}

// Update window properties: position, dimensions, title, resizeable
function update_window(window_obj) {
	window_obj.taskbar_button.classList.add("windowbutton-visible")
	window_obj.taskbar_button.innerHTML = window_obj.title
	window_obj.window.style.width = window_obj.width+"px"
	window_obj.window.style.height = window_obj.height+"px"
	window_obj.window.style.left = window_obj.x+"px"
	window_obj.window.style.top = window_obj.y+"px"

	if (window_obj.resizeable) {
		window_obj.window.classList.add("window-resizeable")
		window_obj.maximize.classList.remove("hidden")
	} else {
		window_obj.window.classList.remove("window-resizeable")
		window_obj.maximize.classList.add("hidden")
	}

	window_obj.titlebar_text.innerHTML = window_obj.title
}

// Pre-creating a hidden window with iframe.
// On iframe load, create a new hidden window,
// and transform the current window into a visible window.
// This way, links always have a hidden iframe to target that will open a new window on load.
function make_next_window() {
	// create a hidden iframe window called "make_new_win" and add it to DOM
	let window_obj = make_iframe_window("unloaded", false, false, 640, 480)
	let original_onload = window_obj.iframe.onload
	window_obj.iframe.name = "make_new_win"
	window_obj.window.hidden = true
	window_obj.taskbar_button.hidden = true
	add_window(window_obj)

	// when this iframe loads a page, show the window, rename it, and create a new "make_new_win"
	window_obj.iframe.onload = function() {
		let navigated_loc = window_obj.iframe.contentWindow.location.href
		if (navigated_loc == "about:blank") {
			return
		}
		window_obj.iframe.removeAttribute("name");
		window_obj.window.hidden = false
		window_obj.taskbar_button.hidden = false
		window_obj.iframe.onload = original_onload
		focus_window(window_obj)
		original_onload()
		return make_next_window()
	}
	window_obj.iframe.src = "about:blank"
}

/* Minimize/unminimize a window */
function unminimize_window(window_obj) {
	window_obj.window.hidden = false
	window_obj.taskbar_button.classList.add("windowbutton-visible")
	window_obj.taskbar_button.onclick = function(e) {
		minimize_window(window_obj)
		e.preventDefault()
	}
}
function minimize_window(window_obj) {
	window_obj.taskbar_button.classList.remove("windowbutton-visible")
	window_obj.window.hidden = true
	window_obj.taskbar_button.onclick = function(e) {
		unminimize_window(window_obj)
		e.preventDefault()
	}
}

/* Focus a window */
function focus_window(window_obj) {
	for (let win_obj of windows_list) {
		if (win_obj !== window_obj) {
			win_obj.window.classList.add("window-unfocused")
		}
	}
	windows_list.splice(windows_list.indexOf(window_obj), 1)[0]
	windows_list.unshift(window_obj)
	for (let i=0; i<windows_list.length; i++) {
		let win_obj = windows_list[i]
		win_obj.window.style.zIndex = 1000 + (windows_list.length-i) * 100
		console.log("new zindex:", 1000 + (i) * 100, win_obj.titlebar_text.innerHTML)
	}
	window_obj.window.classList.remove("window-unfocused")
}



// create the initial hidden iframe window that acts as a link target
make_next_window()


