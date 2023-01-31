#!/bin/bash
set -eu
# This script installs the list of pre-configured containers on the host
# system.

# Load required utils
. ./utils/log.sh
. ./utils/lxc.sh


if [ -z "${1-}" ]; then
	ERROR "Error: Need to supply configuration file as first parameter"
fi
LOG "Using install_containers configuration file: ${1}"
. "${1}"



for source_path in "${!CONTAINER_COPY[@]}"; do
	target_path="${CONTAINER_COPY["${source_path}"]}"
	if [ -d "${source_path}" ]; then
		# copy directory using tar
		lxc_copy_from_host_tar
	elif [ -f "${source_path}" ]; then
		#
	else
		ERROR "Can only copy files/directories!"
	fi
done


# iterate through every container that needs to be setup:
for container_script in "${!CONTAINER_SCRIPTS[@]}"; do
	container_script_arg="${CONTAINER_SCRIPTS["${container_script}"]}"
	container_script_user="${CONTAINER_SCRIPT_USER["${container_script}"]-}"
	[ -z "${container_script_user-}" ] && container_script_user="root"

	printf "running command: "
	printf " '%s'" "${container_script}" ${container_script_arg}
	if [ -n "${container_script_user}" ]; then
		echo " as root"
	else
		echo " as ${container_script_user}"
	fi

done


