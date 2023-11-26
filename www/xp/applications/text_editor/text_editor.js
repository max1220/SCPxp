"use strict";

let state = new AppState({})

// the URL of the directory tree on the left side
state.add_key_parameters("file_path", "text", true, true);
state.add_key_parameters("linewrap", "boolean", true, true);
state.add_key_parameters("preview", "boolean", true, true);
state.add_key_parameters("modified", "boolean", false, false);
state.add_key_parameters("preview_markdown", "boolean", true, true);

let cgi_commands = new CgiCommands(CGI_BACKEND)
let file_manager = new FileManager(cgi_commands)
let message_box = new MessageBox()


/* --- ELEMENTS --- */

let text_content_elem = document.getElementById("text_content")
let preview_content_elem = document.getElementById("preview_content")



/* --- UTILLITY FUNCTIONS --- */

// update the status bar element
function update_statusbar(special_text) {
	let text = text_content_elem.value
	let lines = text.split(/\r?\n/)
	let sel_start = text_content_elem.selectionStart
	let current_lineno = text.substr(1, sel_start-1).split(/\r?\n/).length
	let size_text = `Len: ${text.length}, #lines: ${lines.length}`
	let cursor_text = `Pos: ${sel_start}, @line: ${current_lineno}`
	document.getElementById("status_left").innerText = special_text || state.data.file_path
	document.getElementById("status_middle").innerText = cursor_text
	document.getElementById("status_right").innerText = size_text
	if (special_text) { console.log("STATUS:",special_text) }
}

// render the specified markdown_source as HTML
// TODO: This could use a client-side implementation
function markdown_to_html(markdown_str) {
	let cmd = cgi_commands.encode_command(["cmark", "--safe", "-t", "html"])
	let html_str = cgi_commands.run_encoded_sync(cmd, markdown_str)
	return html_str
}

// update the preview
let preview_needs_update = false
function update_preview() {
	if (preview_content_elem.classList.contains("hidden")) { return; }
	if (!preview_needs_update) { return; }

	let file_type = file_manager.path_to_file_type(state.data.file_path)
	console.log("Preview file type:",file_type)
	if (file_type == "markdown") {
		preview_content_elem.srcdoc = markdown_to_html(text_content_elem.value)
	} else if (file_type == "web") {
		preview_content_elem.srcdoc = text_content_elem.value
	} else if (file_type == "script") {
		preview_content_elem.removeAttribute("srcdoc")
		preview_content_elem.src = "/xp/applications/text_editor/run_script.html?command_str="+encodeURIComponent(state.data.file_path)
	} else {
		preview_content_elem.srcdoc = text_content_elem.value
	}
	preview_needs_update = false
}

// get the current editor text
function get_text() {
	return text_content_elem.value
}

// load a file from the specified file path
function load_file(open_file_path, cb) {
	preview_needs_update = true
	prompt_unsaved(function() {
		if (!file_manager.test.read(open_file_path)) {
			if (cb) { cb(); }
			message_box.show_message_box_info({
				win_title: "Warning",
				win_icon: "generic-warning",
				main_text: "Warning: Can't read file: " + open_file_path,
				greyout: true,
			})
			return
		}
		cgi_commands.run_command_async(function(resp) {
			state.data.file_path = open_file_path
			text_content_elem.value = resp
			update_statusbar("Opened file: "+open_file_path)
			state.data.modified = false
			update_preview()
			if (cb) { cb(); }
		}, ["cat", open_file_path])
	})
}

// save the specified content to save_file_path, then re-load
function save(content, save_file_path, cb) {
	file_manager.upload_file_base64(btoa(content), save_file_path, function() {
		update_statusbar("Saved file: "+save_file_path)
		state.data.modified = false
		// try to load the now-saved file
		load_file(save_file_path, cb)
	})
}

// show the save-as dialog, and save current content when confirmed
function prompt_saveas(cb) {
	message_box.show_message_box_file({
		win_title: "Save file...",
		main_text: "Please select the filename to save the current document as:",
		show_only_file_types: "text,markdown,web,script",
		greyout: true,
	}, cb)
}
function prompt_open(cb) {
	message_box.show_message_box_file({
		win_title: "Open file...",
		main_text: "Please select the filename to open as the new current document:",
		show_only_file_types: "text,markdown,web,script",
		greyout: true,
	}, cb)
}
function prompt_unsaved(cb) {
	if (state.data.modified) {
		message_box.show_message_box_info({
			win_title: "Unsaved changes",
			win_size: "300x100",
			main_text: "You have unsaved changes that will be lost.\nDo you wish to save your changes?",
			confirm_button: "Save changes",
			cancel_button: "Discard changes",
			greyout: true,
		}, function(ret) {
			if (ret == "confirm") {
				btn_save(cb)
			} else {
				cb()
			}
		})
	} else {
		cb()
	}
}

/* --- BUTTON HANDLERS --- */

// save the current file content to current file path(ask if none)
function btn_save(cb) {
	if (!state.data.file_path || (state.data.file_path=="")) {
		// No file path specified yet, show the save-as dialog
		btn_saveas(cb)
	} else {
		// save under current file path
		save(get_text(), state.data.file_path, cb)
	}
}

// save the file under a new file path
function btn_saveas(cb) {
	prompt_saveas(function(ret) {
		if ((ret[0] == "confirm") && (ret[1] !== "")) {
			save(get_text(), ret[1], cb)
		} else {
			if (cb) { cb(); }
			message_box.show_message_box_info({
				win_title: "Warning",
				win_icon: "generic-warning",
				main_text: "Warning: Document was not saved!"
			})
		}
	})
}

// open from a file path
function btn_open() {
	prompt_open(function(ret) {
		if ((ret[0]=="confirm") && (ret[1] !== "")) {
			load_file(ret[1])
		}
	})
}

// Reset the editor to the new-file state
function btn_new() {
	prompt_unsaved(function() {
		state.data.file_path = ""
		text_content_elem.value = ""
		update_statusbar("New file")
		update_preview()
		state.data.modified = false
	})
}

// re-load the current file path from disk
function btn_reload() {
	if (state.data.file_path && (state.data.file_path!=="")) {
		load_file(state.data.file_path)
	}
}

// close the editor(ask about unsaved changes)
function btn_close() {
	prompt_unsaved(function() { open("about:blank#close") })
}

// update the preview enable state
function checkbox_preview() {
	console.log("checkbox_preview")
	if (state.data.preview) {
		preview_content_elem.classList.remove("hidden")
		//text_content_elem.style.width = "50%"
		text_content_elem.style.resize = "horizontal"
	} else {
		preview_content_elem.classList.add("hidden")
		//text_content_elem.style.width = "100%"
		text_content_elem.style.resize = "none"
	}
	update_preview()
}

// update the line wrapping enable state
function checkbox_linewrap() {
	if (state.data.linewrap) {
		text_content_elem.classList.remove("nowrap")
	} else {
		text_content_elem.classList.add("nowrap")
	}
}

// update preview, statusbar, modified when text content changes
function text_content_on_change() {
	update_statusbar()
	state.data.modified = true
	preview_needs_update = true
}

function btn_about() {
	message_box.show_message_box_info({
		win_icon: "application-text-editor",
		win_size: "300x250",
		win_title: "About Text Editor",
		title_text: "About Text Editor",
		title_icon: "application-text-editor",
		main_html: `
		A simple text editor.
		<ul>
			<li>generic CGI backend written in Bash</li>
			<li>front-end written in vanilla javascript</li>
		</ul>
		`,
		okay_button: "Close",
		greyout: false,
	})
}

function win_ev(ev_type) {
	console.log("XXX ev_type",ev_type)
	if ((ev_type == "close") && state.data.modified) {
		prompt_unsaved(function() {
			WM.remove_window(win)
		})
		return true
	}
}

function win_load() {
	win.title = "Text editor"
	win.icon = "application-text-editor"
	win.resize(640, 480)
	win.update()
}

/* --- INITIALIZATION --- */
function onload() {
	// load the initial configuration values from the HTML data,
	// by calling all onchange functions for input elements with the data-update attribute.
	state.key_to_updater["preview"] = checkbox_preview
	state.key_to_updater["linewrap"] = checkbox_linewrap

	console.log("Loading state...")
	state.load()
	console.log("Loaded state:", state.data)

	// load initial file path (from URL) if any
	if (state.data.file_path && (state.data.file_path!=="")) {
		let file_type = file_manager.path_to_file_type(state.data.file_path)
		let preview_file_types = ["web","script","markdown"]
		if (preview_file_types.includes(file_type)) {
			state.data.preview = true
		}

		// enable preview if known file type
		load_file(state.data.file_path, update_preview)
	} else {
		btn_new()
	}

	// register handlers for text element
	text_content_elem.onchange = text_content_on_change
	text_content_elem.onkeyup = text_content_on_change

	// start updating the preview
	setInterval(function() {
		update_preview()
	}, 1000)

	// warn the user when leaving the website would result in loosing unsaved changes
	window.addEventListener("beforeunload", function (e) {
		console.log("beforeunload", e)
		if (state.data.modified) {
			e.returnValue = "You have unsaved changes that will be lost. Continue?"
			return "You have unsaved changes that will be lost. Continue?"
		}
	})
}
