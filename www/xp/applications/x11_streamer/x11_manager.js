// create an application state object with some defaults
let state_obj = {}
let state = new AppState(state_obj)
state.add_key_parameters("create_command", "text", true, true);
state.add_key_parameters("create_desktop_command", "text", true, true);

let cgi_commands = new CgiCommands("/cgi-bin/cgi_command.sh")



/* --- UTILLITY FUNCTIONS --- */

// generate the URL of a X11 stream action
function url_x11_stream_create(cmd, unset_wm) {
	return "/static/html/xp/x11_stream.html" +
		"#session_create_command=" + encodeURIComponent(cmd) +
		(unset_wm ? "&session_create_wm=true" : "") +
		"&auto_create_xvfb=true"
}
function url_x11_stream_connect(session_id) {
	return "/static/html/xp/x11_stream.html" +
		"#session_id=" + encodeURIComponent(session_id) +
		"&auto_connect_session=true"
}

// get a list of created X11 sessions with some info
function list_sessions() {
	let sessions_list_str = cgi_commands.run_command_sync( ["ls", "xsessions/"] )
	if (!sessions_list_str || sessions_list_str=="") { return [] }
	let session_list = sessions_list_str.split("\n")
	let sessions = []
	session_list.forEach(function(session_id) {
		if (session_id=="") { return; }
		let session_pid = cgi_commands.run_command_sync([ "cat", "xsessions/"+session_id+"/pid" ])
		let session_display = cgi_commands.run_command_sync([ "cat", "xsessions/"+session_id+"/display" ])
		let session_command = cgi_commands.run_command_sync([ "cat", "xsessions/"+session_id+"/command"])
		if (session_command == "") { session_command=undefined; }
		sessions.push({
			id: session_id,
			pid: session_pid,
			display: session_display,
			command: session_command
		})
	})
	return sessions
}

// update the session_list_content table with current information
function update_sessions_table() {
	let sessions = list_sessions()
	let session_list_content_elem = document.getElementById("session_list_content")
	session_list_content_elem.innerHTML = ""
	for (let session of sessions) {
		var session_row = session_list_content_elem.insertRow()
		var session_name_cell = session_row.insertCell()
		var session_display_cell = session_row.insertCell()
		var session_kill_cell = session_row.insertCell()

		let session_name_link = document.createElement("a")
		session_name_link.href = url_x11_stream_connect(session.id)
		session_name_link.target = "make_new_win"
		session_name_link.innerText = session.id
		session_name_cell.appendChild(session_name_link)

		session_display_cell.innerText = session.display

		let kill_btn = document.createElement("button")
		kill_btn.classList = "btn"
		kill_btn.innerText = "Kill"
		kill_btn.onclick = function() {
			kill_session(session.id)
		}
		session_kill_cell.appendChild(kill_btn)
	}
	fix_link_targets_iframe()
}

// stop a session by it's ID
function kill_session(session_id) {
	let ret = cgi_commands.run_command_sync( ["eval", "kill \"$(cat xsessions/" + session_id + "/pid)\""] )
}


/* --- EVENT HANDLERS --- */

// button handler to create a new session
function btn_create_from_command() {
	let x11_stream_command_url = url_x11_stream_create(state.data.create_command)
	open(x11_stream_command_url, "make_new_win")
	console.log(x11_stream_command_url)
	setTimeout(update_sessions_table, 500)
}

// button handler to create a new desktop session(Launch only WM)
function btn_create_desktop() {
	let x11_stream_desktop_url = url_x11_stream_create(state.data.create_desktop_command, true)
	open(x11_stream_desktop_url, "make_new_win")
	setTimeout(update_sessions_table, 500)
}

// update the table immediatly and every 5 seconds afterwards
function window_onload() {
	// load the initial configuration values from the HTML data,
	// by calling all onchange functions for input elements with the data-update attribute.
	console.log("Loading state...")
	state.load()
	console.log("Loaded state:", state.data)

	update_sessions_table()
	window.setInterval(function() { update_sessions_table() }, 5000)
}
