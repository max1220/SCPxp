// create a new tmux session
function list_containers(cb) {
	console.log("Listing containers...")
	make_xhr(
		"/cgi-bin/lxc/list.sh",
		"GET",
		"application/x-www-form-urlencoded",
		"",
		function(url, resp) {
			console.log("Containers listed!")
			if (!cb) { return; }
			let decoded_obj = JSON.parse(resp)
			if (decoded_obj && decoded_obj.success) {
				cb(decoded_obj)
			}
		}
	)
}

function update_table() {
	let container_table_content_elem = document.getElementById("container_table_content")
	container_table_content_elem.innerHTML = ""

	list_containers(function(resp) {
		console.log("resp:", resp)
		for (let stopped_container of resp.stopped_containers) {
			var stopped_container_row = container_table_content_elem.insertRow(0)
			var stopped_container_name_cell = stopped_container_row.insertCell(0)
			var stopped_container_status_cell = stopped_container_row.insertCell(1)
			var stopped_container_info_cell = stopped_container_row.insertCell(2)
			stopped_container_name_cell.innerHTML = stopped_container
			stopped_container_status_cell.innerHTML = "stopped"
			stopped_container_info_cell.innerHTML = "<a class=\"btn\" target=\"make_new_win\" href=\"/static/html/xp/lxc_info.html#" + encodeURIComponent(stopped_container) + "\">Info</a>"
		}
		for (let running_container of resp.running_containers) {
			var running_container_row = container_table_content_elem.insertRow(0)
			var running_container_name_cell = running_container_row.insertCell(0)
			var running_container_status_cell = running_container_row.insertCell(1)
			var running_container_info_cell = running_container_row.insertCell(2)
			running_container_name_cell.innerHTML = running_container
			running_container_status_cell.innerHTML = "running"
			running_container_info_cell.innerHTML = "<a class=\"btn\" target=\"make_new_win\" href=\"/static/html/xp/lxc_info.html#" + encodeURIComponent(running_container) + "\">Info</a>"
		}
		fix_link_targets_iframe()
	})
}


// give the buttons some time to work server-side before reloading the table values
function update_table_delay() { window.setTimeout(function() { update_table() }, 500) }

// update table immediatly and every 5seconds afterwards
update_table()
window.setInterval(function() { update_table() }, 5000)
