#!/bin/bash
REQUIRE_CONFIRM=false
DRYRUN=false
DEFAULT_LXC_TEMPLATE="download"
DEFAULT_LXC_TEMPLATE_ARGS="-d debian -r buster -a amd64 --keyserver keyserver.ubuntu.com"
DEFAULT_POST_INSTALL_SCRIPT="scripts/onboard.sh"
BACKTITLE="Manage LXC containers on $HOSTNAME"
USERNAME="max"
SCRIPTS_DIR="scripts"
DIALOG="dialog"

#TODO: forward(iptables), backup/snapshot(btrfs?), restart

# utillities for working with the dialog util
function menu() {
	$DIALOG --backtitle "${BACKTITLE}" --stdout --menu "${1}" 0 0 0 "${@:2}"
}
function menu_single() {
	$DIALOG --backtitle "${BACKTITLE}" --stdout --no-items --menu "${1}" 0 0 0 "${@:2}"
}
function msgbox() {
	$DIALOG --msgbox "${1}" 0 0
}
function inputbox() {
	$DIALOG --stdout --inputbox "${1}" 0 0 "${2}"
}
function yesno() {
	$DIALOG --yesno "${1}" 0 0
}



# all lxc commands that modify the system should be run through this function.
# it makes sure that, if enabled, the user can confirm the execution of LXC commands(or prevent it)
# it also only runs the command if it's not a DRYRUN.
function ask_confirm_exec() {
	if $REQUIRE_CONFIRM; then
		if dialog --yesno "About to run command:\n\n${*}" 0 0; then
			if $DRYRUN; then
				echo "DRYRUN: ${*}" 1>&2;
			else
				"$@"
			fi
		fi
	else
		if $DRYRUN; then
			echo "DRYRUN: ${*}" 1>&2;
		else
			"$@"
		fi
	fi
}

# scripts for working with LXC

# run a command in an LXC container
function lxc_exec() {
	ask_confirm_exec lxc-attach --clear-env -n $1 -- ${@:2}
}
# copy a file from the host to the container
function lxc_copy_from_host() {
	container=$1 ; source="${2}" ; target="${3}"
	if $REQUIRE_CONFIRM; then
		if ! dialog --yesno "About to copy file:\n\nFrom host: ${source}\nTo $container: ${target}" 0 0; then
			return
		fi
	fi
	lxc-attach --clear-env -n $container -- /bin/bash -c "cat - > \"${target}\"" < "${source}"
}
# copy a file from a container to the host
function lxc_copy_to_host() {
	container=$1 ; source="${2}" ; target="${3}"
	if $REQUIRE_CONFIRM; then
		if ! dialog --yesno "About to copy file:\n\nFrom $container: ${source}\nTo host: ${target}" 0 0; then
			return
		fi
	fi
	lxc-attach --clear-env -n $container -- /bin/cat "${source}" > "${target}"
}
# run a script from the host in a container, by copying it to /tmp in the container and running it
function lxc_run_script_in_container() {
	container=$1 ; source="${2}"
	target="/tmp/$(basename ${source})"
	lxc_copy_from_host $container "${source}" "${target}"
	lxc_exec $container /bin/bash "${target}"
	lxc_exec $container /bin/rm "${target}"
}
# list all stopped containers to stdout(seperated by space)
function lxc_list_stopped() {
	lxc-ls -1 --stopped | tr '\n' ' '
}
# list all running containers to stdout(seperated by space)
function lxc_list_running() {
	lxc-ls -1 --active | tr '\n' ' '
}


# scripts that generate or handle the menu

# show a menu for a container, listing the available scripts to run on this container
function menu_scripts() {
	container=$1
	script_path="$(menu_single "Script list:" $SCRIPTS_DIR/*.sh)"
	if [ "${script_path}" = "" ]; then
		script_path="$(textinput "Enter script path manually:")"
		[ "${script_path}" = "" ] && return
	fi
	lxc_run_script_in_container $1 "$script_path"
	echo
	echo "Press enter to return."
	echo
	read
}
# first, let the user select a container from the list of running containers,
# then show a menu for the specified running container.
function menu_running() {
	container=$(menu_single "Running LXC containers:" $(lxc_list_running))
	[ "${container}" = "" ] && return;

	while true; do
		action=$(menu "Running container \"$container\"" \
			"info"		"show info" \
			"root"		"get a root shell" \
			"user"		"get a user shell" \
			"copy_to"	"copy file to container" \
			"copy_from"	"copy file from container" \
			"scripts"	"copy a shell script and run it" \
			"forward"	"Add a temporary port forward for the container" \
			"restart"	"restart the container" \
			"kill"		"kill the container" \
			"stop"		"stop the container" )

		if [ "${action}" = "info" ]; then
			msgbox "$(lxc-info -n $container)"
		elif [ "${action}" = "root" ]; then
			ask_confirm_exec lxc-attach -n $container -- login -f root
		elif [ "${action}" = "user" ]; then
			ask_confirm_exec lxc-attach -n $container -- login -f $USERNAME
		elif [ "${action}" = "copy_to" ]; then
			host_path="$(inputbox "Please enter the path on the host:")"
			[ "${host_path}" = "" ] && return
			container_path="$(inputbox "Please enter the path in the container:")"
			[ "${host_path}" = "" ] && return
			lxc_copy_from_host $container "${host_path}" "${container_path}"
		elif [ "${action}" = "copy_from" ]; then
			container_path="$(inputbox "Please enter the path in the container:")"
			[ "${container_path}" = "" ] && return
			host_path="$(inputbox "Please enter the path on the host:")"
			[ "${host_path}" = "" ] && return
			lxc_copy_to_host $container "${container_path}" "${host_path}"
		elif [ "${action}" = "scripts" ]; then
			menu_scripts $container
		elif [ "${action}" = "forward" ]; then
			container_port="$(inputbox "Please enter the port in the container:")"
			[ "${container_port}" = "" ] && return
			host_port="$(inputbox "Please enter the port on the host:")"
			[ "${host_port}" = "" ] && return

			port_forward="$(echo "${container_port}:${container}:${host_port}" | ./port_forwards.sh)"
			if dialog --yesno "Generated iptable rule:\n\n${port_forward}\n\nApply now?" 0 0; then
				echo "Running: ${port_forward}"
				$port_forward
				echo
				echo "Press enter to return."
				echo
				read
			fi
		elif [ "${action}" = "restart" ]; then
			ask_confirm_exec lxc-stop -r -n $container
			break
		elif [ "${action}" = "kill" ]; then
			ask_confirm_exec lxc-stop -k -n $container
			break
		elif [ "${action}" = "stop" ]; then
			ask_confirm_exec lxc-stop -n $container
			break
		elif [ "${action}" = "" ]; then
			break
		fi
	done
}
# first, let the user select a container from the list of stopped containers,
# then show a menu for the specified stopped container.
function menu_stopped() {
	container=$(menu_single "Stopped LXC containers:" $(lxc_list_stopped))
	[ "${container}" = "" ] && return;

	while true; do
		action=$(menu "Stopped container \"$container\"" \
			"info"		"show info" \
			"root"		"get a root shell" \
			"user"		"get a user shell" \
			"start"		"start the container" \
			"edit"		"edit configuration in an editor" \
			"clone"		"duplicate the container" \
			"rename"	"rename the container" \
			"destroy"	"delete the container(including data!)" )

		if [ "${action}" = "info" ]; then
			msgbox "$(lxc-info -n $container)"
		elif [ "${action}" = "root" ]; then
			ask_confirm_exec lxc-execute -n $container -- login -f root
		elif [ "${action}" = "user" ]; then
			ask_confirm_exec lxc-execute -n $container -- login -f $USERNAME
		elif [ "${action}" = "start" ]; then
			ask_confirm_exec lxc-start -n $container
			break
		elif [ "${action}" = "edit" ]; then
			editor "/var/lib/lxc/$container/config"
		elif [ "${action}" = "clone" ]; then
			new_container="$(inputbox "Please enter a name for the new container:")"
			if [ "${new_container}" != "" ]; then
				ask_confirm_exec -n $container -N $new_container
				container=$new_container
			fi
		elif [ "${action}" = "rename" ]; then
			new_container="$(inputbox "Please enter a new name for the container:")"
			if [ "${new_container}" != "" ]; then
				ask_confirm_exec -R -n $container -N $new_container
				container=$new_container
			fi
		elif [ "${action}" = "destroy" ]; then
			confirm_container="$(inputbox "Destroy container $container?\nThe rootfs will be deleted.\nThis can't be undone!\n\nTo confirm, please enter the name of the container.")"
			if [ "${confirm_container}" = "${container}" ]; then
				ask_confirm_exec lxc-destroy -n $container
			fi
			break
		elif [ "${action}" = "" ]; then
			break
		fi
	done
}
# the container creation "wizard"
function menu_create() {
	container="$(inputbox "Please enter a name for the new container:")"
	["${container}" = ""] && return
	template="$(inputbox "Enter the LXC template to use:" "${DEFAULT_LXC_TEMPLATE}")"
	template_args="$(inputbox "Extra arguments for template:" "${DEFAULT_LXC_TEMPLATE_ARGS}")"
	ask_confirm_exec lxc-create -B best -n $container -t $template -- $template_args
	if yesno "Start container now?"; then
		ask_confirm_exec lxc-start -n ${container}
		post_install_script="$(inputbox "Run post-install script?" "${DEFAULT_POST_INSTALL_SCRIPT}")"
		if [ "${post_install_script}" != "" ]; then
			lxc_run_script_in_container $container ${post_install_script}
			echo
			echo "Press enter to return."
			echo
			read
		fi
	fi
}
# the main menu
function menu_main() {
	while true; do
		selected=$(menu "Main menu" \
			"running"	"Manage running contaners" \
			"stopped"	"Manage stopped contaners" \
			"create"	"Create a new container" \
			"edit"		"Edit host default LXC config" \
			"confirm"	"Ask before running LXC commands" )

		if [ "${selected}" = "running" ]; then
			running="$(lxc_list_running)"
			if [ "${running}" = "" ]; then
				msgbox "No running containers";
			else
				menu_running
			fi
		elif [ "${selected}" = "stopped" ]; then
			stopped="$(lxc_list_stopped)"
			if [ "${stopped}" = "" ]; then
				msgbox "No stopped containers"
			else
				menu_stopped
			fi
		elif [ "${selected}" = "create" ]; then
			menu_create
		elif [ "${selected}" = "edit" ]; then
			editor "/etc/lxc/default.conf"
		elif [ "${selected}" = "confirm" ]; then
			msgbox "You will be asked before any LXC command."
			REQUIRE_CONFIRM=true
		elif [ "${selected}" = "" ]; then
			break
		fi
	done
}

# launch main menu
menu_main
