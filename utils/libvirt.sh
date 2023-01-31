# generate a random KVM mac address
function get_kvm_random_mac() {
	printf "52:54:00:%.2x:%.2x:%.2x\n" "$(( RANDOM % 256 ))" "$(( RANDOM % 256 ))" "$(( RANDOM % 256 ))"
}

# Get the IP address of a running VM by it's internal name using qemu-guest-agent
function get_vm_ip() {
	virsh -c "${1}" domifaddr "${2}" --source agent | \
	 tail -n +3 | \
	 grep -F "ipv4" | \
	 grep -F "${3}" | \
	 xargs | \
	 cut -d " " -f 4 | \
	 cut -d "/" -f 1 2> /dev/zero
}

# wait for the IP to become available
function wait_for_vm_net() {
	local VM_MAC="$(get_vm_mac "${1}" "${2}")"
	local VM_IP="$(get_vm_ip "${1}" "${2}" "${VM_MAC}")"
	while [ -z "${VM_IP}" ]; do
		sleep 3
		LOG "Waiting for VM IP..."
		VM_IP="$(get_vm_ip "${1}" "${2}" "${VM_MAC}")"
	done
}

# Get the MAC address of a VM from it's XML
#TODO: Current usage of this function assumes single interface!
function get_vm_mac() {
	virsh -c "${1}" dumpxml "${2}" | grep -F "<mac address=" | cut -d "'" -f 2
}
