// create an application state object with some defaults
let state_obj = {}
let state = new AppState(state_obj)
// register the known state parameters with types for automatic error checking and serialization
function register_state_parameters() {
	function add_serialize(key, type) {
		state.add_key_parameters(key, type, true, true);
	}
	function add_internal(key, type, default_val) {
		state.add_key_parameters(key, type, true, false);
		if (default_val!==undefined) { state_obj[key] = default_val }
	}
	// the URL of the directory tree on the left side
	add_serialize("tree_path", "text")

	// the URL of the direcotry and files table on the right
	add_serialize("content_path", "text")

	// the current display settings for the content window
	add_serialize("content_human_readable", "boolean")
	add_serialize("content_dirfirst", "boolean")
	add_serialize("content_reverse", "boolean")
	add_serialize("content_sort", "text")
	add_serialize("content_hidden", "boolean")
	add_serialize("content_show_select", "boolean")
	add_serialize("content_show_mode", "boolean")
	add_serialize("content_show_user", "boolean")
	add_serialize("content_show_group", "boolean")
	add_serialize("content_show_size", "boolean")

	add_internal("selected_files", undefined, [])

	add_internal("clipboard", undefined, [])
	add_internal("clipboard_mode", "text")

	add_internal("history", undefined, [])
	add_internal("history_forward", undefined, [])
}
register_state_parameters()

let cgi_commands = new CgiCommands("/cgi-bin/cgi_command.sh")
let file_manager = new FileManager(cgi_commands)



/* --- FILE API FUNCTIONS --- */

// wrapper to list files for the file tree(left side)
function list_files_tree(path) {
	console.log("Requesting file list for tree:", path)
	return file_manager.list(path, 1, true)
}

// wrapper to list files for the content(right side)
function list_files_content(path) {
	console.log("Requesting file list for content:", path)
	return file_manager.list(
		path,
		1,
		false,
		state.data.content_hidden,
		state.data.content_human_readable,
		state.data.content_sort,
		state.data.content_reverse,
		state.data.content_dirfirst
	)
}



/* --- TREE/TABLE GENERATION --- */

// generate a single (sub-)instance of the file tree
// (generate a single ul with li's for folders, with recursion on click to generate sub-menus)
function generate_tree(files_list) {
	let tree_elem = document.createElement("ul")
	for (let i=0; i<files_list.length; i++) {
		let entry = files_list[i]
		if (entry.type == "directory") {
			let entry_li_elem = document.createElement("li")
			let details_elem = document.createElement("details")
			let summary_elem = document.createElement("summary")
			let summary_text_elem = document.createElement("span")
			let subentry_placeholder_elem = document.createElement("ul")
			subentry_placeholder_elem.classList = "hidden"
			summary_elem.setAttribute("data-path", encodeURIComponent(entry.name))
			summary_elem.setAttribute("data-icon", "🗀")
			summary_elem.setAttribute("data-empty", "false")
			summary_text_elem.innerText = basename(entry.name)
			function summary_elem_onclick(e) {
				file_get_dir_tree(entry.name, function(subentry_files_list) {
					console.log("Got recursive tree file_list", entry.name, subentry_files_list)
					if (subentry_files_list) {
						// got a response with files
						let subentry_elem = generate_tree(subentry_files_list)
						subentry_placeholder_elem.replaceWith(subentry_elem)
					} else {
						summary_elem.removeAttribute("data-empty", "true")
					}

					// navigate the content window
					navigate_content(entry.name, true)

					// wait 1s before user can try again
					summary_elem.onclick = undefined
					setTimeout(function() {
						summary_elem.onclick = summary_elem_onclick
					}, 1000)
				})
			}
			summary_elem.onclick = summary_elem_onclick
			summary_elem.appendChild(summary_text_elem)
			details_elem.appendChild(summary_elem)
			details_elem.appendChild(subentry_placeholder_elem)
			entry_li_elem.appendChild(details_elem)
			tree_elem.appendChild(entry_li_elem)
		}
	}
	return tree_elem
}

// generate the content-table(the right part of the file explorer with the list of files/directories)
function generate_content_table(files_list) {
	let table = document.createElement("table")
	table.classList.add("file-table")

	let colgroup = document.createElement("colgroup")

	let first_row = table.insertRow()
	first_row.classList = "header-row"
	if (content_show_select) { first_row.insertCell().classList = "header header-select" }
	first_row.insertCell().classList = "header header-file-name"
	if (content_show_mode) { first_row.insertCell().classList = "header header-mode" }
	if (content_show_user) { first_row.insertCell().classList = "header header-user" }
	if (content_show_group) { first_row.insertCell().classList = "header header-group" }
	if (content_show_size) { first_row.insertCell().classList = "header header-size" }

	if (!files_list) { files_list=[] }
	for (let y=0; y<files_list.length; y++) {
		let file = files_list[y]
		let row = table.insertRow()
		let is_selected = selected_files.includes(file.name)
		row.classList = "file-tree-row"
		row.setAttribute("data-path", encodeURIComponent(file.name))
		row.setAttribute("data-selected", is_selected)

		let icon_str = (file.type=="directory") ? "🗀" : "🖹"
		icon_str = (file.type=="link") ? "⮫" : icon_str

		if (content_show_select) {
			let select_cell = row.insertCell()
			let select_checkbox = document.createElement("input")
			select_checkbox.setAttribute("type", "checkbox")
			select_checkbox.checked = is_selected
			select_cell.appendChild(select_checkbox)
			select_cell.classList = "select-cell"
			select_checkbox.onchange = function(e) {
				if (e.currentTarget.checked && (!selected_files.includes(file.name))) {
					selected_files.push(file.name)
					update_selected_files()
				} else if ((!e.currentTarget.checked) && selected_files.includes(file.name)) {
					selected_files.splice(selected_files.indexOf(file.name), 1)
					update_selected_files()
				}
			}
		}

		let filename_cell = row.insertCell()
		filename_cell.setAttribute("data-icon", icon_str)
		filename_cell.innerText = basename(file.name)
		filename_cell.classList = "file-name-cell"
		filename_cell.ondblclick = content_file_double_click(file)
		filename_cell.onclick = content_file_click(file)

		if (content_show_mode) { row.insertCell().innerText = file.mode }
		if (content_show_user) { row.insertCell().innerText = file.user }
		if (content_show_group) { row.insertCell().innerText = file.group }
		if (content_show_size) { row.insertCell().innerText = file.size }
	}


	return table
}



/* --- TREE/TABLE NAVIGATION --- */

// navigate the tree-page on the left
function navigate_tree(new_tree_path) {
	let files_list = list_files_tree(new_tree_path)
	if (!files_list) { return; }
	state.data.tree_path = new_tree_path

	let new_file_tree_elem = generate_tree(files_list)
	let base_link = document.createElement("li");
	base_link.classList = "base-link"
	base_link.innerText = "Folders:" + new_tree_path
	base_link.onclick = function() {
		navigate_content(new_tree_path, true)
	}
	new_file_tree_elem.insertBefore(base_link, new_file_tree_elem.children[0])
	new_file_tree_elem.classList = "file-tree"
	let file_tree_elem = document.getElementById("file-tree")
	new_file_tree_elem.id = file_tree_elem.id
	file_tree_elem.replaceWith(new_file_tree_elem)
}

// highlight specified path and open all required directories
function highlight_tree(highlight_dir_path) {
	// remove highlight class from previously highlighted elements
	let previous_highlight_elem = document.querySelector(".tree-file-selected")
	console.log("previous_highlight_elems", previous_highlight_elem)
	if (previous_highlight_elem) {
		previous_highlight_elem.classList.remove("tree-file-selected")
	}

	// get the correct item to highlight
	let selector = "summary[data-path='" + encodeURIComponent(highlight_dir_path) + "']"
	let target_highlight_elem = document.querySelector(selector)
	if (!target_highlight_elem) {
		//TODO: need to open/generate part of the tree!
		//      split path into segments, get element for last
		//      found complete segment by path, "open" remaining
		//      elements using onclick()
		/*
		let path_segments = highlight_dir_path.split("/")
		let missing_segments = []
		while (path_segments.length>0) {
			let completed_path = path_segments.join("/")
			if (has_element(completed_path)) {
				break
			} else {
				missing_segments.push(path_segments.pop())
			}
		}
		*/
		return
	}

	// add the highlight class to currently highlighted element
	target_highlight_elem.classList.add("tree-file-selected")
}

// navigate the content-page on the right
function navigate_content(new_content_path, do_highlight) {
	let files_list = list_files_content(new_content_path)
	if (!files_list) { return; }
	state.data.content_path = new_content_path
	state.data.history.push(new_content_path)
	//highlight_tree(new_content_path)
	let file_table_elem = document.getElementById("file-table")
	let new_file_table_elem = generate_content_table(files_list)
	new_file_table_elem.id = file_table_elem.id
	file_table_elem.replaceWith(new_file_table_elem)
	document.getElementById("menubar_file_path").value = new_content_path
	selected_files = []
}

// Update the data-selected attribute on all rows
// TODO: Uncheck all elements!
function update_selected_files() {
	let rows = document.querySelectorAll(".file-tree-row")
	for (let i=0; i<rows.length; i++) {
		let row = rows[i]
		let decoded_path = decodeURIComponent(row.getAttribute("data-path"))
		let checkbox = row.querySelector("input[type=checkbox]")
		let is_selected = state.data.selected_files.includes(decoded_path)
		if (checkbox) {
			checkbox.checked = is_selected
		}
		row.setAttribute("data-selected", is_selected)
	}
}



// get a URL for a filename by looking up the file extension in know_file_types
function url_for_known_file(file_name) {
	for (let known_file_type of know_file_types) {
		let known_file_extension = known_file_type[0]
		let known_file_handler = known_file_type[1]
		if (file_name.toLowerCase().endsWith(known_file_extension)) {
			return known_file_handler(file_name)
		}
	}
}

// when a file in the file table was double-clicked
function content_file_double_click(file) {
	return function(e) {
		if (file.type == "directory") {
			navigate_content(file.name)
		} else {
			let file_url = url_for_known_file(file.name)
			if (!file_url) {
				file_url =
					"/cgi-bin/file/read_file.sh?" +
					"file_path=" + encodeURIComponent(file.name) +
					"&content_type=" + encodeURIComponent("application/octet-stream") +
					"&content_disposition=" + encodeURIComponent("attachment; filename=\"" + encodeURIComponent(file.name) + "\"")
			}
			open(file_url, "make_new_win")
		}
	}
}

// wne a file in the file table was clicked
function content_file_click(file) {
	return function() {
		console.log("content_file_click", file)
		if (selected_files.includes(file.name)) {
			selected_files.splice(selected_files.indexOf(file.name), 1)
			update_selected_files()
		} else {
			selected_files = [file.name]
			update_selected_files()
		}
	}
}

/* --- FILE ACTIONS --- */

// copy a list of files
function copy_list(file_list, target_dir, on_finish, on_progress) {
	let file_elem = file_list.pop()
	if (!file_elem) {
		if (on_finish) { on_finish(); }
		return
	}
	api_file_copy(file_elem, target_dir, true, function() {
		console.log("Copied", file_elem)
		if (on_progress) { on_progress(file_list, file_elem); }
		copy_list(file_list, target_dir, on_finish, on_progress)
	})
}

// move a list of files
function move_list(file_list, target_dir, on_finish, on_progress) {
	let file_elem = file_list.pop()
	if (!file_elem) {
		if (on_finish) { on_finish(); }
		return
	}
	api_file_move(file_elem, target_dir, function() {
		if (on_progress) { on_progress(file_list, file_elem); }
		move_list(file_list, target_dir, on_finish, on_progress)
	})
}

// delete a list of files
function delete_list(file_list, on_finish, on_progress) {
	let file_elem = file_list.pop()
	if (!file_elem) {
		if (on_finish) { on_finish(); }
		return
	}
	api_file_delete(file_elem, function() {
		if (on_progress) { on_progress(file_list, file_elem); }
		delete_list(file_list, on_finish, on_progress)
	})
}



/* --- EVENT HANDLERS --- */

// check for enter in the menubar file path text
function menubar_file_path_keyup() {
	if (event.keyCode == 13) {
		document.getElementById("menubar_go_button").onclick()
	}
}

// TODO: Checkboxes



/* --- PROGRESS WINDOW --- */

let items_count
function on_progress(file_list, last_file) {
	let completed_count = items_count-file_list.length
	let pct = Math.floor((completed_count / items_count)*100)
	document.getElementById("progress_last_file").innerText = last_file
	document.getElementById("progress_text_status").innerText = completed_count + "/" + items_count
	document.getElementById("progress_bar").value = pct
}

function on_finish() {
	close_popup()
	navigate_content(content_dir_path)
	items_count = undefined
}

// show the progress dialog
function show_progress_window(title, text, new_items_count) {
	items_count = new_items_count
	show_popup("progress-window")
	document.getElementById("progress_bar").value = "0"
	document.getElementById("progress_title").innerText = title
	document.getElementById("progress_text").innerText = text
}

// show the progress dialog to paste from clipboard
function paste_from_clipboard_progress() {
	if ((clipboard_mode == "copy") && confirm("Copy " + clipboard.length + " files to " + content_dir_path + "?")) {
		show_progress_window("Copying...", "Copying from clipboard.", clipboard.length)
		copy_list(clipboard.slice(), content_dir_path, on_finish, on_progress)
	} else if ((clipboard_mode == "cut") && confirm("Move " + clipboard.length + " files to " + content_dir_path + "?")) {
		show_progress_window("Moving...", "Moving from clipboard.", clipboard.length)
		move_list(clipboard.slice(), content_dir_path, on_finish, on_progress)
	}
}

// show the progress dialog to delete selected files
function delete_selected_progress() {
	if (selected_files.length<0) { return; }
	if (confirm("Delete " + selected_files.length + " files?")) {
		show_progress_window("Deleting...", "Deleting selected files.", selected_files.length)
		delete_list(selected_files, on_finish, on_progress)
	}
}



/* --- BUTTON HANDLERS --- */

function btn_open_go() {
	let new_url = document.getElementById("open_file_path").value
	navigate_tree(new_url)
	navigate_content(new_url)
	close_popup()
}

function btn_menubar_go() {
	navigate_content(document.getElementById("menubar_file_path").value, true)
}

function btn_up() {
	navigate_content(basedir(document.getElementById("menubar_file_path").value), true)
}

function btn_copy() {
	clipboard = selected_files.slice()
	clipboard_mode = "copy"
	selected_files = []
	update_selected_files()
}

function btn_cut() {
	clipboard = selected_files.slice()
	clipboard_mode = "cut"
	selected_files = []
	update_selected_files()
}

function btn_paste() {
	paste_from_clipboard_progress()
	clipboard = undefined
	clipboard_mode = undefined
}

function btn_back() {
	history.pop()
	let last_history_elem = history.pop()
	if (last_history_elem) {
		navigate_content(last_history_elem)
		history_forward.push(last_history_elem)
	}
}

function btn_forward() {
	let last_history_forward_elem = history_forward.pop()
	if (last_history_forward_elem) {
		navigate_content(last_history_forward_elem)
	}
}

function btn_new_file() {
	let file_name = prompt("Enter a filename for the new file:")
	if (file_name) {
		file_name = file_name.startsWith("/") ? file_name : content_dir_path + "/" + file_name
		api_make_file(file_name, function() {
			navigate_content(basedir(file_name))
		})
	}
}

function btn_new_folder() {
	let folder_name = prompt("Enter a filename for the new folder:")
	if (folder_name) {
		folder_name = folder_name.startsWith("/") ? folder_name : content_dir_path + "/" + folder_name
		api_make_dir(folder_name, function() {
			navigate_content(folder_name)
		})
	}
}

function btn_delete() {
	delete_selected_progress()
}

function btn_sort_alphabetically() {
	content_sort = undefined
	navigate_content(content_dir_path)
}

function btn_sort_modification() {
	content_sort = "modification"
	navigate_content(content_dir_path)
}

function btn_sort_creation() {
	content_sort = "creation"
	navigate_content(content_dir_path)
}

function btn_sort_size() {
	content_sort = "size"
	navigate_content(content_dir_path)
}

function btn_sort_reverse() {
	content_reverse = !content_reverse
	navigate_content(content_dir_path)
}

function btn_refresh() {
	navigate_content(content_dir_path)
	navigate_tree(tree_dir_path)
}

function btn_rename() {
	for (let selected_file of selected_files) {
		let new_file_name = prompt("Enter a new name for the file:\n"+selected_file)
		if ((!new_file_name) || (new_file_name=="")) { continue; }
		new_file_name = new_file_name.startsWith("/") ? new_file_name : content_dir_path + "/" + new_file_name
		api_file_move(selected_file, new_file_name, function() {
			navigate_content(content_dir_path)
		})
	}
}

function btn_download_tar() {
	if (selected_files.length==0) { return; }
	api_create_tar(selected_files)
}



/* --- INITIALIZATION --- */

// navigate to hash part of URL, or /
let hash_loc = location.hash.substr(1)
if ((!hash_loc) || (hash_loc=="")) {
	navigate_tree("/")
	navigate_content("/", false)
} else {
	let decoded_loc = decodeURIComponent(hash_loc)
	navigate_tree(decoded_loc)
	navigate_content(decoded_loc, false)
}
