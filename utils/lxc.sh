# functions for working with LXC

# REQUIRE_CONFIRM


# run a command in an LXC container
# The _ask variant asks for confirmation using ask_confirm_exec function
# $1 is the container name
# rest of arguments are the command to be executed in the container
function lxc_attach_container() {
	container="${1}"
	lxc-unpriv-attach --clear-env -n "${container}" -- ${@:2}
}
function lxc_attach_container_ask() {
	container="${1}"
	ask_confirm_exec lxc-unpriv-attach --clear-env -n "${container}" -- ${@:2}
}


# copy a file from the host to the container
# $1 is the the container name
# $2 is the source file on the host
# $3 is the target file in the container
function lxc_copy_from_host() {
	container="${1}"; source="${2}"; target="${3}"
	if [ "${REQUIRE_CONFIRM}" = true ]; then
		if ! yesno "About to copy file:\n\nFrom host: ${source}\nTo ${container}: ${target}"; then
			return
		fi
	fi

	# copy the file from the host to the container by using cat to write
	# in the container
	lxc_attach_container "${container}" /bin/bash -c "cat - > \"${target}\"" < "${source}"
}


# copy a file from a container to the host
# $1 is the the container name
# $2 is the source file in the container
# $3 is the target file on the host
function lxc_copy_to_host() {
	container="${1}"; source="${2}"; target="${3}"
	if [ "${REQUIRE_CONFIRM}" = true ]; then
		if ! yesno "About to copy file:\n\nFrom ${container}: ${source}\nTo host: ${target}"; then
			return
		fi
	fi

	# copy the file from the container using cat to read in the container
	lxc_attach_container "${container}" /bin/cat "${source}" > "${target}"
}


# run a script from the host in a container
# (copy to /tmp in the container and running it).
# $1 is the container name
# $2 is the filepath to the script
function lxc_run_script_in_container() {
	container="${1}"; source="${2}"
	target="/tmp/$(basename "${source}")"
	lxc_copy_from_host "${container}" "${source}" "${target}"
	lxc_attach_container "${container}" /bin/bash "${target}" || true
	lxc_attach_container "${container}" /bin/rm "${target}"
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
# Return 0 when the container is running, 1 otherwise
function lxc_is_running() {
	container="${1}"
	if lxc_list_running | grep -q -Fx "${container}"; then
		return
	fi
	return 1
}


# Check if the container exists and is stopped
# Return 0 when the container is stopped but exists, 1 otherwise
function lxc_is_stopped() {
	container="${1}"
	if lxc_list_stopped | grep -q -Fx "${container}"; then
		return
	fi
}
