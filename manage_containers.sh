#!/bin/bash
REQUIRE_CONFIRM=false
DRYRUN=false
DEFAULT_LXC_TEMPLATE="download"
DEFAULT_LXC_TEMPLATE_ARGS="-d debian -r buster -a amd64 --keyserver keyserver.ubuntu.com"
DEFAULT_POST_INSTALL_SCRIPT="onboard.sh"
BACKTITLE="Manage LXC containers on $HOSTNAME"
USERNAME="max"
DIALOG="dialog"

#TODO: forward(iptables), backup

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


# scripts for working with LXC
function lxc_confirm() {
	if $REQUIRE_CONFIRM; then
		if dialog --yesno "About to run command:\n\n${*}" 0 0; then
			if ! $DRYRUN; then
				"$@"
			fi
		fi
	else
		if ! $DRYRUN; then
			"$@"
		fi
	fi
}
function lxc_exec() {
	lxc_confirm lxc-attach --clear-env -n $1 -- ${@:2}
}
function lxc_copy_from_host() {
	container=$1
	source="${2}"
	target="${3}"
	if $REQUIRE_CONFIRM; then
		if ! dialog --yesno "About to copy file:\n\nFrom host: ${source}\nTo $container: ${target}" 0 0; then
			return
		fi
	fi
	lxc-attach --clear-env -n $container -- /bin/bash -c "cat - > \"${target}\"" < "${source}"
}
function lxc_copy_to_host() {
	container=$1
	source="${2}"
	target="${3}"
	if $REQUIRE_CONFIRM; then
		if ! dialog --yesno "About to copy file:\n\nFrom $container: ${source}\nTo host: ${target}" 0 0; then
			return
		fi
	fi
	lxc-attach --clear-env -n $container -- /bin/cat "${source}" > "${target}"
}
function lxc_run_script_in_container() {
	container=$1
	source="${2}"
	target="/tmp/$(basename ${source})"
	lxc_copy_from_host $container "${source}" "${target}"
	lxc_exec $container /bin/bash "${target}"
	lxc_exec $container /bin/rm "${target}"
}
function lxc_list_stopped() {
	lxc-ls -1 --stopped | tr '\n' ' '
}
function lxc_list_running() {
	lxc-ls -1 --active | tr '\n' ' '
}


# scripts that generate or handle the menu
function menu_scripts() {
	container=$1
	script_path="$(menu_single "Script list:" scripts/*.sh)"
	if [ "${script_path}" == "" ]; then
		script_path="$(textinput "Enter script path manually:")"
		[ "${script_path}" == "" ] && return
	fi
	lxc_run_script_in_container $1 "$script_path"
	echo
	echo "Press enter to return."
	echo
	read
}
function menu_running() {
	container=$(menu_single "Running LXC containers:" $(lxc_list_running))
	if [ "${container}" == "" ]; then
		msgbox "No running containers!"
		return;
	fi

	while true; do
		action=$(menu "Running container \"$container\"" \
			"info"		"show info" \
			"root"		"get a root shell" \
			"user"		"get a user shell" \
			"copy_to"	"copy file to container" \
			"copy_from"	"copy file from container" \
			"scripts"	"copy a shell script and run it" \
			"restart"	"restart the container" \
			"kill"		"kill the container" \
			"stop"		"stop the container" )

		if [ "${action}" = "info" ]; then
			msgbox "$(lxc-info -n $container)"
		elif [ "${action}" = "root" ]; then
			lxc_confirm lxc-attach -n $container -- login -f root
		elif [ "${action}" = "user" ]; then
			lxc_confirm lxc-attach -n $container -- login -f $USERNAME
		elif [ "${action}" = "copy_to" ]; then
			host_path="$(inputbox "Please enter the path on the host:")"
			[ "${host_path}" == "" ] && return
			container_path="$(inputbox "Please enter the path in the container:")"
			[ "${host_path}" == "" ] && return
			lxc_copy_from_host $container "${host_path}" "${container_path}"
		elif [ "${action}" = "copy_from" ]; then
			container_path="$(inputbox "Please enter the path in the container:")"
			[ "${container_path}" == "" ] && return
			host_path="$(inputbox "Please enter the path on the host:")"
			[ "${host_path}" == "" ] && return
			lxc_copy_to_host $container "${container_path}" "${host_path}"
		elif [ "${action}" = "scripts" ]; then
			menu_scripts $container
		elif [ "${action}" = "restart" ]; then
			lxc_confirm lxc-stop -r -n $container
			break
		elif [ "${action}" = "kill" ]; then
			lxc_confirm lxc-stop -k -n $container
			break
		elif [ "${action}" = "stop" ]; then
			lxc_confirm lxc-stop -n $container
			break
		elif [ "${action}" = "" ]; then
			break
		fi
	done
}
function menu_stopped() {
	container=$(menu_single "Stopped LXC containers:" $(lxc_list_stopped))
	if [ "${container}" == "" ]; then
		msgbox "No stopped containers!"
		return;
	fi

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
			lxc_confirm lxc-execute -n $container -- login -f root
		elif [ "${action}" = "user" ]; then
			lxc_confirm lxc-execute -n $container -- login -f $USERNAME
		elif [ "${action}" = "start" ]; then
			lxc_confirm lxc-start -n $container
			break
		elif [ "${action}" = "edit" ]; then
			editor "/var/lib/lxc/$container/config"
		elif [ "${action}" = "clone" ]; then
			new_container="$(inputbox "Please enter a name for the new container:")"
			if [ "${new_container}" != "" ]; then
				lxc_confirm -n $container -N $new_container
				container=$new_container
			fi
		elif [ "${action}" = "rename" ]; then
			new_container="$(inputbox "Please enter a new name for the container:")"
			if [ "${new_container}" != "" ]; then
				lxc_confirm -R -n $container -N $new_container
				container=$new_container
			fi
		elif [ "${action}" = "destroy" ]; then
			confirm_container="$(inputbox "Destroy container $container?\nThe rootfs will be deleted.\nThis can't be undone!\n\nTo confirm, please enter the name of the container.")"
			if [ "${confirm_container}" = "${container}" ]; then
				lxc_confirm lxc-destroy -n $container
			fi
			break
		elif [ "${action}" = "" ]; then
			break
		fi
	done
}
function menu_create() {
	container="$(inputbox "Please enter a name for the new container:")"
	["${container}" = ""] && return
	template="$(inputbox "Enter the LXC template to use:" "${DEFAULT_LXC_TEMPLATE}")"
	template_args="$(inputbox "Extra arguments for template:" "${DEFAULT_LXC_TEMPLATE_ARGS}")"
	lxc_confirm lxc-create -n $container -t $template -- $template_args
	if yesno "Start container now?"; then
		lxc_confirm lxc-start -n ${container}
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
function menu_main() {
	while true; do
		selected=$(menu "Main menu" \
			"running"	"Manage running contaners" \
			"stopped"	"Manage stopped contaners" \
			"create"	"Create a new container" \
			"edit"		"Edit host default LXC config" \
			"confirm"	"Ask before running LXC commands" )

		if [ "${selected}" = "running" ]; then
			menu_running
		elif [ "${selected}" = "stopped" ]; then
			menu_stopped
		elif [ "${selected}" = "create" ]; then
			menu_create
		elif [ "${selected}" = "edit" ]; then
			editor "/etc/lxc/default.conf"
		elif [ "${selected}" = "confirm" ]; then
			msgbox "You will be asked before any LXC command."
			REQUIRE_CONFIRM=true
		elif [ "${selected}" = "" ]; then
			echo "bye"
			break
		fi
	done
}

# launch main menu
menu_main
