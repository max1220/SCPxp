let sessions_list_elem = document.getElementById("sessions_list")
let sessions_list_content_elem = document.getElementById("session_list_content")

// create a new tmux session
function list_sessions(cb) {
	console.log("Listing sessions...")
	make_xhr(
		"/cgi-bin/tmux/list_sessions.sh",
		"POST",
		"application/x-www-form-urlencoded",
		"",
		function(url, resp) {
			console.log("Sessions listed!")
			if (!cb) { return; }
			let decoded_obj = JSON.parse(resp)
			if (decoded_obj && decoded_obj.success) {
				cb(decoded_obj)
			}
		}
	)
}

// kill an existing tmux session
function kill_session(session_name, cb) {
	console.log("Killing session...", session_name)
	const req_body = "session_name=" + encodeURIComponent(session_name)
	make_xhr(
		"/cgi-bin/tmux/kill_session.sh",
		"POST",
		"application/x-www-form-urlencoded",
		req_body,
		function(url, resp) {
			console.log("Killed session!")
			if (!cb) { return; }
			let decoded_obj = JSON.parse(resp)
			if (decoded_obj && decoded_obj.success) {
				cb(decoded_obj)
			}
		}
	)
}

// list current sessions
function update_table() {
	list_sessions(function(resp) {
		console.log(resp)
		sessions_list_content_elem.innerHTML = ""
		for (let session of resp.sessions) {
			var row = sessions_list_content_elem.insertRow(0)
			var session_name_cell = row.insertCell(0)
			var session_kill_cell = row.insertCell(1)
			session_name_cell.innerHTML = "<a target=\"make_new_win\" href=\"/static/html/xp/terminal.html#" + session + "\">" + session + "</a>"
			session_kill_cell.innerHTML = "<button class=\"btn\" onclick=\"kill_session('" + session + "');update_table_delay()\">Stop</button>"
		}
		fix_link_targets_iframe()
	})
}

// give the buttons some time to work server-side before reloading the table values
function update_table_delay() { window.setTimeout(function() { update_table() }, 500) }

// update table immediatly and every 5seconds afterwards
update_table()
window.setInterval(function() { update_table() }, 5000)

