#!/bin/bash
set -eu
function LOG() { echo -e "\e[32m$@\e[0m"; }

# This script is used to install this setup on a remote host, using SSH and SCP.


if [ -z "${1}" ]; then
	>&2 echo "Error: Need to supply configuration file as first parameter"
	exit 1
fi
LOG "Using base configuration file: ${1}"
. "${1}"



# Checks for up to 30s for a connection. $1 is address, $2 is port
function wait_for_connection() {
	for i in {1..30}; do
		if timeout 1 bash -c ": >/dev/tcp/${1}/${2}" 2> /dev/zero; then
			LOG "connection established!"
			exec 3<&-
			return 0
		else
			LOG "Waiting for connection ${i}/30"
		fi
		sleep 1
	done
	return 1
}

# reboot the remote computer, and wait for it to be available again
function reboot_remote() {
	LOG "Rebooting..."
	ssh ${REMOTE_SSH} "sudo reboot" || true
	LOG "(waiting ${REMOTE_REBOOT_TIMEOUT}s)"
	sleep "${REMOTE_REBOOT_TIMEOUT}" || true
	#wait_for_connection "${IPV4_ADDR}" 22
}


scp -r "${PWD}" ${REMOTE_SSH}:~

if [ -n "${REMOTE_BTRFS_CONFIG}" ]; then
	LOG "Setting up btrfs..."
	ssh ${REMOTE_SSH} -t "cd LXC ; sudo ./host/setup_btrfs.sh ${REMOTE_BTRFS_CONFIG}"

	reboot_remote
fi


LOG "Setting up base system..."
ssh ${REMOTE_SSH} -t "cd LXC ; sudo ./host/setup_host.sh ${REMOTE_HOST_CONFIG}"

LOG "Setting up networking..."
ssh ${REMOTE_SSH} -t "cd LXC ; sudo ./host/setup_network.sh ${REMOTE_NETWORK_CONFIG}"

LOG
LOG "Remote Setup Ok"
LOG "Rebooting remote recommended!"
LOG

