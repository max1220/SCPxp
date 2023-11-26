"use strict";

let cgi_commands = new CgiCommands(CGI_BACKEND)
let file_manager = new FileManager(cgi_commands)
let message_box = new MessageBox()

let args = SEARCH_PARMS
let c_selected = undefined
let c_directory = undefined

function directory_onchange() {
	let directory_elem = document.getElementById("directory")
	c_directory = directory_elem.value
	if (c_directory=="") { c_directory = undefined }
	refresh_directory_content()
}
function filename_onchange() {
	let filename_elem = document.getElementById("filename")
	c_selected = filename_elem.value
	if (c_selected=="") { c_selected = undefined }
	refresh_directory_content()
}
function filename_onkeydown() {
	if (event.key=="Enter") { btn_confirm(); }
}

function refresh_directory_content() {
	document.getElementById("directory").value = c_directory || ""
	document.getElementById("filename").value = c_selected || ""
	if (!c_directory) { return; }
	let directory_content = file_manager.list(c_directory, 1, false, args.show_hidden, false, false, false, true)
	console.log("refresh",c_directory, c_selected, directory_content)

	let directory_view_elem = document.getElementById("directory_view")
	directory_view_elem.innerHTML = ""

	let entry_elem = document.createElement("div")
	entry_elem.classList.add("icon")
	entry_elem.classList.add("icon-16")
	entry_elem.setAttribute("data-icon", "action-up")
	entry_elem.innerText = ".."
	entry_elem.ondblclick = function() {
		c_directory = file_manager.basedir(c_directory)
		c_selected = undefined
		refresh_directory_content()
	}
	directory_view_elem.appendChild(entry_elem)

	let show_only_file_types
	if (args.show_only_file_types !== undefined) {
		show_only_file_types = args.show_only_file_types.split(",")
	}
	if ((!directory_content) || (!directory_content.contents)) { return; }

	for (let i=0; i<directory_content.contents.length; i++) {
		let entry = directory_content.contents[i]
		//console.log("entry",i,entry)
		entry_elem = document.createElement("div")
		entry_elem.classList.add("icon")
		entry_elem.classList.add("icon-16")
		entry_elem.innerText = file_manager.basename(entry.name)
		directory_view_elem.appendChild(entry_elem)
		if (entry.name == c_selected) {
			entry_elem.classList.add("selected")
		}
		if (entry.type == "directory") {
			entry_elem.ondblclick = function() {
				c_directory = entry.name
				c_selected = undefined
				refresh_directory_content()
			}
			entry_elem.setAttribute("data-icon", "file-directory")
		} else {
			entry_elem.onclick = function() {
				c_selected = file_manager.basename(entry.name)
				refresh_directory_content()
				HTML_ELEM.filename.focus()
			}
			entry_elem.ondblclick = function() {
				c_selected = entry.name
				btn_confirm()
			}
			let file_extension = entry.name.split(".").pop()
			let file_type = file_manager.file_extension_to_file_type[file_extension]
			if (file_type) {
				let icon = file_manager.file_type_to_icon[file_type]
				entry_elem.setAttribute("data-icon", icon)
			} else {
				entry_elem.setAttribute("data-icon", "file-generic")
			}
			if (show_only_file_types && (!show_only_file_types.includes(file_type))) {
				//console.log("show_only_file_types",show_only_file_types)
				entry_elem.classList.add("hidden")
			}
		}
	}
}

function btn_confirm() {
	if (args.filename_required=="true") {
		if (!c_selected || (c_selected=="")) { return; }
		let file_path = c_selected.startsWith("/") ? c_selected : (c_directory + "/" + c_selected)
		win.dialog_return(["confirm", file_path, c_directory])
	} else {
		// allow any filename
		// (or none for directory selection with filename_label=hidden)
		win.dialog_return(["confirm", c_selected, c_directory])
	}
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
	win.title = "Open File..."
	win.icon = "file-directory"
	win.resize(400, 400)

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

	if (args.directory_label == "hidden") {
		document.getElementById("directory_label").classList.add("hidden")
	} else if (args.directory_label !== undefined) {
		document.getElementById("directory_label").innerText = args.directory_label
	}
	if (args.filename_label == "hidden") {
		document.getElementById("filename_label").classList.add("hidden")
	} else if (args.filename_label !== undefined) {
		document.getElementById("filename_label").innerText = args.filename_label
	}

	if (args.directory !== undefined) {
		c_directory = args.directory
	} else {
		c_directory = cgi_commands.get_env()["HOME"]
	}
	if (args.selected !== undefined) {
		c_selected = args.selected
	}

	win.update()
	refresh_directory_content()
}
