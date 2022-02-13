#!/bin/bash
set -eu
function LOG() { echo -e "\e[34m$@\e[0m"; }

# This script restores a pre-configured libvirt VM snapshot (fresh booted Debian 10 install),
# then uses the host_setup.sh and host_network.sh scripts to setup the VM.
# I use this script to make sure that my setup is reproduceable.


if [ -z "$1" ]; then
	>&2 echo "Error: Need to supply configuration file as first parameter"
	exit 1
fi
LOG "Using libvirt configuration file: ${1}"
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

#sudo virsh shutdown ${VM}
LOG "Reverting ${VM} to snapshot ${SNAPSHOT}"
virsh -c qemu:///system snapshot-revert "${VM}" "${SNAPSHOT}"

# wait for VM to be reachable
#wait_for_connection "${IP}" 22

# update time in restored container
ssh ${SSH} sudo hwclock --hctosys

# Use the complete configuration to setup the host remotely
./host/remote_install.sh "${HOST_CONFIG}"

# restart VM to apply cmdline, network config etc.
ssh ${SSH} sudo reboot

LOG
LOG "Libvirt VM Ok"
LOG


