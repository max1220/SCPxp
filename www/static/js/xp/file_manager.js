let show_files_in_treeview = false

function basename(path) {
	return path.split("/").pop()
}
function generate_tree(files_list) {
	let file_tree_elem = document.createElement("ul")
	for (let entry of files_list) {
		if ((entry.type == "directory") && (entry.contents)) {
			// a non-empty directory
			let entry_li_elem = document.createElement("li")
			let details_elem = document.createElement("details")
			let summary_elem = document.createElement("summary")
			summary_elem.innerHTML = "🗀 " + basename(entry.name)
			summary_elem.ondblclick = function(e) {
				console.log("double-click", entry.name)
				list_files(entry.name)
			}
			details_elem.appendChild(summary_elem)
			let subentry_elem = generate_tree(entry.contents)
			details_elem.appendChild(subentry_elem)
			entry_li_elem.appendChild(details_elem)
			file_tree_elem.appendChild(entry_li_elem)
		} else if (entry.type == "directory") {
			// empty directory
			let entry_li_elem = document.createElement("li")
			entry_li_elem.innerHTML = "🗀 "+basename(entry.name)
			file_tree_elem.appendChild(entry_li_elem)
		} else if (show_files_in_treeview && entry.name) {
			// file/other
			let entry_li_elem = document.createElement("li")
			entry_li_elem.innerHTML = "🖹 "+basename(entry.name)
			file_tree_elem.appendChild(entry_li_elem)
		}
	}
	return file_tree_elem
}
function generate_table(files_list) {
	let file_table_elem = document.createElement("table")

	function add_entry(body, file_name, mode, user, group, size) {
		let tr_elem = document.createElement("tr")
		let file_name_td_elem = document.createElement("td")
		let mode_td_elem = document.createElement("td")
		let user_td_elem = document.createElement("td")
		let group_td_elem = document.createElement("td")
		let size_td_elem = document.createElement("td")
		file_name_td_elem.innerHTML = basename(file_name)
		mode_td_elem.innerHTML = mode
		user_td_elem.innerHTML = user
		group_td_elem.innerHTML = group
		size_td_elem.innerHTML = size
		tr_elem.appendChild(file_name_td_elem)
		tr_elem.appendChild(mode_td_elem)
		tr_elem.appendChild(user_td_elem)
		tr_elem.appendChild(group_td_elem)
		tr_elem.appendChild(size_td_elem)

		body.appendChild(tr_elem)
	}

	let thead_elem = document.createElement("thead")
	add_entry(thead_elem, "Filename", "Mode", "User", "Group", "Size")
	file_table_elem.appendChild(thead_elem)

	let tbody_elem = document.createElement("tbody")
	for (let entry of files_list) {
		add_entry(tbody_elem, entry.name, entry.prot, entry.user, entry.group, entry.size)
	}
	file_table_elem.appendChild(tbody_elem)

	return file_table_elem
}

let file_path_text_input_go_elem = document.getElementById("file_path_text_input_go")
let file_path_text_input_elem = document.getElementById("file_path_text_input")
file_path_text_input_go_elem.onclick = function() {
	list_files(file_path_text_input_elem.value)
}
file_path_text_input_elem.onkeyup = function(e) {
	if (e.keyCode == 13) {
		file_path_text_input_go_elem.onclick()
	}
}

function list_files(file_path) {
	file_path_text_input_elem.value = file_path
	let menubar_go_up_button_elem = document.getElementById("menubar_go_up_button")
	menubar_go_up_button_elem.onclick = function() {
		list_files(file_path+"/..")
	}

	let url_args =
		"file_path=" + encodeURIComponent(file_path) +
		"&dirfirst=true" +
		"&humanreadable=true" +
		"&humanreadable=true" +
		"&max_depth=3"
	make_xhr(
		"/cgi-bin/file/get_dir.sh?"+url_args,
		"GET",
		"application/x-www-form-urlencoded",
		undefined,
		function(url, resp) {
			let json_resp = JSON.parse(resp)
			let files_content = json_resp[0].contents
			console.log("files_content", files_content)
			let files_tree_elem = document.getElementById("file-tree")
			let files_table_elem = document.getElementById("file-table")

			let new_files_tree_elem = generate_tree(files_content)
			let new_files_table_elem = generate_table(files_content)

			new_files_tree_elem.id = "file-tree"
			new_files_tree_elem.classList = "tree-view"
			files_tree_elem.replaceWith(new_files_tree_elem)

			new_files_table_elem.id = "file-table"
			files_table_elem.replaceWith(new_files_table_elem)
		}
	)
}
list_files("/")
