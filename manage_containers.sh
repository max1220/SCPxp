#!/bin/bash
set -euo pipefail
# This script show a graphical menu for managing LXC containers.
# It can be run as root to manage "priviledged" containers,
# and can be run as a regular user to manage "unprivileged" containers.
# Menu options are provided to start, stop, create, edit, backup,
# destroy a container etc.

DEFAULT_LXC_TEMPLATE="download"
DEFAULT_LXC_TEMPLATE_ARGS="-d debian -r bullseye -a amd64 --keyserver hkp://keyserver.ubuntu.com"
DEFAULT_POST_INSTALL_SCRIPT="scripts/onboard.sh"
USERNAME="${USER}"
SCRIPTS_DIR="scripts"
BACKUPS_DIR="backups"
LXC_PATH="$(lxc-config lxc.lxcpath)"

DIALOG_BACKTITLE="Manage LXC containers on ${HOSTNAME}"
REQUIRE_CONFIRM=false
DRYRUN=false
WAIT_AFTER_COMMAND=false

# Load required utils
. ./utils/log.sh
. ./utils/lxc.sh
. ./utils/ui_dialog.sh


#TODO: Run in set -eu
#TODO: Make "portable"(change CWD to current script directory)
#TODO: (btrfs) snapshots
#TODO: wait using lxc-wait for start/stop
#TODO: Support graphical dialog alternatives like zenity/yad etc.
#TODO: File dialog for selecting file to upload
#TODO: Mount the CWD in container when running scripts so we can load configs, utils
#TODO: Use generic /lib/systemd/system/lxc@.service for autostart of containers(should work as user as well?)


# show a menu for a container, listing the available scripts in
# the SCRIPTS_DIR, and when selected run that script on the container.
# $1 is the container name
function menu_scripts() {
	container="${1}"
	scripts_list=("${SCRIPTS_DIR}"/*.sh)
	script_path="$(menu_single "Script list:" "${scripts_list[@]}")"
	if [ "${script_path}" = "" ]; then
		script_path="$(textinput "Enter script path manually:")"
	fi
	[ ! -f "${script_path}" ] && return 1
	ask_confirm_exec lxc_run_script_in_container "${1}" "${script_path}"
}


# handle a running container action
# $1 is the container name
# $2 is the action to perform
function running_container_action() {
	container="${1}"
	action="${2}"
	case "${action}" in
		info)
			msgbox "$(lxc-info -n "${container}")"
			;;
		root)
			ask_confirm_exec lxc-unpriv-attach -n "${container}" -- su --login root
			;;
		user)
			ask_confirm_exec lxc-unpriv-attach -n "${container}" -- su --login "${USERNAME}"
			;;
		copy_to)
			host_path="$(inputbox "Please enter the path on the host:")"
			[ "${host_path}" = "" ] && return
			container_path="$(inputbox "Please enter the path in the container:")"
			[ "${host_path}" = "" ] && return
			lxc_copy_from_host "${container}" "${host_path}" "${container_path}"
			;;
		copy_from)
			container_path="$(inputbox "Please enter the path in the container:")"
			[ "${container_path}" = "" ] && return
			host_path="$(inputbox "Please enter the path on the host:")"
			[ "${host_path}" = "" ] && return
			lxc_copy_to_host "${container}" "${container_path}" "${host_path}"
			;;
		scripts)
			menu_scripts "${container}"
			;;
		forward)
			container_port="$(inputbox "Please enter the port in the container:")"
			[ "${container_port}" = "" ] && return
			host_port="$(inputbox "Please enter the port on the host:")"
			[ "${host_port}" = "" ] && return

			port_forward="$(echo "${container_port}:${container}:${host_port}" | ./port_forwards.sh)"
			if yesno "Generated iptable rule:\n\n${port_forward}\n\nApply now?"; then
				ask_confirm_exec "${port_forward}"
			fi
			;;
		restart)
			ask_confirm_exec lxc-stop -r -n "${container}"
			;;
		kill)
			ask_confirm_exec lxc-stop -k -n "${container}"
			;;
		stop)
			ask_confirm_exec lxc-stop -n "${container}"
			;;
		*)
			return 1
			;;
	esac
}


# first, let the user select a container from the list of running
# containers, then show a menu for the specified running container.
function menu_running() {
	readarray -t running_containers < <( lxc_list_running )
	container="$(menu_single "Running LXC containers:" "${running_containers[@]}")"
	[ "${container}" = "" ] && return;

	while true; do
		action="$(menu "Running container \"${container}\"" \
			"info"		"show info" \
			"root"		"get a root shell" \
			"user"		"get a user shell" \
			"copy_to"	"copy file to container" \
			"copy_from"	"copy file from container" \
			"scripts"	"copy a shell script and run it" \
			"forward"	"Add a temporary port forward for the container" \
			"restart"	"restart the container" \
			"kill"		"kill the container" \
			"stop"		"stop the container"
		)"

		running_container_action "${container}" "${action}" || break
	done
}


# handle a stopped container action
# $1 is the container name
# $2 is the action to perform
function stopped_container_action() {
	container="${1}"
	action="${2}"
	case "${action}" in
		info)
			msgbox "$(lxc-info -n "${container}")"
			;;
		root)
			ask_confirm_exec lxc-execute -n "${container}" -- login -f root
			;;
		user)
			ask_confirm_exec lxc-execute -n "${container}" -- login -f "${USERNAME}"
			;;
		start)
			ask_confirm_exec lxc-unpriv-start -n "${container}"
			return 1
			;;
		edit)
			editor "${LXC_PATH}/${container}/config"
			;;
		clone)
			new_container="$(inputbox "Please enter a name for the new container:")"
			[ "${new_container}" = "" ] && return;
			ask_confirm_exec lxc-copy -n "${container}" -N "${new_container}"
			container="${new_container}"
			;;
		rename)
			new_container="$(inputbox "Please enter a new name for the container:")"
			[ "${new_container}" = "" ] && return;
			ask_confirm_exec lxc-copy -R -n "${container}" -N "${new_container}"
			container="${new_container}"
			;;
		backup)
			BACKUP_NAME="$(inputbox "Please enter a filename for the backup:" "${container}_$(date --iso-8601=seconds).rootfs.tar.gz")"
			mkdir -p "${BACKUPS_DIR}"
			BACKUP_PATH="$(realpath "${BACKUPS_DIR}")/${BACKUP_NAME}"
			./backups/create_container_backup.sh "${container}" "${BACKUP_PATH}"
			;;
		destroy)
			confirm_container="$(inputbox "Destroy container ${container}?\nThe rootfs will be deleted.\nThis can't be undone!\n\nTo confirm, please enter the name of the container.")"
			[ "${confirm_container}" != "${container}" ] && return;
			ask_confirm_exec lxc-destroy -n "${container}"
			return 1
			;;
	esac
}


# first, let the user select a container from the list of stopped
# containers, then show a menu for the specified stopped container.
function menu_stopped() {
	readarray -t stopped_containers < <( lxc_list_stopped )
	container="$(menu_single "Stopped LXC containers:" "${stopped_containers[@]}")"
	[ "${container}" = "" ] && return;

	while true; do
		action=$(menu "Stopped container \"${container}\"" \
			"info"		"show info" \
			"root"		"get a root shell" \
			"user"		"get a user shell" \
			"start"		"start the container" \
			"edit"		"edit configuration in an editor" \
			"clone"		"duplicate the container" \
			"rename"	"rename the container" \
			"backup"	"create a backup of the container" \
			"destroy"	"delete the container(including data!)" )

		if [ "${action}" = "info" ]; then
			msgbox "$(lxc-info -n "${container}")"
		elif [ "${action}" = "root" ]; then
			ask_confirm_exec lxc-execute -n "${container}" -- login -f root
		elif [ "${action}" = "user" ]; then
			ask_confirm_exec lxc-execute -n "${container}" -- login -f "${USERNAME}"
		elif [ "${action}" = "start" ]; then
			ask_confirm_exec lxc-unpriv-start -n "${container}"
			break
		elif [ "${action}" = "edit" ]; then
			editor "${LXC_PATH}/${container}/config"
		elif [ "${action}" = "clone" ]; then
			new_container="$(inputbox "Please enter a name for the new container:")"
			if [ "${new_container}" != "" ]; then
				ask_confirm_exec lxc-copy -n "${container}" -N "${new_container}"
				container="${new_container}"
			fi
		elif [ "${action}" = "rename" ]; then
			new_container="$(inputbox "Please enter a new name for the container:")"
			if [ "${new_container}" != "" ]; then
				ask_confirm_exec lxc-copy -R -n "${container}" -N "${new_container}"
				container="${new_container}"
			fi
		elif [ "${action}" = "destroy" ]; then
			confirm_container="$(inputbox "Destroy container ${container}?\nThe rootfs will be deleted.\nThis can't be undone!\n\nTo confirm, please enter the name of the container.")"
			if [ "${confirm_container}" = "${container}" ]; then
				ask_confirm_exec lxc-destroy -n "${container}"
			fi
			break
		elif [ "${action}" = "backup" ]; then
			# get name of final file
			BACKUP_NAME="$(inputbox "Please enter a filename for the backup:" "${container}_$(date --iso-8601=seconds).rootfs.tar.gz")"
			mkdir -p "${BACKUPS_DIR}"
			BACKUP_PATH="$(realpath "${BACKUPS_DIR}")/${BACKUP_NAME}"
			./backups/create_container_backup.sh "${container}" "${BACKUP_PATH}"
		elif [ "${action}" = "" ]; then
			break
		fi
	done
}


# the container creation "wizard"
function menu_create() {
	container="$(inputbox "Please enter a name for the new container:")"
	[ "${container}" = "" ] && return
	template="$(inputbox "Enter the LXC template to use:" "${DEFAULT_LXC_TEMPLATE}")"
	template_args="$(inputbox "Extra arguments for template:" "${DEFAULT_LXC_TEMPLATE_ARGS}")"
	ask_confirm_exec lxc-create -B best -n "${container}" -t "${template}" -- ${template_args[@]}
	if yesno "Start container now?"; then
		ask_confirm_exec lxc-unpriv-start -n "${container}"
		post_install_script="$(inputbox "Run post-install script?" "${DEFAULT_POST_INSTALL_SCRIPT}")"
		if [ "${post_install_script}" != "" ]; then
			ask_confirm_exec lxc_run_script_in_container "${container}" "${post_install_script}"
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
			"restore"	"Restore a container from a backup" \
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
		elif [ "${selected}" = "restore" ]; then
			#TODO
			backup_path="$(menu_single "Backups list:" "${BACKUPS_DIR}"/*.tar.gz )"
			if [ "${backup_path}" = "" ]; then
				backup_path="$(inputbox "Enter backup tarbal path manually:")"
				[ "${backup_path}" = "" ] && break
			fi
			container_name="$(inputbox "Enter the name of the new or replaced container:")"
			[ "${container_name}" = "" ] && break

			# check if old container exists
			if lxc-ls | grep -c -F "${container_name}"; then
				if yesno "Old container will be deleted. Continue?"; then
					# destroy old container
					ask_confirm_exec lxc-destroy -n "${container_name}"
				else
					break
				fi
			fi

			# restore container
			ask_confirm_exec lxc-create -n "${container_name}" -t "${PWD}/backups/restore_lxc_template.sh" -- -a "${backup_path}"

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
