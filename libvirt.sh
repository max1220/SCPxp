#!/bin/bash
echo -e

# this script uses a pre-configured libvirt VM snapshot (fresh Debian 10 install),
# then uses the host_setup.sh and host_network.sh scripts to setup the VM.
# I use this script to make sure that my setup is reproduceable.


### CONFIGURATION ###

# name of the VM
VM="debian10-2"

# IP address this VM has
IP="192.168.122.26"

# name of the snapshot that is restored
SNAPSHOT="fresh_install"

# used for ssh and scp
SSH="max@${IP}"

### END CONFIGURATION ###


# Checks for up to 30s for a connection. arg1 is address, $2 is port
function wait_for_connection() {
	for i in {1..30}; do
		if timeout 1 bash -c ": >/dev/tcp/${1}/${2}" 2> /dev/zero; then
			echo "connection established!"
			exec 3<&-
			break
		else
			echo "Waiting for connection ${i}/30"
		fi
		sleep 1
	done
}

sudo virsh shutdown ${VM}
echo "Reverting ${VM} to snapshot ${SNAPSHOT}"
sudo virsh snapshot-revert ${VM} fresh_install
sudo virsh start ${VM}

wait_for_connection ${IP} 22

scp -r ${PWD} ${SSH}:~

echo "Setting up base system..."
ssh ${SSH} -t "cd LXC ; sudo ./host_setup.sh"

echo "Setting up networking..."
ssh ${SSH} "cd LXC ; sudo ./host_network.sh host_network_config_libvirt.sh"

echo "Rebooting..."
ssh ${SSH} "sudo reboot"

wait_for_connection ${IP} 22

echo "Ok"
