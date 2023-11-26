"use strict";

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

let cgi_commands = new CgiCommands(CGI_BACKEND)
let file_manager = new FileManager(cgi_commands)
let message_box = new MessageBox()



/* --- FILE API FUNCTIONS --- */

// wrapper to list files for the file tree(left side)
function list_files_tree(path) {
	update_status_message("Requesting file list for tree:", path)
	return file_manager.list(path, 1, true)
}

// wrapper to list files for the content(right side)
function list_files_content(path) {
	update_status_message("Requesting file list for content:", path)
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

function update_status_message(...args) {
	let str = args.join(" ")
	let status_text_elem = document.getElementById("status-message")
	status_text_elem.innerText = str
	console.log(...args)
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
function navigate_tree(new_tree_path, files_list) {
	files_list = files_list || list_files_tree(new_tree_path)
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
function navigate_content(new_content_path, do_highlight, files_list) {
	console.log("Navigate content:", new_content_path)
	files_list = files_list || list_files_content(new_content_path)
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
	let files_list = list_files_content(new_path)
	navigate_tree(new_path, files_list)
	navigate_content(new_path, false, files_list)
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
	update_status_message("Refreshing content:",state.data.content_path)
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
		update_status_message("Double clicked file:", file.name)
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
		update_status_message("Selected file:", file.name)
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



// show the dialog to start to paste(copy) from clipboard
function copy_from_clipboard(target_dir) {
	let clipboard = state.data.clipboard
	message_box.show_message_box_info({
		win_title: "Copy files?",
		main_text: `Copy ${clipboard.length} files to ${target_dir}?`,
		blocktext: clipboard.join("\n")
	}, function(ret) {
		if (ret !== "confirm") { return; }
		message_box.show_message_box_command({
			win_title: "Copying...",
			command: file_manager.copy_command(clipboard, target_dir, true)
		}, function(ret) {
			refresh_content()
			if (ret!=="confirm") { return; }
			clipboard = undefined
			clipboard_mode = undefined
		})
	})
}

// show the dialog to start to paste(move) from clipboard
function move_from_clipboard(target_dir) {
	let clipboard = state.data.clipboard
	message_box.show_message_box_info({
		win_title: "Move files?",
		main_text: `Move ${clipboard.length} files to ${target_dir}?`,
		blocktext: clipboard.join("\n")
	}, function(ret) {
		if (ret !== "confirm") { return; }
		message_box.show_message_box_command({
			win_title: "Moving...",
			command: file_manager.move_command(clipboard, target_dir)
		}, function(ret) {
			refresh_content()
			if (ret!=="confirm") { return; }
			unselect_all()
		})
	})
}

// show the progress dialog and start to upload the selected files
function upload_files_progress(files_list) {
	if (files_list.length==0) { return; }
	let cur_file = files_list[0].name
	let cur_file_pct = 0
	let total_uploaded = 0
	function progress_msgbox_parms() {
		let total_pct = Math.floor((total_uploaded/files_list.length)*100)
		return {
			win_title: "Uploading...",
			win_size: "300x200",
			main_html: `
				Uploading ${files_list.length} files:<br>
				<br>
				Current file: ${cur_file}(${cur_file_pct}%)<br>
				<progress class="progress" max="100" value="${cur_file_pct}">${cur_file_pct}%</progress><br>
				<br>
				Total: ${total_uploaded}/${files_list.length}(${total_pct}%)<br>
				<progress class="progress" max="${files_list.length}" value="${total_uploaded}">${total_pct} %</progress>
			`,
			confirm_button: (total_uploaded!==files_list.length) ? "hidden" : "Confirm",
			cancel_button: "Cancel"
		}
	}

	let xhr_reqs = []
	let progress_msgbox_win = message_box.show_message_box_info(progress_msgbox_parms(), function(ret) {
		if (ret=="confirm") {
			refresh_content()
		} else {
			xhr_reqs.forEach(function(e) { e.abort() })
		}
	})
	function update_progress_msgbox() {
		message_box.update_message_box(progress_msgbox_win, progress_msgbox_parms())
	}

	for (let file of files_list) {
		let reader = new FileReader();
		reader.onload = function(e) {
			let base64_str = e.target.result.split(";base64,")[1]

			let target_file_path = state.data.content_path + "/" + file.name
			cur_file = file.name
			update_progress_msgbox()

			console.log("Uploading ",base64_str.length, "bytes to ",target_file_path)
			let xhr_req = file_manager.upload_file_base64(base64_str, target_file_path, function(ret) {
				console.log("Upload for ", target_file_path, "completed")
				total_uploaded += 1;
				update_progress_msgbox()
				refresh_content()
			}, function(e) {
				console.log("progress", e)
				cur_file_pct = (e.loaded/e.total)*100
				update_progress_msgbox()
			})
			xhr_reqs.push(xhr_req)
		}
		reader.readAsDataURL(file)
	}
}


/* --- BUTTON HANDLERS --- */

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
	let clipboard_mode = state.data.clipboard_mode
	if (clipboard_mode == "copy") {
		return copy_from_clipboard(state.data.content_path)
	} else if (clipboard_mode == "cut") {
		return move_from_clipboard(state.data.content_path)
	}
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
	message_box.show_message_box_input({
		win_title: "New file...",
		win_size: "300x150",
		main_text: "Please enter the file name or path to touch:",
	}, function(ret) {
		if (ret[0]!=="confirm") { return; }
		let file_path = ret[1]
		file_path = file_path.startsWith("/") ? file_path : state.data.content_path + "/" + file_path
		file_manager.touch(file_path)
		refresh_content()
	})
}

function btn_new_folder() {
	message_box.show_message_box_input({
		win_title: "New folder...",
		win_size: "300x150",
		main_text: "Please enter the directory name or path to create:",
	}, function(ret) {
		if (ret[0]!=="confirm") { return; }
		let folder_path = ret[1]
		folder_path = folder_path.startsWith("/") ? folder_path : state.data.content_path + "/" + folder_path
		file_manager.mkdir(folder_path)
		refresh_content()
	})
}

function btn_delete() {
	let selected_files = state.data.selected_files
	if (selected_files.length==0) { return; }
	message_box.show_message_box_info({
		win_title: "Delete files?",
		main_text: `Delete ${selected_files.length} selected files?`,
		blocktext: selected_files.join("\n"),
		greyout: true
	}, function(ret) {
		if (ret!=="confirm") { return; }
		message_box.show_message_box_command({
			win_title: "Deleting...",
			main_text: "Deleting selected files.",
			command: file_manager.remove_command(selected_files, true),
			greyout: true
		}, function(ret) {
			refresh_content()
			if (ret!=="confirm") { return; }
			unselect_all()
		})
	})

}

function btn_refresh() {
	refresh_content()
	unselect_all()
}

function show_next_rename_dialog() {
	if (state.data.selected_files.length==0) { return; }
	let selected_file = state.data.selected_files.pop()
	let base_dir = file_manager.basedir(selected_file)
	let file_name = file_manager.basename(selected_file)

	message_box.show_message_box_input({
		win_title: "Rename...",
		win_size: "300x150",
		main_text: "Please enter the new filename for file:\n"+selected_file
	}, function(ret) {
		if (ret[0] !== "confirm") { return; }
		let new_file_path = ret[1]
		if (!new_file_path.startsWith("/")) {
			new_file_path = base_dir + "/" + ret[1]
		}
		file_manager.move(selected_file, new_file_path, function() {
			refresh_content()
			show_next_rename_dialog()
		})
	})
}

function btn_rename() {
	show_next_rename_dialog()
}

function btn_set_mode() {
	if (state.data.selected_files.length==0) { return; }
	message_box.show_message_box_input({
		win_title: "Set mode...",
		win_size: "300x150",
		main_text: "Please enter the new octal mode for the selected files:\n"+state.data.selected_files.join("\n"),
		text_label: "Mode:",
		greyout: true
	}, function(ret) {
		if (ret[0] !== "confirm") { return; }
		let new_mode_str = ret[1]
		if (!new_mode_str.match("^[0-7]?[0-7][0-7][0-7]$")) { return; }
		console.log("new_mode_str",new_mode_str)

		setTimeout(function() {
			message_box.show_message_box_command({
				win_title: "Changing mode...",
				main_text: "Changing file mode bits of selected files.",
				command: file_manager.chmod_command(state.data.selected_files, new_mode_str, true),
				greyout: true
			}, function(ret) {
				refresh_content()
				if (ret!=="confirm") { return; }
				unselect_all()
			})
		},0)


	})
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
	message_box.show_message_box_file({
		win_title: "Open directory...",
		filename_label: "hidden"
	}, function(ret) {
		if (ret[0]!=="confirm") { return; }
		navigate_both(ret[1])
	})
}

function btn_about() {
	message_box.show_message_box_info({
		win_icon: "application-file-manager",
		win_size: "300x250",
		win_title: "About File Manager",
		title_text: "About File Manager",
		title_icon: "application-file-manager",
		main_html: `
		A simple file manager.
		<ul>
			<li>generic CGI backend written in Bash</li>
			<li>front-end written in vanilla javascript</li>
		</ul>
		`,
		okay_button: "Close",
		greyout: false,
	})
}

function radio_sort() {
	let selected_sort_elem = document.querySelector("[name=sort]:checked")
	if (selected_sort_elem) {
		state.data.content_sort = selected_sort_elem.value
	}
	refresh_content()
}


/* --- INITIALIZATION --- */

// called by the WM when the window is loaded
function win_load() {
	win.title = "File manager"
	win.icon = "application-file-manager"
	win.resize(660, 400)
	win.update()
}

// called when the page is read(body onload)
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
