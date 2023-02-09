let sessions_list_elem = document.getElementById("sessions_list")
let sessions_list_content_elem = document.getElementById("session_list_content")



// run a tmux command in control mode and capture it's output
function run_tmux_command(command_args, cb, err_cb) {
	let req_body = []
	for (let command_arg of command_args) {
		if (command_arg !== "") {
			req_body.push("arg="+encodeURIComponent(command_arg))
		}
	}
	req_body = req_body.join("&")

	return make_xhr(
		"/cgi-bin/tmux/run_command.sh",
		"POST",
		"application/x-www-form-urlencoded",
		req_body,
		function(url, resp) {
			let cur_lines = undefined
			let cur_meta = undefined
			let contents = []
			let contents_meta = []
			let errors = []
			let errors_meta = []
			let other_lines = []

			let lines = resp.trim().split("\n")
			for (let line of lines) {
				if (line.startsWith("%begin ")) {
					cur_lines = []
					cur_meta = line
				} else if (line.startsWith("%end ")) {
					contents.push(cur_lines.join("\n"))
					contents_meta.push(cur_meta)
					cur_lines = undefined
					cur_meta = undefined
				} else if (line.startsWith("%error ")) {
					errors.push(cur_lines.join("\n"))
					errors_meta.push(cur_meta)
					cur_lines = undefined
					cur_meta = undefined
				} else if (cur_meta) {
					cur_lines.push(line)
				} else {
					other_lines.push(line)
				}
			}

			if (err_cb && (errors_meta.length>0)) {
				//console.log("run_tmux_command err:", errors)
				err_cb(errors, errors_meta, other_lines)
			} else if (cb) {
				//console.log("run_tmux_command cb:", command_args, "-", contents)
				cb(contents, contents_meta, other_lines)
			}
		}
	)
}

// list tmux sessions
function cmd_list_sessions(cb, err_cb) {
	run_tmux_command([
		"list-sessions",
		"-F",
		"#{session_name}"
	], cb, err_cb)
}

// kill tmux session
function cmd_kill_session(kill_session_name, cb, err_cb) {
	run_tmux_command([
		"kill-session",
		"-t",
		kill_session_name,
	], cb, err_cb)
}



// list current sessions
function update_table() {
	cmd_list_sessions(function(resp) {
		sessions_list_content_elem.innerHTML = ""
		if ((!resp) || (!resp[0])) {
			let row = sessions_list_content_elem.insertRow()
			row.insertCell().innerText = "No sessions"
			row.insertCell()
			return;
		}
		let resp_lines = resp[0].split("\n")
		for (let session_name of resp_lines) {
			let row = sessions_list_content_elem.insertRow()
			let session_name_cell = row.insertCell()
			let session_kill_cell = row.insertCell()

			let session_name_link = document.createElement("a")
			session_name_link.target = "make_new_win"
			session_name_link.href = "/static/html/xp/terminal.html#" + encodeURIComponent(session_name)
			session_name_link.innerText = session_name
			session_name_cell.appendChild(session_name_link)

			let session_kill_button = document.createElement("button")
			session_kill_button.classList = "btn"
			session_kill_button.target = "make_new_win"
			session_kill_button.onclick = function() {
				cmd_kill_session(session_name, function() {
					update_table()
				})
			}
			session_kill_button.innerText = "Kill"
			session_kill_cell.appendChild(session_kill_button)
		}
		fix_link_targets_iframe()
	})
}

// give the buttons some time to work server-side before reloading the table values
function update_table_delay() { window.setTimeout(function() { update_table() }, 500) }

// update table immediatly and every 5seconds afterwards
update_table()
window.setInterval(function() {
	update_table()
}, 5000)
