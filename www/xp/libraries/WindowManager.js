"use strict";

// create a new Window object
function Window(WM) {
	let win = this

	// window state
	win.x = WM.place_x
	win.y = WM.place_y
	win.width = 300
	win.height = 200
	win.min_width = 200
	win.min_height = 50
	win.title = "Unnamed window"
	win.icon = "🗔"
	win.systray_icon = "🗔"
	win.show_taskbar = true
	win.show_icon = true
	win.show_systray_icon = false
	win.resizeable = true
	win.minimizeable = true
	win.closeable = true
	win.minimized = false
	win.maximized = false
	win.borderless = false
	win.draggable = true
	win.greyout = false

	// update next window placement position
	WM.place_x = (WM.place_x + 50) % (window.innerWidth-win.width)
	WM.place_y = (WM.place_y + 50) % (window.innerHeight-win.height)

	// window DOM elements
	let window_elem = document.createElement("div")
	let body_elem = document.createElement("div")
	let titlebar_elem = document.createElement("div")
	let titlebar_icon_elem = document.createElement("span")
	let titlebar_text_elem = document.createElement("span")
	let titlebar_controls_elem = document.createElement("div")
	let titlebar_controls_minimize_elem = document.createElement("button")
	let titlebar_controls_maximize_elem = document.createElement("button")
	let titlebar_controls_restore_elem = document.createElement("button")
	let titlebar_controls_close_elem = document.createElement("button")
	win.elems = {
		body: body_elem,
		titlebar: titlebar_elem,
		window: window_elem,
		titlebar_icon: titlebar_icon_elem,
		titlebar_text: titlebar_text_elem,
		minimize: titlebar_controls_minimize_elem,
		maximize: titlebar_controls_maximize_elem,
		restore: titlebar_controls_restore_elem,
		close: titlebar_controls_close_elem
	}

	// add classes and put windows into proper hierarchy
	window_elem.appendChild(titlebar_elem)
	window_elem.appendChild(body_elem)
	window_elem.classList.add("window", "noselect")
	body_elem.classList.add("window-body")
	titlebar_elem.classList.add("title-bar")
	titlebar_elem.appendChild(titlebar_icon_elem)
	titlebar_elem.appendChild(titlebar_text_elem)
	titlebar_elem.appendChild(titlebar_controls_elem)
	titlebar_text_elem.classList.add("title-bar-text")
	titlebar_icon_elem.classList.add("title-bar-icon")
	titlebar_icon_elem.classList.add("icon")
	titlebar_icon_elem.classList.add("icon-16")
	titlebar_icon_elem.setAttribute("data-icon", win.icon)
	titlebar_controls_elem.classList.add("title-bar-controls")
	titlebar_controls_elem.appendChild(titlebar_controls_minimize_elem)
	titlebar_controls_elem.appendChild(titlebar_controls_maximize_elem)
	titlebar_controls_elem.appendChild(titlebar_controls_restore_elem)
	titlebar_controls_elem.appendChild(titlebar_controls_close_elem)
	titlebar_controls_minimize_elem.setAttribute("aria-label", "Minimize")
	titlebar_controls_maximize_elem.setAttribute("aria-label", "Maximize")
	titlebar_controls_restore_elem.setAttribute("aria-label", "Restore")
	titlebar_controls_close_elem.setAttribute("aria-label", "Close")

	// listen to size changes in the body and update the window size
	let body_resize_observer = new ResizeObserver(function(entries) {
		if (win.minimized) { return; }
		for (let entry of entries) {
			win.width = entry.contentRect.width
			win.height = entry.contentRect.height
			win.elems.titlebar_text.style.maxWidth = entry.contentRect.width-100+"px"
			win.push_event("resize")
		}
	})
	body_resize_observer.observe(body_elem)
	win.resize_observer = body_resize_observer

	// minimize/"_" button pressed
	titlebar_controls_minimize_elem.onclick = function() {
		win.minimize()
	}

	// maximize button pressed
	titlebar_controls_maximize_elem.onclick = function() {
		win.maximize()
	}

	// restore button pressed
	titlebar_controls_restore_elem.onclick = function() {
		win.restore()
	}

	// close/"X" button pressed
	titlebar_controls_close_elem.onclick = function() {
		if (!win.push_event("close")) {
			WM.remove_window(win)
		}
	}

	// move specified window
	win.move = function(new_x, new_y) {
		win.x = new_x
		win.y = new_y
		win.elems.window.style.left = new_x+"px"
		win.elems.window.style.top = new_y+"px"
		win.push_event("move")
	}

	// resize the specified window
	win.resize = function(new_w, new_h) {
		win.width = new_w
		win.height = new_h
		win.elems.body.style.width = new_w+"px"
		win.elems.body.style.height = new_h+"px"
	}

	// update window properties: position, dimensions, title, resizeable
	win.update = function() {
		// update dimensions
		win.move(win.x, win.y)
		win.resize(win.width, win.height)
		win.elems.body.style.minWidth = win.min_width+"px"
		win.elems.body.style.minHeight = win.min_height+"px"

		// update title and icon
		win.elems.titlebar_text.innerText = win.title
		if (win.show_icon) {
			win.elems.titlebar_icon.setAttribute("data-icon", win.icon)
			win.elems.titlebar_icon.classList.remove("hidden")
		} else {
			win.elems.titlebar_icon.classList.add("hidden")
		}

		if (win.minimizeable) {
			win.elems.minimize.classList.remove("hidden")
		} else {
			win.elems.minimize.classList.add("hidden")
		}

		if (win.closeable) {
			win.elems.close.classList.remove("hidden")
		} else {
			win.elems.close.classList.add("hidden")
		}

		// add borderless class(undecorated window: no titlebar/borders/shadow)
		if (win.borderless) {
			win.elems.window.classList.add("window-borderless")
		} else {
			win.elems.window.classList.remove("window-borderless")
		}

		// add greyout class(greyout window and disable interactions)
		if (win.greyout) {
			win.elems.window.classList.add("window-greyout")
			if (win.elems.iframe) {
				win.elems.iframe.style.pointerEvents = "none"
			}
		} else {
			win.elems.window.classList.remove("window-greyout")
			if (win.elems.iframe) {
				win.elems.iframe.style.pointerEvents = "auto"
			}
		}

		/*
		if (win.elems.iframe) {
			if (win.greyout || (!win.focused)) {
				win.elems.iframe.style.pointerEvents = "none"
			} else {
				win.elems.iframe.style.pointerEvents = "auto"
			}
		}*/

		// update maximized/resizeable status of window
		if (win.resizeable) {
			// hide/show the appropriate maximize/restore button
			if (win.maximized) {
				win.elems.window.classList.remove("window-resizeable")
				win.elems.window.classList.add("window-maximized")
				win.elems.maximize.classList.add("hidden")
				win.elems.restore.classList.remove("hidden")
			} else {
				win.elems.window.classList.add("window-resizeable")
				win.elems.window.classList.remove("window-maximized")
				win.elems.maximize.classList.remove("hidden")
				win.elems.restore.classList.add("hidden")
			}
		} else {
			// no maximize/restore button for fixed-size windows
			win.elems.window.classList.remove("window-resizeable")
			win.elems.maximize.classList.add("hidden")
			win.elems.restore.classList.add("hidden")
		}

		// hide/unhide the window
		if (win.minimized || win.hidden) {
			win.elems.window.classList.add("hidden")
		} else {
			win.elems.window.classList.remove("hidden")
		}

		// call window manager update callback if any
		if (WM.on_window_update) {
			WM.on_window_update(win)
		}

		return win
	}

	// minimize(hide) a window
	win.minimize = function() {
		win.minimized = true
		if (win.focused) {
			WM.focus_next_window()
		}
		win.update()
		win.push_event("minimize")
		return win
	}

	// unminimize(show) a window
	win.unminimize = function() {
		win.minimized = false
		WM.focus_window(win)
		win.update()
		win.push_event("unminimize")
		return win
	}

	// maximize(fullscreen) a window
	win.maximize = function() {
		let max_dims = WM.get_maximized_size()
		if (win.restore_state) { return; }
		win.restore_state = [win.x, win.y, win.width, win.height]
		win.x = 0
		win.y = 0
		win.width = max_dims[0]
		win.height = max_dims[1]
		win.maximized = true
		WM.focus_window(win)
		win.update()
		win.push_event("maximize")
		return win
	}

	// restore(unmaximize) a window
	win.restore = function() {
		if (!win.restore_state) { return; }
		win.x = win.restore_state[0]
		win.y = win.restore_state[1]
		win.width = win.restore_state[2]
		win.height = win.restore_state[3]
		win.maximized = false
		win.restore_state = undefined
		win.update()
		win.push_event("restore")
		return win
	}

	// push a window event to the user and the window manager
	win.push_event = function(ev_type, arg) {
		// inform the WM
		WM.handle_window_event(ev_type, win, arg)
		// call user callback
		if (win.handle_window_event) {
			return win.handle_window_event(ev_type, win, arg)
		}
	}

	// show a dialog window and greyout this window,
	// restore window and call dialog_ret_cb when dialog returns.
	win.dialog_show = function(dialog_url, dialog_ret_cb, no_greyout) {
		if (!no_greyout) {
			win.greyout = true
		}
		win.update()
		let dialog_win = WM.open_window(dialog_url)
		dialog_win.parent_win = win
		let _handle_window_event = win.handle_window_event
		win.handle_window_event = function(ev_type, win, arg) {
			if (ev_type=="dialog_ret") {
				WM.remove_window(dialog_win)
				if (!no_greyout) {
					win.greyout = false
				}
				win.update()
				win.handle_window_event = _handle_window_event
				if (dialog_ret_cb) {
					dialog_ret_cb(arg)
				}
			} else if (_handle_window_event) {
				_handle_window_event(ev_type, win)
			}
		}
		return dialog_win
	}
	// return from a dialog window
	win.dialog_return = function(ret) {
		win.parent_win.push_event("dialog_ret", ret)
	}

	// user callback:
	// win.handle_window_event(ev_type, win, arg)

	// update to the initial state of the title, position, dimensions
	win.update()
}

// create a new window manager object
function WindowManager(windows_elem) {
	let WM = this
	// window manager state
	WM.windows_list = []
	WM.drag_x = undefined
	WM.drag_y = undefined
	WM.place_x = 100
	WM.place_y = 100
	WM.drag_window = undefined
	WM.next_window = undefined

	// handle a mousedown event for the window container
	WM.onmousedown = function(mousedown_ev) {
		// only care about lmb
		if (mousedown_ev.button !== 0) { return }
		// check if mouse hit a window titlebar
		for (let window_obj of WM.windows_list) {
			// test if a window should be dragged
			if (!window_obj.draggable) { continue; }
			let should_drag_window =
				(
					(mousedown_ev.target == window_obj.elems.titlebar) ||
					(mousedown_ev.target == window_obj.elems.titlebar_text)
				) && (!window_obj.maximized)
			if (!should_drag_window) { continue; }
			// start dragging a window
			WM.drag_window = window_obj
			WM.focus_window(window_obj)
			WM.drag_x = mousedown_ev.clientX
			WM.drag_y = mousedown_ev.clientY
			mousedown_ev.preventDefault()
			// prevent iframe from eating mouse events while moving fast
			if (window_obj.elems.iframe) {
				window_obj.elems.iframe.style.pointerEvents = "none"
			}
			break
		}
	}

	// handle a mousemove event for the window container
	WM.onmousemove = function(mousemove_ev) {
		// only care if currently dragging a window
		if (!WM.drag_window) { return; }
		// calculate movement of window
		let delta_x = WM.drag_x-mousemove_ev.clientX
		let delta_y = WM.drag_y-mousemove_ev.clientY
		WM.drag_x = mousemove_ev.clientX
		WM.drag_y = mousemove_ev.clientY
		let pos_x = WM.drag_window.elems.window.offsetLeft - delta_x
		let pos_y = WM.drag_window.elems.window.offsetTop - delta_y
		// update window position
		WM.drag_window.x = pos_x
		WM.drag_window.y = pos_y
		WM.drag_window.elems.window.style.left = pos_x + "px"
		WM.drag_window.elems.window.style.top = pos_y + "px"
		mousemove_ev.preventDefault()
	}

	// handle a mouseup event for the window container
	WM.onmouseup = function(mouseup_ev) {
		// only care about lmb
		if (mouseup_ev.button !== 0) { return; }
		// only care if currently dragging a window
		if (!WM.drag_window) { return; }
		// stop dragging window
		if (WM.drag_window.elems.iframe) {
			WM.drag_window.elems.iframe.style.pointerEvents = "auto"
		}
		WM.drag_window = undefined
		WM.drag_x = undefined
		this.drag_y = undefined
		mouseup_ev.preventDefault()
	}

	// handle the windows_elem resized
	WM.onresize = function() {
		for (let window_obj of WM.windows_list) {
			let max_dims = WM.get_maximized_size()
			if (window_obj.maximized) {
				window_obj.resize(max_dims[0], max_dims[1])
			}
		}
	}

	// get the maximized size for windows
	WM.get_maximized_size = function() {
		let maximized_width = window.innerWidth - 2
		let maximized_height = window.innerHeight - 55
		return [maximized_width, maximized_height]
	}


	// create the window_obj structure:
	// all HTML elements for the window, and JS state for the window.
	WM.make_window_obj = function() {
		// create all needed (sub-)elements
		return new Window(WM)
	}

	// create a window_obj with an iframe body
	WM.make_iframe_window = function() {
		let window_obj = WM.make_window_obj()
		// add an iframe element to the window_obj
		let iframe_elem = document.createElement("iframe")
		iframe_elem.classList.add("window-body-iframe")
		window_obj.elems.iframe = iframe_elem
		window_obj.elems.body.appendChild(iframe_elem)
		// called when the iframe loads a new page
		iframe_elem.onload = function() {
			// put win and WM into the loaded iframe window
			iframe_elem.contentWindow.win = window_obj
			iframe_elem.contentWindow.WM = WM
			// call win_load in iframe if present
			if (iframe_elem.contentWindow.win_load) {
				iframe_elem.contentWindow.win_load()
			}
			// register win_ev from iframe as handle_window_event if present
			if (iframe_elem.contentWindow.win_ev) {
				window_obj.handle_window_event = iframe_elem.contentWindow.win_ev
			}
			// call window on_iframe_load callback if present
			if (window_obj.on_iframe_load) {
				window_obj.on_iframe_load()
			}
			// close window when the iframe loads about:blank#close
			if  (iframe_elem.contentWindow.location.href == "about:blank#close") {
				WM.remove_window(window_obj)
			}
		}
		return window_obj
	}

	// pre-create the hidden next window
	WM.make_next_win = function() {
		// create a new hidden window
		let next_win = WM.make_iframe_window()
		next_win.elems.window.classList.add("hidden")
		next_win.elems.iframe.name = "make_new_win"
		this.next_window = next_win

		// when pre-created window is loaded transform hidden window into regular window
		let orig_onload = next_win.elems.iframe.onload
		next_win.elems.iframe.onload = function() {
			if  (next_win.elems.iframe.contentWindow.location.href == "about:blank") {
				return;
			}
			next_win.elems.window.classList.remove("hidden")
			next_win.elems.iframe.removeAttribute("name")
			next_win.elems.iframe.onload = orig_onload
			// add window object to windows_list
			WM.add_window(next_win, true)
			// pre-create the next window
			WM.make_next_win()
			next_win.elems.iframe.onload()
		}

		// add to DOM and apply fix for links
		windows_elem.appendChild(next_win.elems.window)
		fix_link_targets_iframe()

		return next_win
	}

	// add a window(show it)
	WM.add_window = function(window_obj, no_dom_append) {
		WM.windows_list.push(window_obj)
		if (!no_dom_append) {
			windows_elem.appendChild(window_obj.elems.window)
		}
		WM.focus_window(window_obj)
		window_obj.added_index = WM.windows_list.length
		WM.push_event("add", window_obj)
		return window_obj
	}

	// open a new window with the specified URL, return created window object
	WM.open_window = function(window_url) {
		let window_obj = WM.make_iframe_window()
		window_obj.elems.iframe.src = window_url
		return WM.add_window(window_obj)
	}

	// remove a window(close it)
	WM.remove_window = function(window_obj) {
		// remove from list of windows
		var index = WM.windows_list.indexOf(window_obj)
		if (index !== -1) {
			WM.windows_list.splice(index, 1);
		}
		// remove from DOM
		window_obj.elems.window.remove()
		WM.focus_next_window()
		WM.push_event("remove", window_obj)
		return window_obj
	}

	// focus a window
	WM.focus_window = function(window_obj) {
		// unfocus all other windows
		for (let win_obj of WM.windows_list) {
			if (win_obj !== window_obj) {
				win_obj.elems.window.classList.add("window-unfocused")
				win_obj.focused = false
			}
		}
		window_obj.focused = true
		// move window to top of window list
		WM.windows_list.splice(WM.windows_list.indexOf(window_obj), 1)[0]
		WM.windows_list.unshift(window_obj)
		// adjust z-index for all windows
		for (let i=0; i<WM.windows_list.length; i++) {
			let win_obj = WM.windows_list[i]
			win_obj.elems.window.style.zIndex = 1000 + (WM.windows_list.length-i) * 100
		}
		// focus the window
		window_obj.elems.window.classList.remove("window-unfocused")
		if (window_obj.elems.iframe) {
			window_obj.elems.iframe.focus()
		} else if (window_obj.elems.body && window_obj.elems.body.focus) {
			window_obj.elems.body.focus()
		}
		WM.push_event("focused", window_obj)
	}

	// focus any visible window(e.g. after close or minimize)
	WM.focus_next_window = function() {
		for (let i=0; i<WM.windows_list.length; i++) {
			let win_obj = WM.windows_list[i]
			if (!win_obj.minimized) {
				WM.focus_window(win_obj)
				return
			}
		}
		// no focusable window, unfocus all windows
		for (let win_obj of WM.windows_list) {
			win_obj.elems.window.classList.add("window-unfocused")
			win_obj.focused = false
		}
	}

	// handle a window_event from a window_obj
	WM.handle_window_event = function(ev_type, window_obj, arg) {
		WM.push_event(ev_type, window_obj, arg)
	}

	// push a WM event to the parent integration
	WM.push_event = function(ev_type, arg) {
		if (WM.handle_wm_event) {
			WM.handle_wm_event(ev_type, arg)
		}
	}
}
