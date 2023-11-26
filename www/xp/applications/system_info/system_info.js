let cgi_commands = new CgiCommands(CGI_BACKEND)

function update_element(name, value) {
	let elems = document.getElementsByClassName("update-"+name)
	for (let i=0;i<elems.length;i++) {
		let elem = elems[i]
		elem.innerText = value
	}
}

function refresh_system_info() {
	// gather some system info(as a single command to save on XHRs)
	let cmd = [
		"eval",
		". /etc/os-release",
		";",
		"echo $HOSTNAME",
		";",
		"echo $USER",
		";",
		"cat /proc/loadavg",
		";",
		"cat /proc/meminfo | grep -F Mem",
		";",
		"cat /proc/cpuinfo | grep -F \"model name\" | head -n1 ",
		";",
		"echo $PRETTY_NAME",
		";",
		"echo $HOME_URL",
		";",
		"uname -s -r",
		";",
		"uptime -p"
	]
	cgi_commands.run_command_async(function(resp_str) {
		console.log("resp_str",resp_str)
		let lines = resp_str.split(/\r?\n/)
		update_element("HOSTNAME", lines[0])
		update_element("USERNAME", lines[1])

		let loadavg_segs = lines[2].split(" ")
		let loadavg_1 = loadavg_segs[0]
		let loadavg_5 = loadavg_segs[1]
		let loadavg_15 = loadavg_segs[2]
		update_element("LOADAVG_1", loadavg_1)
		update_element("LOADAVG_5", loadavg_5)
		update_element("LOADAVG_15", loadavg_15)

		let memory_total  = lines[3].split(":")[1].trim()
		let memory_free  = lines[4].split(":")[1].trim()
		let memory_available  = lines[5].split(":")[1].trim()
		update_element("MEM_TOTAL", memory_total)
		update_element("MEM_FREE", memory_free)
		update_element("MEM_AVAILABLE", memory_available)

		let cpu_model = lines[6].split(":")[1].trim()
		update_element("CPU_MODEL", cpu_model)

		let os_name = lines[7]
		update_element("OS_NAME", os_name)
		let os_home = lines[8]
		update_element("OS_HOME", os_home)

		let kernel = lines[9]
		update_element("KERNEL", kernel)

		let uptime = lines[10]
		update_element("UPTIME", uptime)
	}, cmd)
}

function refresh_process() {
	let cmd = ["ps", "-aux"]
	cgi_commands.run_command_async(function(resp_str) {
		update_element("PROCESS", resp_str)
	}, cmd)
}

function refresh_filesystem() {
	let cmd = ["df", "-h"]
	cgi_commands.run_command_async(function(resp_str) {
		update_element("FILESYSTEM", resp_str)
	}, cmd)
}

function refresh_interfaces() {
	let cmd = ["ip", "-h", "-s", "-d", "addr"]
	cgi_commands.run_command_async(function(resp_str) {
		update_element("INTERFACES", resp_str)
	}, cmd)

}

function refresh_ports() {
	let cmd = ["ss", "-lpt"]
	cgi_commands.run_command_async(function(resp_str) {
		update_element("PORTS", resp_str)
	}, cmd)
}

function info_tab_onlick() {
	let controls = event.target.getAttribute("aria-controls")
	if (controls=="tab-system") {
		refresh_system_info()
	} else if (controls=="tab-process") {
		refresh_process()
	} else if (controls=="tab-filesystem") {
		refresh_filesystem()
	} else if (controls=="tab-interfaces") {
		refresh_interfaces()
	} else if (controls=="tab-ports") {
		refresh_ports()
	} else {
		console.log("other tab clicked!")
	}
	return tab_onlick();
}

// called by the WM when the window is loaded
function win_load() {
	win.title = "System Info"
	win.icon = "application-system-info"
	win.resizeable = false
	win.resize(500, 410)
	win.update()
}
function body_onload() {
	refresh_system_info()
}
