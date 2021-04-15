#!/usr/bin/env lua

--[[ Generic utillity functions ]]

local function quote(str)
	return "\""..tostring(str):gsub("%c", function(char)
		if char == "\n" then
			return "\\n"
		end
		return "\\"..char:byte()
	end).."\""
end
local function trim(str)
	return (str:gsub("^%s*(.-)%s*$", "%1"))
end
local function exec(cmd)
	local exit51, _, exit52 = os.execute(cmd)
	-- lua versions >= 5.2 return the exit code as third argument
	if exit52 then
		return exit52
	end
	return exit51
end
local function popen(cmd)
	return io.popen(cmd)
end
local function basename(path)
	local f = popen("basename " .. path)
	local line = f:read("*l")
	f:close()
	if line and #line>0 then
		return line
	end
end
local function file_exists(path)
	local f = io.open(path, "r")
	if f then
		f:close()
		return true
	end
end
local function editor(path)
	return exec("nano "..path)
end


--[[ utillity functions for using the dialog utils ]]

local function dialog_exec(cmd)
	return exec("dialog --backtitle \"Manage LXC containers\" "..cmd)
end
local function dialog_popen(cmd)
	return popen("dialog --stdout --backtitle \"Manage LXC containers\" "..cmd)
end
local function show_menu(title, list, no_tags)
	local cmd = (no_tags and "--no-tags " or "") .. "--menu " .. quote(title) .. " 0 0 0 "
	for k,v in ipairs(list) do
		cmd = cmd .. quote(v[1]) .. " " .. quote(v[2])
		if k~= #list then
			cmd = cmd .. " "
		end
	end
	local p = dialog_popen(cmd)
	local data = p:read("*a")
	if data and data ~= "" then
		return data
	end
end
local function msgbox(text)
	local cmd = ("--msgbox %s 0 0"):format(quote(text))
	return dialog_exec(cmd)==0
end
local function text_input(prompt, init)
	local p = dialog_popen(("--inputbox %s 0 0 %s"):format(quote(prompt), init or ""))
	return p:read("*a")
end
local function yesno(text)
	local cmd = ("--yesno %s 0 0"):format(quote(text))
	return dialog_exec(cmd)==0
end

local function ask_error_confirm(err)
	print(("-"):rep(80))
	print("An error occured", err or "")
	print("Press enter to return")
	print(("-"):rep(80))
	io.flush()
	io.read()
end


--[[ functions for running LXC commands(asks for confirmation before running any command if enabled) ]]

local confirm_mode = nil --"confirm"/timeout/nil
local function lxc_confirm(cmd)
	if confirm_mode == "confirm" then
		--assert(msgbox("About to run command(^c to abort): \n"..cmd))
		io.write("\nAbout to run command(enter to confirm, abort using ^c):\n# " .. cmd)
		io.flush()
		io.read()
	elseif tonumber(confirm_mode) then
		print("(abort using ^c)")
		exec("sleep " .. tonumber(confirm_mode))
	end
end
local function lxc_exec(cmd)
	lxc_confirm(cmd)
	return exec(cmd)
end
local function lxc_popen(cmd)
	lxc_confirm(cmd)
	return popen(cmd)
end
local function wrap_in_bash(cmd)
	return "/bin/bash -c \"" .. cmd .. "\""
end
-- run a command inside a container using lxc-execute
local function lxc_execute_cmd(container, cmd)
	return lxc_exec("lxc-execute -n " .. container .. " -- " .. cmd)
end
local function lxc_attach_cmd(container, cmd)
	return lxc_exec("lxc-attach --clear-env -n " .. container .. " -- " .. cmd)
end


--[[ Utils for interacting with LXC containers ]]

-- get a list of all containers, seperated into running and stopped containers
local function lxc_get_container_list()
	local f = lxc_popen("lxc-ls -1 --active")
	local active = {}
	for line in f:lines() do
		table.insert(active, line)
	end
	f = lxc_popen("lxc-ls -1 --stopped")
	local stopped = {}
	for line in f:lines() do
		table.insert(stopped, line)
	end
	return active,stopped
end

-- get info about a container(IP, stats, etc.) using lxc-info
local function lxc_get_container_info(container)
	local f = lxc_popen("lxc-info -n " .. quote(container))
	local container_info = {}
	for line in f:lines() do
		local k,v = line:match("^(.*):(.*)$")
		assert(k and v, "info match failed: \"" .. line .. "\"")
		k,v = trim(k), trim(v)
		container_info[k] = v
	end
	return container_info
end

-- show a nicely formatted dialog with the container info
local function lxc_show_container_info(container)
	local container_info = lxc_get_container_info(container)
	local info_str = {}
	local function append(key)
		info_str[#info_str+1] = ("%.14s: %s"):format(tostring(key), tostring(container_info[key] or "none"))
	end
	append("Name")
	append("State")
	append("IP")
	append("Link")
	append("PID")
	info_str[#info_str+1] = ""
	append("CPU Use")
	append("CPU Use")
	append("Memory use")
	info_str[#info_str+1] = ""
	append("BlkIO use")
	append("KMem use")
	append("RX bytes")
	append("TX bytes")
	msgbox(table.concat(info_str, "\n"))
end

-- copy a file from a container to the host
local function lxc_copy_to_host(container, container_path, host_path, container_exec_cmd)
	container_exec_cmd = container_exec_cmd or lxc_execute_cmd
	return container_exec_cmd(container, wrap_in_bash("cat " .. container_path) .. " > " .. host_path)
end

-- copy a file from the host to a container
local function lxc_copy_from_host(container, host_path, container_path, container_exec_cmd)
	container_exec_cmd = container_exec_cmd or lxc_execute_cmd
	return container_exec_cmd(container, wrap_in_bash("cat - > " .. container_path) .. " < " .. host_path)
end

-- copy a script from the host to the container, and run it(delete afterwards)
local function lxc_run_script_in_container(container, host_script_path, container_exec_cmd, dialog)
	local container_path = "/tmp/"..basename(host_script_path)
	container_exec_cmd = container_exec_cmd or lxc_execute_cmd
	lxc_copy_from_host(container, host_script_path, container_path, container_exec_cmd)
	local ok
	if dialog then
		ok = container_exec_cmd(container, "/bin/bash " .. container_path .. " 2>&1 | dialog --programbox 25 80")
	else
		ok = container_exec_cmd(container, "/bin/bash " .. container_path)
	end

	container_exec_cmd(container, wrap_in_bash("rm -f "..container_path))

	return ok
end

-- create a .tar backup of the content of the container, copy it to the host, then delete temporary backup file.
local function lxc_create_container_tar(container, backup_name)
	lxc_execute_cmd(container, wrap_in_bash("tar -vc --one-file-system --xattrs -S -f /tmp/backup.tar --exclude=/dev --exclude=/tmp --exclude=/run --exclude=/proc --exclude=/sys /"))
	lxc_copy_to_host(container, "/tmp/backup.tar", backup_name)
	lxc_execute_cmd(container, wrap_in_bash("rm /tmp/backup.tar"))
end


--[[ Functions for showing and handling the menus ]]

-- show a list of scripts in the scripts/ directory if it exists, a text box otherwise
local function select_script_menu()
	if exec("[ -d scripts ]")==0 then
		local f = popen("find scripts/ -type f -perm /u=x")
		local scripts_menu = {{"manual", "Enter manually"}}
		for line in f:lines() do
			table.insert(scripts_menu, {line, basename(line)})
		end
		local script_path = show_menu("Select script", scripts_menu, true)
		if script_path == "manual" then
			script_path = text_input("Please enter the path of the script:")
		end
		return script_path
	else
		return text_input("Please enter the path of the script:")
	end
end

-- show the menu for a stopped container
local function menu_stopped_container(container)
	local menu = {
		{"info", "Show container information"},
		{"edit", "Edit container configuration"},
		{"start", "Start the container"},
		{"copy_to_host", "Copy a file from the container to the host"},
		{"copy_from_host", "Copy a file from the host to the container"},
		{"shell", "Run a shell(using lxc-execute)"},
		{"script", "Copy a script from the host and run it"},
		{"create_tar", "Create a tarball backup of the container root filesystem"},
		{"destroy", "Destroy the container"},
		{"clone", "Clone the container"},
		{"rename", "Rename the container"},
	}
	repeat
		local selected = show_menu("Container " .. container, menu)
		if selected == "info" then
			lxc_show_container_info(container)
		elseif selected == "edit" then
			editor("/var/lib/lxc/" .. container .. "/config")
		elseif selected == "start" then
			lxc_exec("lxc-start -n " .. quote(container))
			break
		elseif selected == "copy_to_host" then
			-- TODO: use a dialog --fselect to select files
			local container_path = text_input("Please enter the source(container) path:")
			local host_path = basename(container_path)
			host_path = text_input("Please enter target(host) path:", host_path)
			lxc_copy_to_host(container, container_path, host_path)
		elseif selected == "copy_from_host" then
			-- TODO: use a dialog --fselect to select files
			local host_path = text_input("Please enter the source(host) path:")
			local container_path = "/tmp/"..basename(host_path)
			container_path = text_input("Please enter target(container) path:", container_path)
			lxc_copy_from_host(container, host_path, container_path)
		elseif selected == "shell" then
			lxc_execute_cmd(container, "/bin/bash -i -l")
		elseif selected == "script" then
			local script_path = select_script_menu()
			local ok = lxc_run_script_in_container(container, script_path)
			if not ok then ask_error_confirm("Can't run script in container!") end
		elseif selected == "create_tar" then
			local backup_name = ("backup_%s_%s.tar"):format(container, os.date("%d_%m_%Y-%H_%M_%S"))
			lxc_create_container_tar(container, backup_name)
		elseif selected == "destroy" then
			local input_name = text_input("This can not be undone.\nPlease type the container name to confirm deleting it")
			assert(container==input_name)
			lxc_exec("lxc-destroy -n " .. container)
			break
		elseif selected == "clone" then
			local new_name = text_input("Please enter a name for the new container:")
			lxc_exec("lxc-copy -n " .. container .. " -N " .. new_name)
		elseif selected == "rename" then
			local new_name = text_input("Please enter the new name for the new container:")
			lxc_exec("lxc-copy -R -n " .. container .. " -N " .. new_name)
			break
		elseif not selected then
			break
		end
	until not selected
end


local function menu_running_container(container)
	local menu = {
		{"info", "Show container information"},
		{"shell", "Get a shell in this container"},
		{"user", "Get a shell as the default non-root user(UID/GID 1000)"},
		{"console", "Get a console in this container"},
		{"script", "Copy a script from the host and run it"},
		{"forward", "Run iptables to add a port forward(temporary!)"},
		{"edit", "Edit container configuration"},
		{"stop", "Stop the container"},
		{"kill", "Kill the container"},
		{"destroy", "Stop and destroy the container"},
	}
	repeat
		local selected = show_menu("Container "..container, menu)
		if selected == "info" then
			lxc_show_container_info(container)
		elseif selected == "edit" then
			editor("/var/lib/lxc/" .. container .. "/config")
		elseif selected == "shell" then
			lxc_exec("lxc-attach --clear-env --keep-var TERM -n " .. container .. " -- su -l ")
		elseif selected == "user" then
			local f = lxc_popen("lxc-attach -n " .. container .. " -- getent passwd 1000 | cut -d: -f1")
			local user = f:read("*a")
			f:close()
			if user then
				lxc_exec("lxc-attach --clear-env --keep-var TERM -n " .. container .. " -- su -l " .. user)
			end
		elseif selected == "script" then
			local script_path = select_script_menu()
			local ok = lxc_run_script_in_container(container, script_path, lxc_attach_cmd)
			if not ok then ask_error_confirm("Can't run script in container!") end
		elseif selected == "console" then
			lxc_exec("lxc-console -t 0 -n " .. container)
		elseif selected == "stop" then
			lxc_exec("lxc-stop -n " .. container)
			break
		elseif selected == "forward" then
			local container_port = text_input("Enter the port on the container")
			local host_port = text_input("Enter the port on the host")
			local f = lxc_popen("echo \"" .. host_port .. ":" .. container .. ":" .. container_port .. "\" | ./port_forwards.sh")
			local iptables_cmd = f:read("*l")
			f:close()
			if yesno("Run iptables command:\n"..iptables_cmd) then
				lxc_exec(iptables_cmd)
			end
		elseif selected == "stop" then
			lxc_exec("lxc-stop -k -n " .. container)
			break
		elseif selected == "destroy" then
			local input_name = text_input("This can not be undone.\nPlease type the container name to confirm deleting it")
			assert(container==input_name)
			lxc_exec("lxc-stop -n " .. container)
			lxc_exec("lxc-destroy -n " .. container)
			break
		end
	until not selected
end

local function menu_running()
	local menu = {}
	local active = lxc_get_container_list()
	if #active == 0 then
		return msgbox("No running containers!")
	end
	for k,v in ipairs(active) do
		table.insert(menu, {tostring(k),tostring(v)})
	end
	local selected = show_menu("Running containers", menu)
	if tonumber(selected) then
		return menu_running_container(active[tonumber(selected)])
	end
end

local function menu_stopped()
	local menu = {}
	local _,stopped = lxc_get_container_list()
	if #stopped == 0 then
		return msgbox("No stopped containers!")
	end
	for k,v in ipairs(stopped) do
		table.insert(menu, {tostring(k),tostring(v)})
	end
	local selected = show_menu("Stopped containers", menu)
	if tonumber(selected) then
		return menu_stopped_container(stopped[tonumber(selected)])
	end
end


local function menu_create()
	-- TODO: Replace with form?
	local container_name = text_input("Please enter a name for the new container:")
	assert(container_name and container_name~="")
	assert(container_name:match("^[a-zA-Z-_0-9]+$"))

	local default_template = "debian"
	local template = text_input("Enter the template to use\nDefault: " .. default_template .. "")
	if not template or template=="" then
		template = default_template
	end

	local default_template_options = "-r stable"
	local template_options = text_input("Enter template options\nDefault: "..default_template_options)
	if not template_options or template_options=="" then
		template_options = default_template_options
	end

	local default_post_install_script = "onboard.sh"
	local post_install_script = text_input("Enter host-path to post-install script\nDefault: "..default_post_install_script)
	if not post_install_script or post_install_script=="" then
		post_install_script = default_post_install_script
	end

	local start = yesno("Start the container after creating?")

	-- create the container
	local ok = lxc_exec("lxc-create -n " .. container_name .. " -t " .. template .. " -- " .. template_options)
	if not ok then ask_error_confirm("Can't create container!") end

	if start then
		ok = lxc_exec("lxc-start -n " .. container_name)
		if not ok then ask_error_confirm("Can't start container!") end
	end

	-- run post-install script, if found
	if post_install_script and file_exists(post_install_script) then
		ok = lxc_run_script_in_container(container_name, post_install_script, start and lxc_attach_cmd or lxc_execute_cmd)
		if not ok then ask_error_confirm("Can't run post_install_script!") end
	end
end

local function menu_main()
	local menu = {
		{"running", "Manage running contaners"},
		{"stopped", "Manage stopped contaners"},
		{"create", "Create a new container"},
		{"edit", "Edit host default LXC config"},
		{"confirm", "Enable asking before running any LXC commands"}
	}
	repeat
		local selected = show_menu("Main menu", menu)
		if selected == "running" then
			menu_running()
		elseif selected == "stopped" then
			menu_stopped()
		elseif selected == "create" then
			menu_create()
		elseif selected == "edit" then
			editor("/etc/lxc/default.conf")
		elseif selected == "confirm" then
			msgbox("Asking before running any LXC command...")
			confirm_mode = "confirm"
			table.remove(menu)
		end
	until not selected
end

print("\027[?1049h")
menu_main()
print("\027[?1049l")
print("Bye!")
