#!/bin/bash
set -eu
# This script restores a pre-configured libvirt VM snapshot
# (fresh booted Debian 11 install, see `install_debian_unattended.sh`),
# Copies the lxc-scripts directory to the VM,
# then uses the `host/setup_all.sh` script to setup the VM.

# Load required utils
. ./utils/log.sh
. ./utils/wait_for_connection.sh
. ./utils/libvirt.sh




if [ -z "${1-}" ]; then
	>&2 echo "Error: Need to supply configuration file as first parameter"
	exit 1
fi
LOG "Using configuration file: ${1}"
. "${1}"



if [ -n "${LIBVIRT_VM_SNAPSHOT}" ]; then
	# Restore (running) snapshot
	LOG "Reverting ${LIBVIRT_VM_NAME} to snapshot ${LIBVIRT_VM_SNAPSHOT}"
	virsh -c "${LIBVIRT_CONNECTION}" snapshot-revert "${LIBVIRT_VM_NAME}" "${LIBVIRT_VM_SNAPSHOT}"
else
	# start VM if not started already
	virsh -c "${LIBVIRT_CONNECTION}" start "${LIBVIRT_VM_NAME}"
fi

# get the VM IP and MAC
LOG "Waiting for network ready..."
wait_for_vm_net "${LIBVIRT_CONNECTION}" "${LIBVIRT_VM_NAME}"
VM_MAC="$(get_vm_mac "${LIBVIRT_CONNECTION}" "${LIBVIRT_VM_NAME}")"
VM_IP="$(get_vm_ip "${LIBVIRT_CONNECTION}" "${LIBVIRT_VM_NAME}" "${VM_MAC}")"



# wait for container to become available again
wait_for_connection "${VM_IP}" 22 || true

# make sure our public key is installed
ssh-copy-id "${DI_USERNAME}@${VM_IP}"

# update time in restored container
ssh -t "${DI_USERNAME}@${VM_IP}" sudo hwclock --hctosys

# Copy LXC tree to VM
scp -rp "${PWD}" "${DI_USERNAME}@${VM_IP}:/home/${DI_USERNAME}/"

# Run the setup script
SCRIPTSDIR="$(basename "${PWD}")"
ssh -t "${DI_USERNAME}@${VM_IP}" -t "cd \"${SCRIPTSDIR}\"; sudo ./host/setup_all.sh ${HOST_SETUP_CONFIG}"

# Wait for the remote install log to contain the line "*** SECOND STAGE SETUP COMPLETED ***"
# (Also shows the last line of the installation log periodically)
echo
while ! timeout 3 ssh "${DI_USERNAME}@${VM_IP}" "grep -q -F \"*** SECOND STAGE SETUP COMPLETED ***\" /second_stage_setup.log"; do
	sleep 1
	# clear current line and reset cursor to column 0
	echo -e -n "\e[2K\rlast log, refreshing in 3s: "
	# show last line of log when we can
	ssh "${DI_USERNAME}@${VM_IP}" "tail -n1 /second_stage_setup.log" || true
done
echo

LOG
LOG "Installing lxc-script complete"
LOG


