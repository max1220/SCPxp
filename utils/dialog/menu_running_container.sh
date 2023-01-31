

# show a menu for a container, listing the available scripts in
# the SCRIPTS_DIR, and when selected run that script on the container.
# $1 is the container name
function menu_scripts() {
	container="${1}"
	scripts_list=("${SCRIPTS_DIR}"/*.sh)
	script_path="$(menu_single "Script list:" "${scripts_list[@]}")"
	if [ "${script_path}" = "" ]; then
		script_path="$(fselect "Please specify script path:")"
	fi
	[ ! -f "${script_path}" ] && return 1
	lxc_run_script_in_container "${1}" "${script_path}"
}


# first, let the user select a container from the list of running
# containers, then show a menu for the speciied running container.
function menu_running_container() {
	local container="${1}" action
	action="$(menu "Running container \"${container}\"" \
		"info"		"show info" \
		"root"		"get a root shell" \
		"user"		"get a user shell" \
		"copy_to"	"copy file to container" \
		"copy_from"	"copy file from container" \
		"scripts"	"copy a shell script to container and run it" \
		"forward"	"Add a temporary port forward for the container" \
		"restart"	"restart the container" \
		"kill"		"kill the container" \
		"stop"		"stop the container"
	)"

	case "${action}" in
		info)
			msgbox "$(lxc-info -n "${container}")"
			;;
		root)
			lxc_attach_container "${container}" su --login root
			;;
		user)
			lxc_attach_container "${container}" su --login "${USERNAME}"
			;;
		copy_to)
			host_path="$(fselect "Please select source path on the host:")"
			container_path="$(inputbox "Please enter target path on container:")"
			[ "${container_path}" != "" ]
			lxc_copy_from_host "${container}" "${host_path}" "${container_path}"
			;;
		copy_from)
			container_path="$(inputbox "Please enter the source path in the container:")"
			[ "${container_path}" != "" ]
			host_path="$(fselect "Please select target path on the host:")"
			lxc_copy_to_host "${container}" "${container_path}" "${host_path}"
			;;
		scripts)
			menu_scripts "${container}"
			;;
		forward)
			menu_port_forward "${container}"
			;;
		restart)
			lxc_restart_container "${container}"
			return 1
			;;
		kill)
			lxc_kill_container "${container}"
			return 1
			;;
		stop)
			lxc_stop_container "${container}"
			return 1
			;;
		*)
			return 1
			;;
	esac

}
