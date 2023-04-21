let state = new AppState({})

// the URL of the directory tree on the left side
state.add_key_parameters("file_path", "text", true, true);
state.add_key_parameters("linewrap", "boolean", true, true);
state.add_key_parameters("preview", "boolean", true, true);
state.add_key_parameters("modified", "boolean", false, false);
state.add_key_parameters("preview_markdown", "boolean", true, true);

let cgi_commands = new CgiCommands("/cgi-bin/cgi_command.sh")
let file_manager = new FileManager(cgi_commands)


/* --- ELEMENTS --- */

let text_content_elem = document.getElementById("text_content")
let preview_content_elem = document.getElementById("preview_content")



/* --- UTILLITY FUNCTIONS --- */

// update the status bar element
function update_statusbar(special_text) {
	let text = text_content_elem.value
	let lines = text.split("\n")
	let sel_start = text_content_elem.selectionStart
	let current_lineno = text.substr(1, sel_start-1).split("\n").length
	let size_text = `Length: ${text.length}, Lines: ${lines.length}`
	let cursor_text = `Position: ${sel_start}, Line: ${current_lineno}`
	document.getElementById("status_left").innerText = special_text || state.data.file_path
	document.getElementById("status_middle").innerText = cursor_text
	document.getElementById("status_right").innerText = size_text
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
	if (state.data.preview_markdown) {
		preview_content_elem.srcdoc = markdown_to_html(text_content_elem.value)
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
function load_file(open_file_path) {
	preview_needs_update = true
	if (state.data.modified) {
		if (!prompt_unsaved()) { return; }
	}
	if (!file_manager.test.read(open_file_path)) {
		alert("Can't read file: " + open_file_path)
		return
	}
	cgi_commands.run_command_async(function(resp) {
		state.data.file_path = open_file_path
		text_content_elem.value = resp
		update_statusbar("Opened file: "+open_file_path)
		state.data.modified = false
	}, ["cat", open_file_path])
}

// save the specified content to save_file_path, then re-load
function save(content, save_file_path) {
	file_manager.upload_file_base64(btoa(content), save_file_path, function() {
		update_statusbar("Saved file: "+save_file_path)
		state.data.modified = false
		// try to load the now-saved file
		load_file(save_file_path)
	})
}

// show the save-as dialog, and save current content when confirmed
function prompt_saveas() {
	return prompt("Please enter a file path for saving:")
}
function prompt_open() {
	return prompt("Please enter a file path for opening:")
}
function prompt_unsaved() {
	return confirm("You have unsaved changes that will be lost. Continue?")
}

/* --- BUTTON HANDLERS --- */

// save the current file content to current file path(ask if none)
function btn_save() {
	if (!state.data.file_path || (state.data.file_path=="")) {
		// No file path specified yet, show the save-as dialog
		let save_path = prompt_saveas()
		if (save_path && (save_path!=="")) {
			save(get_text(), save_path)
		}
	} else {
		// save under current file path
		save(get_text(), state.data.file_path)
	}
}

// save the file under a new file path
function btn_saveas() {
	let save_path = prompt_saveas()
	if (save_path && (save_path!=="")) {
		save(get_text(), save_path)
	}
}

// open from a file path
function btn_open() {
	if (state.data.modified) {
		if (!prompt_unsaved()) { return; }
	}
	load_file(prompt_open())
}

// Reset the editor to the new-file state
function btn_new() {
	if (state.data.modified) {
		if (!prompt_unsaved()) { return; }
	}
	state.data.file_path = ""
	text_content_elem.value = ""
	update_statusbar("New file")
	state.data.modified = false
}

// re-load the current file path from disk
function btn_reload() {
	if (state.data.file_path && (state.data.file_path!=="")) {
		load_file(state.data.file_path)
	}
}

// close the editor(ask about unsaved changes)
function btn_close() {
	if (state.data.modified) {
		if (!prompt_unsaved()) { return; }
	}
	return open("about:blank#close")
}

// update the preview enable state
function checkbox_preview() {
	console.log("checkbox_preview")
	if (state.data.preview) {
		preview_content_elem.classList.remove("hidden")
		text_content_elem.style.width = "50%"
		text_content_elem.style.resize = "horizontal"
	} else {
		preview_content_elem.classList.add("hidden")
		text_content_elem.style.width = "100%"
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



/* --- INITIALIZATION --- */

function body_onload() {
	// load the initial configuration values from the HTML data,
	// by calling all onchange functions for input elements with the data-update attribute.
	state.key_to_updater["preview"] = checkbox_preview
	state.key_to_updater["linewrap"] = checkbox_linewrap

	console.log("Loading state...")
	state.load()
	console.log("Loaded state:", state.data)

	// load initial file path (from URL) if any
	if (state.data.file_path && (state.data.file_path!=="")) {
		load_file(state.data.file_path)
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
