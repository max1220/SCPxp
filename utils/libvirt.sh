#!/bin/bash

# utils/libvirt.sh
# Utillity functions for working with libvirtd-based virtualization.

# generate a random KVM mac address
function generate_mac_kvm() {
	printf "52:54:00:%.2x:%.2x:%.2x\n" "$(( RANDOM % 256 ))" "$(( RANDOM % 256 ))" "$(( RANDOM % 256 ))"
}

# Get the IP address of a running VM by it's internal name using qemu-guest-agent
# TODO: This is a hack
function get_vm_ip() {
	virsh -c "${1}" domifaddr "${2}" --source agent | \
		tail -n +3 | \
		grep -F "ipv4" | \
		grep -F "${3}" | \
		xargs | \
		cut -d " " -f 4 | \
		cut -d "/" -f 1 2> /dev/zero
}

# Get the MAC address of a VM from it's XML
#TODO: Current usage of this function assumes single interface!
function get_vm_mac() {
	virsh -c "${1}" dumpxml "${2}" | grep -F "<mac address=" | cut -d "'" -f 2
}

# wait for the IP information to become available
function wait_for_vm_net() {
	local vm_mac vm_ip
	vm_mac="$(get_vm_mac "${1}" "${2}")"
	vm_ip="$(get_vm_ip "${1}" "${2}" "${vm_mac}")"
	while [ -z "${vm_ip}" ]; do
		sleep 3
		LOG "Waiting for VM IP..."
		vm_ip="$(get_vm_ip "${1}" "${2}" "${vm_mac}")"
	done
}
