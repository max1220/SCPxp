// the URL of the directory tree on the left side
let tree_dir_path = undefined

// the URL of the direcotry and files table on the right
let content_dir_path = undefined

// the current display settings for the content window
let content_human_readable = true
let content_dirfirst = true
let content_reverse = false
let content_sort = undefined

let content_show_select = true
let content_show_mode = true
let content_show_user = true
let content_show_group = true
let content_show_size = true

let selected_files = []
let clipboard = undefined
let clipboard_mode = undefined


// return the basename of the specified path
function basename(path) {
	return path.split("/").pop()
}

// return the containing directory
function basedir(path) {
	let base_path = path.split("/").slice(0,-1).join("/")
	return (base_path=="") ? "/" : base_path
}

// get a list of files from the server
function api_file_get_dir(dir_path, max_depth, human_readable, dirfirst, dironly, reverse, sort, cb) {
	let url_args =
		"file_path=" + encodeURIComponent(dir_path) +
		"&max_depth=" + parseInt(max_depth) +
		"&humanreadable=" + (!!human_readable) +
		"&dirfirst=" + (!!dirfirst) +
		"&dironly=" + (!!dironly) +
		"&reverse=" + (!!reverse) +
		(sort ? ("&sort=" + sort) : "")

	make_xhr(
		"/cgi-bin/file/get_dir.sh?"+url_args,
		"GET",
		"application/x-www-form-urlencoded",
		undefined,
		function(url, resp) {
			let json_resp = JSON.parse(resp)
			if (!json_resp[0]) { return; }
			let files_content = json_resp[0].contents
			cb(files_content, dir_path)
		}
	)
}

// wrapper that uses settings for the file tree
function file_get_dir_tree(dir_path, cb) {
	//console.log("Requesting file list for tree:", file_path)
	api_file_get_dir(dir_path, 1, false, false, true, false, undefined, cb)
}

// wrapper that uses settings for the content
function file_get_dir_content(dir_path, cb) {
	//console.log("Requesting file list for content:", file_path)
	api_file_get_dir(dir_path, 1, content_human_readable, content_dirfirst, false, content_reverse, content_sort, cb)
}

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

// navigate the tree-page on the left
function navigate_tree(new_tree_dir_path) {
	file_get_dir_tree(new_tree_dir_path, function(files_list, cur_tree_dir_path) {
		tree_dir_path = cur_tree_dir_path
		console.log("Got initial tree file_list", cur_tree_dir_path, files_list)
		let new_file_tree_elem = generate_tree(files_list)
		let base_link = document.createElement("li");
		base_link.classList = "base-link"
		base_link.innerText = "Folders:" + tree_dir_path
		base_link.onclick = function() {
			navigate_content(new_tree_dir_path, true)
		}
		new_file_tree_elem.insertBefore(base_link, new_file_tree_elem.children[0])
		let file_tree_elem = document.getElementById("file-tree")
		new_file_tree_elem.classList = "file-tree"
		new_file_tree_elem.id = file_tree_elem.id
		file_tree_elem.replaceWith(new_file_tree_elem)
	})
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
function navigate_content(new_content_dir_path, do_highlight) {
	file_get_dir_content(new_content_dir_path, function(files_list, cur_content_dir_path) {
		content_dir_path = cur_content_dir_path
		if (do_highlight) {
			highlight_tree(content_dir_path)
		}
		let file_table_elem = document.getElementById("file-table")
		let new_file_table_elem = generate_content_table(files_list)
		new_file_table_elem.id = file_table_elem.id
		file_table_elem.replaceWith(new_file_table_elem)
		menubar_file_path_elem.value = cur_content_dir_path
	})
}


/* --- FILE TYPES --- */

function file_type_text(file_name) {
	return "/static/html/xp/text_editor.html#"+encodeURIComponent(file_name)
}
function file_type_image(file_name) {
	return "/static/html/xp/picture_viewer.html#"+encodeURIComponent(file_name)
}
function file_type_script(file_name) {
	return "/static/html/xp/terminal.html#new-session:"+encodeURIComponent(file_name)
}

/* List of known file extensions and how to generate a URL for them */
let know_file_types = [
	[ ".txt", file_type_text ],
	[ ".conf", file_type_text ],
	[ ".jpg", file_type_image ],
	[ ".jpeg", file_type_image ],
	[ ".gif", file_type_image ],
	[ ".png", file_type_image ],
	[ ".svg", file_type_image ],
	[ ".sh", file_type_script ],
	[ ".bash", file_type_script ]
]

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
				// TODO: set content-type to download?
				file_url = "/cgi-bin/read_file.sh?file_path="+encodeURIComponent(file.name)
			}
			open(file_url, "make_new_win")
		}
	}
}

// genrate the content-table
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

	console.log("files_list",files_list)
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
					row.setAttribute("data-selected", true)
				} else if ((!e.currentTarget.checked) && selected_files.includes(file.name)) {
					selected_files.splice(selected_files.indexOf(file.name), 1)
					row.setAttribute("data-selected", false)
				}
				console.log("selected_files", selected_files)
			}
		}

		let filename_cell = row.insertCell()
		filename_cell.setAttribute("data-icon", icon_str)
		filename_cell.innerText = basename(file.name)
		filename_cell.classList = "file-name-cell"
		filename_cell.ondblclick = content_file_double_click(file)

		if (content_show_mode) { row.insertCell().innerText = file.mode }
		if (content_show_user) { row.insertCell().innerText = file.user }
		if (content_show_group) { row.insertCell().innerText = file.group }
		if (content_show_size) { row.insertCell().innerText = file.size }
	}


	return table
}


/* --- REGISTER EVENT HANDLERS --- */

let menubar_go_button_elem = document.getElementById("menubar_go_button")
let menubar_up_button_elem = document.getElementById("menubar_up_button")
let menubar_file_path_elem = document.getElementById("menubar_file_path")

menubar_go_button_elem.onclick = function() {
	navigate_content(menubar_file_path_elem.value, true)
}
menubar_up_button_elem.onclick = function() {
	navigate_content(basedir(menubar_file_path_elem.value), true)
}
menubar_file_path_elem.onkeyup = function(e) {
	if (e.keyCode == 13) {
		menubar_go_button_elem.onclick()
	}
}



/* --- INITIALIZATION --- */

navigate_tree("/")
navigate_content("/", false)
