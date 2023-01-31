#!/bin/bash

# utils/lxc.sh
# Utillity functions for working with LXC.
# All invocations of the LXC programs should happen here for consistency.

# The functions uses these envirioment variables:
# UTILS_CONFIRM_ENABLE

# The functions use the following functions from other files:
#  * confirm from utils/confirm_dialog.sh
#  * confirm_exec from utils/confirm_dialog.sh
UTILS_LXC_ATTACH="lxc-unpriv-attach"
UTILS_LXC_START="lxc-unpriv-start"
LXC_PATH="$(lxc-config lxc.lxcpath)"

# run a command in an LXC container
# The _ask variant asks for confirmation using ask_confirm_exec function
# $1 is the container name
# rest of arguments are the command to be executed in the container
function lxc_attach_container() {
	"${UTILS_LXC_ATTACH}" --clear-env -n "${1}" -- "${@:2}"
}
function lxc_attach_container_ask() {
	local command="${1}"
	shift
	confirm "About to run command in container '${command}':\n\n${*}"
	"${UTILS_LXC_ATTACH}" --clear-env -n "${command}" -- "${@}"
}

# attach inside a new tmux session
function lxc_attach_container_tmux() {
	local container_name="${1}"
	local session_name="lxc-${container_name}-${RANDOM}"
	tmux -d new-session -s "${session_name}" "${@:2}"
	echo -n "${session_name}"
}

# copy a file from the host to the container
# $1 is the the container name
# $2 is the source file on the host
# $3 is the target file in the container
# TODO: Is this a useless use of cat?
# TODO: Add umask to set permissions
function lxc_copy_from_host() {
	local container="${1}" source="${2}" target="${3}"
	confirm "About to copy file:\n\nFrom host: '${source}'\nTo '${container}': '${target}'"

	# copy the file from the host to the container by using cat to write in the container
	lxc_attach_container "${container}" /bin/bash -c "cat - > \"${target}\"" < "${source}"
}


# copy a file from a container to the host
# $1 is the the container name
# $2 is the source file in the container
# $3 is the target file on the host
function lxc_copy_to_host() {
	local container="${1}" source="${2}" target="${3}"
	confirm "About to copy file:\n\nFrom ${container}: ${source}\nTo host: ${target}"

	# copy the file from the container using cat to read in the container
	lxc_attach_container "${container}" /bin/cat "${source}" > "${target}"
}


# copy a file from the host to the container using tar
# (tar needs to be installed on the host and guest)
# $1 is the the container name
# $2 is the source file/directory on the host
# $3 is the target directory in the container
function lxc_copy_from_host_tar() {
	local container="${1}" source="${2}" target="${3}" source_dir
	confirm "About to copy:\n\nFrom host: '${source}'\nTo '${container}' directory: '${target}'"
	source="$(realpath "${source}")"
	source_dir="$(dirname "${source}")"

	# Copy file(s) over a pipe from the host to the container,
	# using tar to preserve permissions
	pushd "${source_dir}" || return
	tar -cpvf - | lxc_attach_container "${container}" /bin/bash -c "mkdir -p \"${target_dir}\" && tar -C \"${target_dir}\" -xpvf -"
	popd || return
}


# copy a file from a container to the host using tar
# (tar needs to be installed on the host and guest)
# $1 is the the container name
# $2 is the source file/directory in the container
# $3 is the target directory on the host
function lxc_copy_to_host_tar() {
	local container="${1}" source="${2}" target_dir="${3}" source_dir
	confirm "About to copy:\n\nFrom ${container}: ${source}\nTo host directory: ${target_dir}"
	source="$(realpath "${source}")"
	source_dir="$(dirname "${source}")"

	# Copy file(s) over a pipe from the container to the host,
	# using tar to preserve permissions
	mkdir -p "${target_dir}"
	pushd "${target_dir}" || return
	lxc_attach_container "${container}" /bin/bash -c "cd \"${source_dir}\" && tar -cpvf -" | tar -xpvf -
	popd || return
}


# run a script from the host in a container
# (copy to /tmp in the container and running it).
# $1 is the container name
# $2 is the filepath to the script
function lxc_run_script_in_container() {
	local container="${1}" source="${2}" target
	target="/tmp/$(basename "${source}" || echo "script_in_container.sh")"
	confirm "About to run script '${source}' in container '${container}'"
	lxc_copy_from_host "${container}" "${source}" "${target}"
	lxc_attach_container "${container}" /bin/bash "${target}" || true
	lxc_attach_container "${container}" /bin/rm "${target}"
}


# create a new container
# $1 is the new container name
# $2 is the template to use
# Rest are additional arguments to pass to the template
function lxc_create_container() {
	local container_name="${1}" template_name="${2}"
	shift 2
	confirm "About to create container '${container_name}' using template '${template_name}' with arguments '$*'"
	lxc-create -B best -n "${container_name}" -t "${template_name}" -- "$@"
}

# start a container
# $1 is the container name
function lxc_start_container() {
	local container_name="${1}"
	confirm "About to start container '${container_name}'"
	"${UTILS_LXC_START}" -q -n "${container_name}"
}

# stop a container
# $1 is the container name
function lxc_stop_container() {
	local container_name="${1}"
	confirm "About to stop container '${container_name}'"
	lxc-stop -q -n "${container_name}"
}

# kill(force-stop) a container
# $1 is the container name
function lxc_kill_container() {
	local container_name="${1}"
	confirm "About to kill container '${container_name}'"
	lxc-stop -q -k -n "${container_name}"
}

# restart a container
# $1 is the container name
function lxc_restart_container() {
	local container_name="${1}"
	confirm "About to restart container '${container_name}'"
	lxc-stop -q -r -n "${container_name}"
}

# Get the container IP address
function lxc_get_container_ip() {
	local container="${1}"
	lxc-info -Hiq -n "${container}"
}


# list all stopped containers to stdout(seperated by newline)
function lxc_list_stopped() {
	lxc-ls -1 --stopped
}


# list all running containers to stdout(seperated by newline)
function lxc_list_running() {
	lxc-ls -1 --running
}

# Check if the container exists and is running
# $1 is the container name
# Return 0 when the container exists and is running, 1 otherwise
function lxc_is_running() {
	lxc_list_running | grep -q -Fx "${1}"
}


# Check if the container exists and is stopped
# $1 is the container name
# Return 0 when the container exists and is stopped, 1 otherwise
function lxc_is_stopped() {
	lxc_list_stopped | grep -q -Fx "${1}"
}


# Create a backup tar of a stopped container
# TODO: This currently needs space for 2 extra copies of the container
# $1 is the container name
# $2 is the path on the host for the created tarball
function lxc_create_backup_tar() {
	# Parse arguments and get required envirioment variables
	local container="${1}"
	local backup_path="${2}"
	local container_path="${LXC_PATH}/${container}"

	# make sure container is stopped
	lxc_is_stopped "${container}"

	# enter the /var/lib/lxc/ path(or the user-equivalent)
	pushd "${container_path}" || return 1

	# create rootfs backup as tarbal, in stopped container, "from the inside"
	lxc-execute -n "${container}" -- tar --force-local --one-file-system --ignore-failed-read --numeric-owner -cvpf - / > rootfs.tar || true

	# create config+rootfs backup
	tar --exclude=./rootfs --force-local --one-file-system --ignore-failed-read --numeric-owner -cvzpf "${backup_path}" . || true

	# delete rootfs.tar from host
	rm rootfs.tar

	popd || true
}


# Check if a container exists
# $1 is the container name
function lxc_check_exists() {
	lxc-info -q -s -n "${1}" > /dev/zero
}
