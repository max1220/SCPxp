#!/bin/bash
set -eu
# This script restores a pre-configured libvirt VM snapshot (fresh booted Debian 10 install),
# then uses the host_setup.sh and host_network.sh scripts to setup the VM.
# I use this script to make sure that my setup is reproduceable.

# Load required utils
. ./utils/log.sh




if [ -z "$1" ]; then
	>&2 echo "Error: Need to supply configuration file as first parameter"
	exit 1
fi
LOG "Using configuration file: ${1}"
. "${1}"



if [ -n "${LIBVIRT_VM_SNAPSHOT}"]; then
	# Restore (running) snapshot
	LOG "Reverting ${LIBVIRT_VM_NAME} to snapshot ${LIBVIRT_VM_SNAPSHOT}"
	virsh -c "${LIBVIRT_CONNECTION}" snapshot-revert "${LIBVIRT_VM_NAME}" "${LIBVIRT_VM_SNAPSHOT}"
else
	# start VM if not started already
	virsh -c "${LIBVIRT_CONNECTION}" shutdown "${LIBVIRT_VM_NAME}"
fi

# update time in restored container
ssh "${USERNAME}@${IPV4_ADDR}" sudo hwclock --hctosys

# Copy LXC tree to VM
scp -rp "${PWD}" "${USERNAME}@${IPV4_ADDR}:/home/${USERNAME}/"

# Run the setup script
SCRIPTSDIR="$(basename "${PWD}")"
ssh "${USERNAME}@${IPV4_ADDR}" -t "cd \"${SCRIPTSDIR}\"; sudo ./host/setup_all.sh ${LIBVIRT_CONFIG}"

# Wait for the remote install log to contain the line "*** SECOND STAGE SETUP COMPLETED ***"
# (Also shows the last line of the installation log periodically)
echo
while ! timeout 3 ssh "${USERNAME}@${IPV4_ADDR}" "grep -q -F \"*** SECOND STAGE SETUP COMPLETED ***\" /second_stage_setup.log"; do
	sleep 1
	# clear current line and reset cursor to column 0
	echo -e -n "\e[2K\rlast log, refreshing in 3s: "
	# show last line of log when we can
	ssh "${REMOTE_SSH}" "tail -n1 /second_stage_setup.log" || true	
done
echo

LOG
LOG "Libvirt VM Ok"
LOG


