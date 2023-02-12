/* --- ELEMENTS --- */

let text_content_elem = document.getElementById("text_content")
let status_left_elem = document.getElementById("status_left")
let status_middle_elem = document.getElementById("status_left")
let status_right_elem = document.getElementById("status_left")
let open_file_path_elem = document.getElementById("open_file_path")
let saveas_file_path_elem = document.getElementById("saveas_file_path")
let preview_content_elem = document.getElementById("preview_content")


/* --- GLOBAL STATE --- */

let current_file_path = undefined
let has_changes = true



/* --- UTILLITY FUNCTIONS --- */

// update the status bar element
function update_statusbar(special_text) {
	let text = text_content_elem.value
	let lines = text.split("\n")
	let sel_start = text_content_elem.selectionStart
	let current_lineno = text.substr(1, sel_start-1).split("\n").length
	let size_text = "Length: " + text.length + ", Lines: " + lines.length
	let cursor_text = "Position: " + sel_start + ", Line: " + current_lineno
	status_left_elem.innerHTML = special_text || current_file_path || "(new file)"
	status_middle_elem.innerHTML = size_text
	status_right_elem.innerHTML = cursor_text
}

// update the preview
function update_preview() {
	if (preview_content_elem.classList.contains("hidden")) {
		preview_content_elem.innerHTML = ""
	} else {
		preview_content_elem.innerHTML = text_content_elem.value
	}
}


/* --- File I/O --- */

function open_file(open_file_path, cb) {
	console.log("Opening...",open_file_path)
	return make_xhr(
		"/cgi-bin/file/read_file.sh?file_path=" + encodeURIComponent(open_file_path),
		"GET",
		"application/x-www-form-urlencoded",
		"",
		function(url, resp) {
			console.log("Opened!")
			current_file_path = open_file_path
			window.location.hash = encodeURIComponent(open_file_path)
			text_content_elem.value = resp
			update_statusbar("Opened ",open_file_path,resp)
			has_changes = false
			if (cb) { cb(); }
		}
	)
}

function save(save_file_path, cb) {
	let req_body =
		"file_path=" + encodeURIComponent(save_file_path) +
		"&data=" + encodeURIComponent(text_content_elem.value)
	return make_xhr(
		"/cgi-bin/file/write_file.sh",
		"POST",
		"application/x-www-form-urlencoded",
		req_body,
		function(url, resp) {
			let decoded_obj = JSON.parse(resp)
			if (decoded_obj && decoded_obj.success) {
				console.log("Save resp:", resp)
				current_file_path = save_file_path
				window.location.hash = encodeURIComponent(save_file_path)
				has_changes = false
				update_statusbar("Saved "+ resp.new_bytes + "bytes!")
				if (cb) { cb(); }
			}
		}
	)
}



/* --- BUTTON HANDLERS --- */

function btn_save() {
	console.log("current_file_path",current_file_path)
	if (!current_file_path) {
		show_popup("saveas-window")
	} else {
		save(current_file_path)
	}
}

function btn_open() {
	let open_file_path = open_file_path_elem.value
	open_file(open_file_path, function() {
		close_popup()
	})
}

function btn_saveas() {
	let saveas_file_path = saveas_file_path_elem.value
	save(saveas_file_path, function() {
		close_popup()
	})
}

function btn_toggle_preview() {
	if (preview_content_elem.classList.contains("hidden")) {
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
function btn_toggle_wrap() {
	text_content_elem.classList.toggle("nowrap")
}

/* --- GLOBAL EVENT HANDLERS --- */

function text_content_on_change() {
	update_statusbar()
	update_preview()
	has_changes = true
}
text_content_elem.onchange = text_content_on_change
text_content_elem.onkeyup = text_content_on_change



/* --- HASH NAVIGATION --- */

if (window.location.hash.substr(1) !== "") {
	open_file(decodeURIComponent(window.location.hash.substr(1)))
}
