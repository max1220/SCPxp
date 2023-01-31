

# first, let the user select a container from the list of stopped
# containers, then show a menu for the specified stopped container.
function menu_stopped_container() {
	container="${1}"
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

	case "${action}" in
		info)
			msgbox "$(lxc-info -n "${container}")"
			;;
		root)
			confirm_exec lxc-execute -n "${container}" -- login -f root
			;;
		user)
			confirm_exec lxc-execute -n "${container}" -- login -f "${USERNAME}"
			;;
		start)
			lxc_start_container "${container}"
			return 1
			;;
		edit)
			editor "${LXC_PATH}/${container}/config"
			;;
		clone)
			new_container="$(inputbox "Please enter a name for the new container:")"
			[ "${new_container}" != "" ]
			confirm_exec lxc-copy -n "${container}" -N "${new_container}"
			container="${new_container}"
			;;
		rename)
			new_container="$(inputbox "Please enter a new name for the container:")"
			[ "${new_container}" != "" ]
			confirm_exec lxc-copy -R -n "${container}" -N "${new_container}"
			container="${new_container}"
			return 1
			;;
		backup)
			BACKUP_NAME="$(inputbox "Please enter a filename for the backup:" "${container}_$(date --iso-8601=seconds).rootfs.tar.gz")"
			mkdir -p "${BACKUPS_DIR}"
			BACKUP_PATH="$(realpath "${BACKUPS_DIR}")/${BACKUP_NAME}"
			./backups/create_container_backup.sh "${container}" "${BACKUP_PATH}"
			;;
		destroy)
			confirm_container="$(inputbox "Destroy container ${container}?\nThe rootfs will be deleted.\nThis can't be undone!\n\nTo confirm, please enter the name of the container.")"
			[ "${confirm_container}" = "${container}" ]
			confirm_exec lxc-destroy -n "${container}"
			return 1
			;;
		*)
			return 1
			;;
	esac
}
