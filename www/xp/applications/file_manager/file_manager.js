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
	// the path of the directory tree on the left side
	add_serialize("tree_path", "text")

	// the path of the direcotry and files table on the right
	add_serialize("content_path", "text")

	// the current display settings for the content window
	add_serialize("content_human_readable", "boolean")
	add_serialize("content_dirfirst", "boolean")
	add_serialize("content_reverse", "boolean")
	add_serialize("content_sort", "text")
	add_serialize("content_show_dotfiles", "boolean")
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
		state.data.content_show_dotfiles,
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
			summary_text_elem.innerText = file_manager.basename(entry.name)
			summary_elem.onclick = tree_file_click(entry, summary_elem, details_elem)
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
	if (state.data.content_show_select) { first_row.insertCell().classList = "header header-select" }
	first_row.insertCell().classList = "header header-file-name"
	if (state.data.content_show_mode) { first_row.insertCell().classList = "header header-mode" }
	if (state.data.content_show_user) { first_row.insertCell().classList = "header header-user" }
	if (state.data.content_show_group) { first_row.insertCell().classList = "header header-group" }
	if (state.data.content_show_size) { first_row.insertCell().classList = "header header-size" }

	if (!files_list) { files_list=[] }
	for (let y=0; y<files_list.length; y++) {
		let file = files_list[y]
		let row = table.insertRow()
		let is_selected = state.data.selected_files.includes(file.name)
		row.classList = "file-tree-row"
		row.setAttribute("data-path", encodeURIComponent(file.name))
		row.setAttribute("data-selected", is_selected)

		let icon_str = (file.type=="directory") ? "🗀" : "🖹"
		icon_str = (file.type=="link") ? "⮫" : icon_str

		if (state.data.content_show_select) {
			let select_cell = row.insertCell()
			let select_checkbox = document.createElement("input")
			select_checkbox.setAttribute("type", "checkbox")
			select_checkbox.checked = is_selected
			select_cell.appendChild(select_checkbox)
			select_cell.classList = "select-cell"
			select_checkbox.onchange = function(e) {
				if (e.currentTarget.checked && (!state.data.selected_files.includes(file.name))) {
					state.data.selected_files.push(file.name)
					update_selected_files()
				} else if ((!e.currentTarget.checked) && state.data.selected_files.includes(file.name)) {
					state.data.selected_files.splice(state.data.selected_files.indexOf(file.name), 1)
					update_selected_files()
				}
			}
		}

		let filename_cell = row.insertCell()
		filename_cell.setAttribute("data-icon", icon_str)
		filename_cell.innerText = file_manager.basename(file.name)
		filename_cell.classList = "file-name-cell"
		filename_cell.ondblclick = content_file_double_click(file)
		filename_cell.onclick = content_file_click(file)

		if (state.data.content_show_mode) { row.insertCell().innerText = file.mode }
		if (state.data.content_show_user) { row.insertCell().innerText = file.user }
		if (state.data.content_show_group) { row.insertCell().innerText = file.group }
		if (state.data.content_show_size) { row.insertCell().innerText = file.size }
	}


	return table
}

// update/generate a sub-part of the file tree("expand" it)
function update_sub_tree(summary_elem) {
	let file_path = decodeURIComponent(summary_elem.getAttribute("data-path"))
	let details_elem = summary_elem.parentElement
	let subentry_files_list = list_files_tree(file_path)
	if (subentry_files_list.contents) {
		let previous_subentry_elem = details_elem.children[1]
		let subentry_elem = generate_tree(subentry_files_list.contents)
		previous_subentry_elem.replaceWith(subentry_elem)
		summary_elem.setAttribute("data-empty", "false")
	} else {
		summary_elem.setAttribute("data-empty", "true")
	}
}



/* --- TREE/TABLE NAVIGATION --- */

// navigate the tree-page on the left
function navigate_tree(new_tree_path) {
	let files_list = list_files_tree(new_tree_path)
	if (!files_list) { return; }
	state.data.tree_path = new_tree_path

	let new_file_tree_elem = generate_tree(files_list.contents)
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
	// get the correct item to highlight
	let selector = "summary[data-path='" + encodeURIComponent(highlight_dir_path) + "']"
	let target_highlight_elem
	while (!(target_highlight_elem = document.querySelector(selector))) {
		// tree needs to be expanded to highlight the element
		// split path into segments, get element for last
		// found complete segment by path, "open" remaining
		// elements using onclick()

		// split the path into segments
		let path_segments = highlight_dir_path.split("/")
		console.log("highlight_tree segments:", path_segments)
		let missing_segments = []
		let found_elem

		// search for the deepest element known to contain part of
		// the path by checking if the combined segments point to an
		// existing element.
		// If not, the last element is popped from path_segments and
		// pushed into the missing_segments.
		while (path_segments.length>0) {
			let current_path = path_segments.join("/")
			found_elem = document.querySelector("summary[data-path='" + encodeURIComponent(current_path) + "']")
			if (found_elem) { break; }
			missing_segments.push(path_segments.pop())
		}
		// found_elem is now the deepest known element,
		// and missing_segments is an array of missing segment paths.
		if (!found_elem) { return; }

		let details_elem = found_elem.parentElement
		update_sub_tree(found_elem)
		found_elem.parentElement.setAttribute("open", true)
	}

	// remove highlight class from previously highlighted elements
	let previous_highlight_elems = document.querySelectorAll(".tree-file-selected")
	for (let previous_highlight_elem of previous_highlight_elems) {
		previous_highlight_elem.classList.remove("tree-file-selected")
	}

	// element was found/created, add highlight class
	target_highlight_elem.classList.add("tree-file-selected")
	target_highlight_elem.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
}

// navigate the content-page on the right
function navigate_content(new_content_path, do_highlight) {
	let files_list = list_files_content(new_content_path)
	if (!files_list) { return; }
	state.data.content_path = new_content_path
	state.data.history.push(new_content_path)
	highlight_tree(new_content_path)
	let file_table_elem = document.getElementById("file-table")
	let new_file_table_elem = generate_content_table(files_list.contents)
	new_file_table_elem.id = file_table_elem.id
	file_table_elem.replaceWith(new_file_table_elem)
	document.getElementById("menubar_file_path").value = new_content_path
	unselect_all()
}

// utillity wrapper for calling both functions at the same time
function navigate_both(new_path) {
	navigate_tree(new_path)
	navigate_content(new_path, false)
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

// unselect all currently selected files
function unselect_all() {
	state.data.selected_files = []
	update_selected_files()
}

// refresh the content, but don't unselect elements or modify history
function refresh_content() {
	let file_table_elem = document.getElementById("file-table")
	let files_list = list_files_content(state.data.content_path)
	let new_file_table_elem = generate_content_table(files_list.contents)
	new_file_table_elem.id = file_table_elem.id
	file_table_elem.replaceWith(new_file_table_elem)
}

// called when a file in the tree view was clicked
function tree_file_click(file, summary_elem, details_elem) {
	return function(e) {
		update_sub_tree(summary_elem)
		navigate_content(file.name, true)
	}
}

// when a file in the file table was double-clicked
function content_file_double_click(file) {
	return function(e) {
		console.log("content_file_double_click", file)
		if (file.type == "directory") {
			navigate_content(file.name)
		} else {
			let file_url = file_manager.url_for(file.name)
			open(file_url, "make_new_win")
		}
	}
}

// when a file in the file table was clicked
function content_file_click(file) {
	return function() {
		if (state.data.selected_files.includes(file.name)) {
			state.data.selected_files.splice(state.data.selected_files.indexOf(file.name), 1)
			update_selected_files()
		} else {
			state.data.selected_files = [file.name]
			update_selected_files()
		}
	}
}



/* --- EVENT HANDLERS --- */

// check for enter in the menubar file path text
function menubar_file_path_keyup() {
	if (event.keyCode == 13) {
		document.getElementById("menubar_go_button").onclick()
	}
}



/* --- PROGRESS WINDOW --- */

// called when the action in the progress window is finished
function on_progress_finish() {
	document.getElementById("progress_text").innerText = "Action completed."
	document.getElementById("progress_close").classList.remove("hidden")
	refresh_content()
}

// called when the action produces some output
function on_progress_stdout(data) {
	document.getElementById("progress_status").innerText += data + "\n"
}

// show the progress dialog
function show_progress_window(title, text) {
	show_popup("progress-window")
	document.getElementById("progress_title").innerText = title
	document.getElementById("progress_text").innerText = text
	document.getElementById("progress_status").innerText = ""
	document.getElementById("progress_close").classList.add("hidden")
}

// show the progress dialog and start to paste from clipboard(copy/move)
function paste_from_clipboard_progress(target_dir) {
	let clipboard_mode = state.data.clipboard_mode
	let clipboard = state.data.clipboard
	console.log("paste", clipboard_mode, clipboard)
	if (clipboard.length<1) { return; }
	if ((clipboard_mode == "copy") && confirm("Copy " + clipboard.length + " files to " + target_dir + "?")) {
		show_progress_window("Copying...", "Copying from clipboard.")
		file_manager.copy(clipboard, target_dir, true, on_progress_finish, on_progress_stdout)
	} else if ((clipboard_mode == "cut") && confirm("Move " + clipboard.length + " files to " + target_dir + "?")) {
		show_progress_window("Moving...", "Moving from clipboard.")
		file_manager.move(clipboard, target_dir, on_progress_finish, on_progress_stdout)
	}
}

// show the progress dialog and start to remove(delete) selected files
function remove_selected_progress() {
	let selected_files = state.data.selected_files
	if (selected_files.length<1) { return; }
	if (confirm("Delete " + selected_files.length + " files?")) {
		show_progress_window("Deleting...", "Deleting selected files.")
		file_manager.remove(selected_files, true, on_progress_finish, on_progress_stdout)
	}
}

// show the progress dialog and start to upload the selected files
function upload_files_progress(files_list) {
	show_progress_window("Uploading...", "uploading selected files.")
	let remaining_files = files_list.length
	for (let file of files_list) {
		let reader = new FileReader();
		reader.onload = function(e) {
			let base64_str = e.target.result.split(";base64,")[1]
			let file_path = state.data.content_path + "/" + file.name
			file_manager.upload_file_base64(base64_str, file_path, function(ret) {
				on_progress_stdout(`Uploaded to ${file_path} (${file.size} bytes): ${ret}`)
				remaining_files = remaining_files - 1
				if (remaining_files==0) {
					on_progress_finish()
				}
			})
		}
		reader.readAsDataURL(file)
	}
}


/* --- BUTTON HANDLERS --- */

function btn_open_go() {
	navigate_both(prompt("Please enter the path you want to open:"))
}

function btn_menubar_go() {
	let menu_file_path = document.getElementById("menubar_file_path").value
	navigate_content(menu_file_path, true)
}

function btn_up() {
	let up_path = file_manager.basedir(document.getElementById("menubar_file_path").value)
	navigate_content(up_path, true)
}

function btn_copy() {
	state.data.clipboard = state.data.selected_files.slice()
	state.data.clipboard_mode = "copy"
	unselect_all()
}

function btn_cut() {
	state.data.clipboard = state.data.selected_files.slice()
	state.data.clipboard_mode = "cut"
	unselect_all()
}

function btn_paste() {
	console.log("Pasting to:", state.data.content_path)
	paste_from_clipboard_progress(state.data.content_path)
	clipboard = undefined
	clipboard_mode = undefined
}

function btn_back() {
	// remove current URL from history
	let current_url = state.data.history.pop()

	// remove previous URL from history
	let previous_url = state.data.history.pop()
	if (previous_url) {
		// if a previous URL was present, go to that
		navigate_content(previous_url)
		state.data.history_forward.push(current_url)
	} else {
		state.data.history.push(current_url)
	}
}

function btn_forward() {
	let last_history_forward_elem = state.data.history_forward.pop()
	if (last_history_forward_elem) {
		navigate_content(last_history_forward_elem)
	}
}

function btn_new_file() {
	let file_path = prompt("Enter a path for the new file:")
	if (file_path) {
		file_path = file_path.startsWith("/") ? file_path : state.data.content_path + "/" + file_path
		file_manager.touch(file_path)
		refresh_content()
	}
}

function btn_new_folder() {
	let folder_path = prompt("Enter a path for the new folder:")
	if (folder_path) {
		folder_path = folder_path.startsWith("/") ? folder_path : state.data.content_path + "/" + folder_path
		file_manager.mkdir(folder_path)
		refresh_content()
	}
}

function btn_delete() {
	remove_selected_progress()
	unselect_all()
}

function btn_refresh() {
	refresh_content()
	unselect_all()
}

function btn_rename() {
	for (let selected_file of state.data.selected_files) {
		let base_dir = file_manager.basedir(selected_file)
		let file_name = file_manager.basename(selected_file)
		let new_file_name = prompt("Enter a new name for the file:\n"+file_name)
		if ((!new_file_name) || (new_file_name=="")) { continue; }
		let new_file_path = base_dir + "/" + new_file_name
		if (new_file_name.startsWith("/")) { new_file_name }
		file_manager.move(selected_file, new_file_path, refresh_content)
	}
	unselect_all()
}

function btn_set_mode() {
	for (let selected_file of state.data.selected_files) {
		let new_mode_str = prompt("Enter a new octal mode for the file:\n"+selected_file)
		if (new_mode_str.match("^[0-7]?[0-7][0-7][0-7]$")) {
			cgi_commands.run_command_sync(["chmod", new_mode_str, selected_file])
			refresh_content()
		} else {
			alert("Invalid octal mode!")
		}
	}
	unselect_all()
}

function btn_download_tar() {
	if (state.data.selected_files.length<1) { return; }
	let tar_url = file_manager.enc_download_tar(state.data.selected_files)
	open(tar_url)
}

function btn_upload_files() {
	let file_input = document.getElementById("file-input")
	file_input.onchange = function() {
		upload_files_progress(file_input.files)
	}
	file_input.click()
}

function btn_open_directory() {
	let dir_path = prompt("Please enter the path of the base directory:")
	if (!file_manager.test.directory(dir_path)) {
		alert("Directory not found!")
	}
	navigate_both(dir_path)
}

function radio_sort() {
	let selected_sort_elem = document.querySelector("[name=sort]:checked")
	if (selected_sort_elem) {
		state.data.content_sort = selected_sort_elem.value
	}
	refresh_content()
}


/* --- INITIALIZATION --- */

function body_onload() {
	// load the initial configuration values from the HTML data,
	// by calling all onchange functions for input elements with the data-update attribute.
	console.log("Loading state...")
	state.load()
	console.log("Loaded state:", state.data)

	state.key_to_updater["content_dirfirst"] = refresh_content
	state.key_to_updater["content_reverse"] = refresh_content

	state.key_to_updater["content_human_readable"] = refresh_content
	state.key_to_updater["content_show_dotfiles"] = refresh_content
	state.key_to_updater["content_show_select"] = refresh_content
	state.key_to_updater["content_show_mode"] = refresh_content
	state.key_to_updater["content_show_user"] = refresh_content
	state.key_to_updater["content_show_group"] = refresh_content
	state.key_to_updater["content_show_size"] = refresh_content

	if (state.data.tree_path=="HOME") {
		console.log("Getting $HOME...")
		state.data.tree_path = cgi_commands.get_env()["HOME"]
		console.log("$HOME:", state.data.tree_path)
	}
	if (!state.data.tree_path) { state.data.tree_path = "/" }
	navigate_both(state.data.tree_path)
}
