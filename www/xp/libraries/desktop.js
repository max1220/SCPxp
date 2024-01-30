"use strict";

var WM = new WindowManager(document.getElementById("windows"))

// generate element from window_obj
function generate_window_button(window_obj) {
	let window_button = document.createElement("button")
	window_button.classList.add("windowbutton")

	if (window_obj.focused) {
		window_button.classList.add("windowbutton-visible")
	} else {
		window_button.classList.remove("windowbutton-visible")
	}

	// add the icon if any
	if (window_obj.show_icon) {
		let window_button_icon = document.createElement("span")
		window_button_icon.classList.add("windowbutton-icon")
		window_button_icon.classList.add("icon")
		window_button_icon.classList.add("icon-16")
		window_button_icon.setAttribute("data-icon", window_obj.icon)
		window_button.appendChild(window_button_icon)
	}

	let window_button_text = document.createElement("span")
	window_button_text.classList.add("windowbutton-text")
	window_button_text.innerText = window_obj.title
	window_button.appendChild(window_button_text)

	window_button.onclick = function() {
		if (window_obj.minimized) {
			window_obj.unminimize()
		} else {
			window_obj.minimize()
		}
	}

	return window_button
}

// re-create all window buttons
function update_window_buttons() {
	// remove old window buttons
	let old_windowbuttons = document.querySelectorAll(".windowbutton")
	old_windowbuttons.forEach(function(old_windowbutton) {
		old_windowbutton.remove()
	})
	// get list of window buttons
	let window_buttons = []
	for (let window_obj of WM.windows_list) {
		if (window_obj.show_taskbar) {
			window_buttons.push({
				btn: generate_window_button(window_obj),
				i: window_obj.added_index
			})
		}
	}
	// sort by added index
	window_buttons = window_buttons.sort(function(a,b) {
		return a.i - b.i
	})
	// add to DOM
	let windowlist_elem = document.getElementById("windowlist")
	for (let entry of window_buttons) {
		windowlist_elem.appendChild(entry.btn)
	}
}

// update window buttons on window manager events
WM.handle_wm_event = function(ev_type, arg) {
	//console.log("wm_event", ev_type, arg)
	// TODO: Only update when needed
	update_window_buttons()
	update_systray_icons()
}


// generate element from a desktop_icon
function generate_desktop_icon_elem(desktop_icon) {
	let desktop_icon_link_elem = document.createElement("a")
	if (desktop_icon.href) {
		desktop_icon_link_elem.href = desktop_icon.href
	}
	if (desktop_icon.onclick) {
		desktop_icon_link_elem.onclick = desktop_icon.onclick
	}
	desktop_icon_link_elem.target = desktop_icon.make_new_win ? "make_new_win" : "_blank"
	desktop_icon_link_elem.classList.add("desktop-icon")

	let desktop_icon_icon_elem = document.createElement("span")
	desktop_icon_icon_elem.classList.add("desktop-icon-icon")
	desktop_icon_icon_elem.classList.add("icon")
	desktop_icon_icon_elem.classList.add("icon-32")
	desktop_icon_icon_elem.setAttribute("data-icon", desktop_icon.icon)

	let desktop_icon_text_elem = document.createElement("span")
	desktop_icon_text_elem.classList.add("desktop-icon-text")
	desktop_icon_text_elem.innerText = desktop_icon.text

	desktop_icon_link_elem.appendChild(desktop_icon_icon_elem)
	desktop_icon_link_elem.appendChild(desktop_icon_text_elem)

	return desktop_icon_link_elem
}

// re-create all desktop icons from DESKTOP_ICONS array
function update_desktop_icons() {
	let old_icons = document.querySelectorAll(".desktop-icon")
	old_icons.forEach(function(old_icon) {
		old_icon.remove()
	})
	for (let i=0; i<DESKTOP_ICONS.length; i++) {
		let desktop_icon = DESKTOP_ICONS[i]
		let desktop_icon_elem = generate_desktop_icon_elem(desktop_icon)
		let windows_elem = document.getElementById("desktop")
		//windows_elem.insertBefore(desktop_icon_elem, windows_elem.firstChild)
		windows_elem.appendChild(desktop_icon_elem)//, windows_elem.firstChild)
	}
}

// generate element from a startmenu_item
function generate_startmenu_item_elem(startmenu_item) {
	let startmenu_item_elem
	if (startmenu_item.spacer) {
		startmenu_item_elem = document.createElement("div")
		startmenu_item_elem.classList.add("start-menu-spacer")
	} else {
		startmenu_item_elem = document.createElement("a")
		startmenu_item_elem.href = startmenu_item.url
		startmenu_item_elem.target = startmenu_item.new_tab ? "_blank" : "make_new_win"
		startmenu_item_elem.classList.add("start-menu-item")
		startmenu_item_elem.onclick = hide_start_menu

		let startmenu_item_icon_elem = document.createElement("span")
		startmenu_item_icon_elem.classList.add("start-menu-item-icon")
		startmenu_item_icon_elem.classList.add("icon")
		startmenu_item_icon_elem.classList.add("icon-16")
		startmenu_item_icon_elem.setAttribute("data-icon", startmenu_item.icon)

		let startmenu_item_text_elem = document.createElement("span")
		startmenu_item_text_elem.classList.add("start-menu-item-text")
		startmenu_item_text_elem.innerText = startmenu_item.text

		startmenu_item_elem.appendChild(startmenu_item_icon_elem)
		startmenu_item_elem.appendChild(startmenu_item_text_elem)
	}

	return startmenu_item_elem
}

// re-create all startmenu items from START_MENU array
function update_startmenu_items() {
	let old_items = document.querySelectorAll(".start-menu-spacer,start-menu-item")
	old_items.forEach(function(old_item) {
		old_item.remove()
	})
	for (let i=0; i<START_MENU.length; i++) {
		let startmenu_item = START_MENU[i]
		let startmenu_item_elem = generate_startmenu_item_elem(startmenu_item)
		document.getElementById("start-menu").appendChild(startmenu_item_elem)
	}
}


// generate element from window_obj
function generate_systray_icon(window_obj) {
	let systray_icon_elem = document.createElement("span")
	systray_icon_elem.classList.add("systray-icon")
	systray_icon_elem.classList.add("icon")
	systray_icon_elem.classList.add("icon-16")
	systray_icon_elem.setAttribute("data-icon", window_obj.systray_icon)
	systray_icon_elem.onclick = function() {
		window_obj.push_event("systray")
	}
	return systray_icon_elem
}

// re-create all systray icons
function update_systray_icons() {
	// remove old systray icons
	let old_systray_icons = document.querySelectorAll(".systray-icon")
	old_systray_icons.forEach(function(old_systray_icon) {
		old_systray_icon.remove()
	})
	// get list of window buttons
	let systray_icons = []
	for (let window_obj of WM.windows_list) {
		if (window_obj.show_systray_icon) {
			systray_icons.push({
				icon_elem: generate_systray_icon(window_obj),
				i: window_obj.added_index
			})
		}
	}
	// sort by added index
	systray_icons.sort(function(a,b) {
		return a.i - b.i
	})
	// add to DOM
	let systray_elem = document.getElementById("systray")
	for (let entry of systray_icons) {
		systray_elem.appendChild(entry.icon_elem)
	}
}






let start_buttton_elem = document.getElementById("start-button")
let start_menu_elem = document.getElementById("start-menu")

// onclick handlers for showing/hiding the start menu
start_buttton_elem.onclick = show_start_menu
function show_start_menu() {
	if (start_menu_elem.classList.contains("hidden")) {
		start_menu_elem.classList.remove("hidden")
		start_buttton_elem.onclick = hide_start_menu
	}
}
function hide_start_menu() {
	if (!start_menu_elem.classList.contains("hidden")) {
		start_menu_elem.classList.add("hidden")
		start_buttton_elem.onclick = show_start_menu
	}
}

function update_clock() {
	let currentdate = new Date()
	//let time_str = currentdate.getHours().toString().padStart(2, "0") + ":" + currentdate.getMinutes().toString().padStart(2, "0") + ":" + currentdate.getSeconds().toString().padStart(2, "0")
	let time_str = currentdate.getHours().toString().padStart(2, "0") + ":" + currentdate.getMinutes().toString().padStart(2, "0")
	document.getElementById("clock").innerHTML = time_str
}

// update the clock in the taskbar
//setInterval(update_clock, 1000);
setInterval(update_clock, 60000);

// emulate mouse events from touch events(no multi-touch)
function make_touchable(elem) {
	elem.ontouchstart = function(e) {
		let t = e.touches[0]
		//let target = e.touches[0].target
		let target = document.elementFromPoint(t.pageX, t.pageY)
		WM.onmousedown({
			button: 0,
			target: target,
			clientX: t.clientX,
			clientY: t.clientY,
			preventDefault: function() { e.preventDefault(); }
		})
	}
	elem.ontouchmove = function(e) {
		WM.onmousemove({
			clientX: e.touches[0].clientX,
			clientY: e.touches[0].clientY,
			preventDefault: function() { e.preventDefault(); }
		})
	}
	elem.ontouchend = function(e) {
		WM.onmouseup({
			button: 0,
			preventDefault: function() { e.preventDefault(); }
		})
	}
}

function load() {
	// prepare window manager
	WM.make_next_win()

	// create desktop and start menu entries
	update_startmenu_items()
	update_desktop_icons()

	update_clock()

	let windows_elem = document.getElementById("windows")

	// add mouse input handlers
	windows_elem.onmousedown = WM.onmousedown
	windows_elem.onmousemove = WM.onmousemove
	windows_elem.onmouseup = WM.onmouseup
	make_touchable(windows_elem)

	// register resize handler
	window.onresize = function() {
		console.log("onresize")
		WM.onresize()
	}

}
