#!/bin/bash
set -e
function LOG() { echo -e "\e[34m$@\e[0m"; }

# this script restores a pre-configured libvirt VM snapshot (fresh booted Debian 10 install),
# then uses the host_setup.sh and host_network.sh scripts to setup the VM.
# I use this script to make sure that my setup is reproduceable.


### CONFIGURATION ###

# name of the VM
VM="debian10-2"

# IP address this VM has
IP="192.168.100.25"

# name of the snapshot that is restored
SNAPSHOT="prepared"

# used for ssh and scp
SSH="max@${IP}"

# enable setting up btrfs(needs to configured in Debian installer as well)
ENABLE_BTRFS=false

### END CONFIGURATION ###


# Checks for up to 30s for a connection. arg1 is address, $2 is port
function wait_for_connection() {
	for i in {1..30}; do
		if timeout 1 bash -c ": >/dev/tcp/${1}/${2}" 2> /dev/zero; then
			LOG "connection established!"
			exec 3<&-
			break
		else
			LOG "Waiting for connection ${i}/30"
		fi
		sleep 1
	done
}

#sudo virsh shutdown ${VM}
LOG "Reverting ${VM} to snapshot ${SNAPSHOT}"
virsh -c qemu:///system snapshot-revert ${VM} ${SNAPSHOT}

wait_for_connection ${IP} 22

# update time in restored container
ssh ${SSH} sudo hwclock --hctosys

scp -r ${PWD} ${SSH}:~

if [ "$ENABLE_BTRFS" = true ]; then
	LOG "Setting up btrfs..."
	ssh ${SSH} -t "cd LXC ; sudo ./host_btrfs.sh"

	LOG "Rebooting..."
	ssh ${SSH} "sudo reboot" || true
	sleep 1
fi


wait_for_connection ${IP} 22

LOG "Setting up base system..."
ssh ${SSH} -t "cd LXC ; sudo ./host_setup.sh"

LOG "Setting up networking..."
ssh ${SSH} -t "cd LXC ; sudo ./host_network.sh host_network_config_libvirt.sh"

LOG "Rebooting..."
ssh ${SSH} "sudo reboot" || true
sleep 1

wait_for_connection ${IP} 22

LOG
LOG "Libvirt VM Ok"
LOG
