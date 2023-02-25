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
	if (start_menu_elem.classList.contains("hidden")) {
		start_menu_elem.classList.remove("hidden")
		start_buttton_elem.onclick = function(e) {
			hide_start_menu()
		}
	}
}
function hide_start_menu() {
	if (!start_menu_elem.classList.contains("hidden")) {
		start_menu_elem.classList.add("hidden")
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
		let should_drag_window =
			(
				(mousedown_ev.target == window_obj.titlebar) ||
				(mousedown_ev.target == window_obj.titlebar_text)
			) && (!window_obj.maximized)
		if (should_drag_window) {
			console.log("titlebar mouse down", window_obj)
			drag_window = window_obj
			focus_window(window_obj)
			mouse_x = mousedown_ev.clientX
			mouse_y = mousedown_ev.clientY
			mousedown_ev.preventDefault()
			if (window_obj.iframe) {
				window_obj.iframe.style.pointerEvents = "none"
			}
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
		if (drag_window.iframe) {
			drag_window.iframe.style.pointerEvents = "auto"
		}
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
	let titlebar_controls_restore_elem = document.createElement("button")
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
		restore: titlebar_controls_restore_elem,
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
	titlebar_controls_elem.appendChild(titlebar_controls_restore_elem)
	titlebar_controls_elem.appendChild(titlebar_controls_close_elem)
	titlebar_controls_minimize_elem.setAttribute("aria-label", "Minimize")
	titlebar_controls_maximize_elem.setAttribute("aria-label", "Maximize")
	titlebar_controls_restore_elem.setAttribute("aria-label", "Restore")
	titlebar_controls_close_elem.setAttribute("aria-label", "Close")

	// The minimize/"_" button in the top-right corner was pressed
	titlebar_controls_minimize_elem.onclick = function() {
		minimize_window(window_obj)
	}

	// The maximize button in the top-right corner was pressed
	titlebar_controls_maximize_elem.onclick = function() {
		console.log("maximize clicked")
		maximize_window(window_obj)
	}

	// The restore button in the top-right corner was pressed
	titlebar_controls_restore_elem.onclick = function() {
		console.log("restore clicked")
		restore_window(window_obj)
	}

	// The close/"X" button in the top-right corner was pressed
	titlebar_controls_close_elem.onclick = function() {
		remove_window(window_obj)
	}

	// the taskbar window button was pressed(overridden on minimize/unminimize)
	window_obj.taskbar_button.onclick = function(e) {
		minimize_window(window_obj)
	}

	return window_obj
}

// Create a window object with a body containing an iframe
function make_iframe_window(title, url, resizeable, width, height, pre_iframe_elem) {
	let window_obj = make_window(title, resizeable, width, height)
	let iframe_elem = pre_iframe_elem || document.createElement("iframe")
	iframe_elem.classList.add("window-body-iframe")

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
	window_obj.body.appendChild(iframe_elem)
	return window_obj
}

// Make the settings window(can't use iframe)
function make_settings_window() {
	let window_obj = make_window("🔧 Settings", true, 600, 400)
	// create a style element and a textarea element
	let style_editor = document.createElement("style")
	let style_editor_textarea = document.createElement("textarea")
	style_editor_textarea.id = "css_editor"

	// on change to the <textarea>, change content of the >style>
	style_editor_textarea.oninput = function() {
		style_editor.textContent = style_editor_textarea.value
	}

	// never close the window, as this would remove the <style> element
	window_obj.close.onclick = close_settings_window

	// set the content of the style_editor_textarea to the settings.css file
	make_xhr("/static/css/xp/settings.css", "GET", undefined, undefined, function(url, resp) {
		style_editor_textarea.value = resp
	})

	// add <textarea> and <style>
	window_obj.body.appendChild(style_editor_textarea)
	window_obj.body.appendChild(style_editor)
	return window_obj
}

// make or unhide settings window
let settings_window = undefined
function show_settings_window() {
	if (settings_window) {
		settings_window.window.classList.remove("hidden")
		settings_window.taskbar_button.classList.remove("hidden")
	} else {
		settings_window = make_settings_window()
		add_window(settings_window)
	}
}
// The settings window can't be closed, only "hidden"
function close_settings_window() {
	settings_window.window.classList.add("hidden")
	settings_window.taskbar_button.classList.add("hidden")
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
	//window_obj.window.style.width = window_obj.width+"px"
	//window_obj.window.style.height = window_obj.height+"px"
	window_obj.body.style.width = window_obj.width+"px"
	window_obj.body.style.height = window_obj.height+"px"

	window_obj.window.style.left = window_obj.x+"px"
	window_obj.window.style.top = window_obj.y+"px"

	// update resizeable status of window
	if (window_obj.resizeable) {
		// hide/show the appropriate maximize/restore button
		if (window_obj.maximized) {
			window_obj.window.classList.remove("window-resizeable")
			window_obj.window.classList.add("window-maximized")
			window_obj.maximize.classList.add("hidden")
			window_obj.restore.classList.remove("hidden")
		} else {
			window_obj.window.classList.add("window-resizeable")
			window_obj.window.classList.remove("window-maximized")
			window_obj.maximize.classList.remove("hidden")
			window_obj.restore.classList.add("hidden")
		}
	} else {
		// no maximize/restore button for fixed-size windows
		window_obj.window.classList.remove("window-resizeable")
		window_obj.maximize.classList.add("hidden")
		window_obj.restore.classList.add("hidden")
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
	window_obj.window.classList.add("hidden")
	window_obj.taskbar_button.classList.add("hidden")
	add_window(window_obj)

	// when this iframe loads a page, show the window, rename it, and create a new "make_new_win"
	window_obj.iframe.onload = function() {
		let navigated_loc = window_obj.iframe.contentWindow.location.href
		if (navigated_loc == "about:blank") {
			return
		}
		window_obj.iframe.removeAttribute("name");
		window_obj.window.classList.remove("hidden")
		window_obj.taskbar_button.classList.remove("hidden")
		window_obj.iframe.onload = original_onload
		focus_window(window_obj)
		original_onload()
		return make_next_window()
	}
	window_obj.iframe.src = "about:blank"
}

/* Minimize/unminimize a window */
function unminimize_window(window_obj) {
	window_obj.window.classList.remove("hidden")
	window_obj.taskbar_button.classList.add("windowbutton-visible")
	window_obj.taskbar_button.onclick = function(e) {
		minimize_window(window_obj)
		e.preventDefault()
	}
}
function minimize_window(window_obj) {
	window_obj.taskbar_button.classList.remove("windowbutton-visible")
	window_obj.window.classList.add("hidden")
	window_obj.taskbar_button.onclick = function(e) {
		unminimize_window(window_obj)
		e.preventDefault()
	}
}

/* Maximize/restore a window */
function maximize_window(window_obj) {
	let maximized_width = window.innerWidth - 2
	let maximized_height = window.innerHeight - 58
	if (window_obj.restore_dimensions) { return; }
	window_obj.restore_dimensions = [window_obj.x, window_obj.y, window_obj.width, window_obj.height]
	window_obj.x = 0
	window_obj.y = 0
	window_obj.width = maximized_width
	window_obj.height = maximized_height
	window_obj.maximized = true
	update_window(window_obj)
}
function restore_window(window_obj) {
	if (!window_obj.restore_dimensions) { return; }
	window_obj.x = window_obj.restore_dimensions[0]
	window_obj.y = window_obj.restore_dimensions[1]
	window_obj.width = window_obj.restore_dimensions[2]
	window_obj.height = window_obj.restore_dimensions[3]
	window_obj.maximized = false
	window_obj.restore_dimensions = undefined
	update_window(window_obj)
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
	}
	window_obj.window.classList.remove("window-unfocused")
	if (window_obj.iframe) {
		window_obj.iframe.focus()
	} else if (window_obj.body && window_obj.body.focus) {
		window_obj.body.focus()
	}
}

// get the parsed server environment variables
let server_env = {}
function parse_env() {
	make_xhr("/cgi-bin/env.sh", "GET", undefined, undefined, function(url, resp) {
		let lines = resp.split("\n")
		lines.forEach(function(e) {
			let kv = e.split("=")
			let k = kv[0]
			let v = kv.slice(1).join("=")
			server_env[k] = v
		})
	})
}



// create the initial hidden iframe window that acts as a link target
make_next_window()

// get the server environment variables
parse_env()

