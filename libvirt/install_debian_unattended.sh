#!/bin/bash
set -eu
# This script runs the Debian installer for you to enable a
# fully-automatic installation of Debian in a new libvirt VM,
# using PXE and the di-netboot-assistant.

# Load required utils
. ./utils/log.sh
. ./utils/libvirt.sh
. ./utils/wait_for_connection.sh



# first argument is a required configuration file
if [ -z "${1-}" ]; then
	>&2 echo "Error: Need to supply configuration file as first parameter"
	exit 1
fi
LOG "Using base configuration file: ${1}"
. "${1}"



# install required packages on host:
#apt update -y
#apt install -y di-netboot-assistant qemu-system libvirt-daemon-system libvirt-clients

# create a local directory for tftp
TFTP_ROOT="/var/lib/tftpboot"
mkdir -p "${TFTP_ROOT}"

# configure di-netboot-assistant for autoboot to automated installation
cp -v /etc/di-netboot-assistant/pxelinux.HEAD /etc/di-netboot-assistant/pxelinux.HEAD.orig
cat << EOF > /etc/di-netboot-assistant/pxelinux.HEAD
UI ::/d-i/n-a/pxelinux.cfg/menu.c32
MENU TITLE Automated Debian-Installer Netboot
DEFAULT autoinstall
TIMEOUT 60

LABEL autoinstall
    MENU LABEL Debian stable (amd64) + preseed
    kernel ::/d-i/n-a/stable/amd64/linux
    append initrd=::/d-i/n-a/stable/amd64/initrd.gz auto=true priority=critical url=tftp://192.168.200.1 console=ttyS0,115200 --- console=ttyS0,115200

LABEL bootlocal
MENU LABEL ^Boot from local disk..
    LOCALBOOT 0

EOF

# download and setup tftp for debian stable netboot
LOG "Downloading debian netboot image to ${TFTP_ROOT}"
di-netboot-assistant install stable --arch=amd64

# create preseed directory
mkdir -p "${TFTP_ROOT}/d-i/bullseye"

# configure preseed for installation
# uses the apt-cacher-ng that should be running on 10.0.3.1:3142
LOG "Generating preseed configuration file"
cat << EOF > "${TFTP_ROOT}/d-i/bullseye/preseed.cfg"

#_preseed_V1
#for bullseye
d-i debian-installer/locale string en_US
d-i keyboard-configuration/xkb-keymap select us

d-i netcfg/choose_interface select auto

d-i netcfg/link_wait_timeout string 10
d-i netcfg/dhcp_timeout string 60
d-i netcfg/dhcpv6_timeout string 60

d-i netcfg/get_hostname string unassigned-hostname
d-i netcfg/get_domain string unassigned-domain

d-i netcfg/wireless_wep string

d-i hw-detect/load_firmware boolean true

d-i mirror/country string manual
d-i mirror/http/hostname string 10.0.3.1:3142
d-i mirror/http/directory string /deb.debian.org/debian
d-i mirror/http/proxy string

d-i passwd/root-login boolean false
d-i passwd/user-fullname string ${DI_USERNAME}
d-i passwd/username string ${DI_USERNAME}

d-i passwd/user-password password ${DI_PASSWORD}
d-i passwd/user-password-again password ${DI_PASSWORD}

d-i clock-setup/utc boolean true

d-i time/zone string US/Eastern

d-i clock-setup/ntp boolean true

d-i partman-auto/method string regular

d-i partman-lvm/device_remove_lvm boolean true
d-i partman-md/device_remove_md boolean true
d-i partman-lvm/confirm boolean true
d-i partman-lvm/confirm_nooverwrite boolean true

d-i partman-auto/choose_recipe select atomic

d-i partman-partitioning/confirm_write_new_label boolean true
d-i partman/choose_partition select finish
d-i partman/confirm boolean true
d-i partman/confirm_nooverwrite boolean true

d-i partman-md/confirm boolean true
d-i partman-partitioning/confirm_write_new_label boolean true
d-i partman/choose_partition select finish
d-i partman/confirm boolean true
d-i partman/confirm_nooverwrite boolean true

#tasksel tasksel/first multiselect standard, web-server, kde-desktop
d-i pkgsel/include string openssh-server qemu-guest-agent

d-i grub-installer/only_debian boolean true
d-i grub-installer/with_other_os boolean true
d-i grub-installer/bootdev string default

d-i finish-install/reboot_in_progress note

EOF

if [ -n "${DI_SSH_PUB}" ]; then
	#TODO: use virsh set-user-sshkeys
	cat << EOF >> "${TFTP_ROOT}/d-i/bullseye/preseed.cfg"
# Install ssh public key for user,
# then disable password login
d-i preseed/late_command string in-target su -c "mkdir -p .ssh; umask 0177; echo \"${DI_SSH_PUB}\" > .ssh/authorized_keys" - ${DI_USERNAME}; echo -e "\n\n# disable password login:\nPasswordAuthentication no" >> /target/etc/ssh/sshd_config
EOF

fi


if ! virsh -c "${LIBVIRT_CONNECTION}" net-info boot_network; then
	# create transient network for installation that has a DHCP with bootp and a TFTP server
	LOG "Preparing libvirtd PXE network"

	# create configuration for network
	cat << EOF > /tmp/bootnetwork.xml
<network>
	<name>boot_network</name>
	<forward mode="nat" />
	<bridge name="bootbr0" stp="on" delay="0"/>
	<mac address="52:54:00:00:43:7f" />
	<ip address="192.168.200.1" netmask="255.255.255.0">
		<tftp root="/var/lib/tftpboot" />
		<dhcp>
			<range start="192.168.200.2" end="192.168.200.254" />
			<bootp file="/d-i/n-a/pxelinux.0" />
		</dhcp>
	</ip>
</network>

EOF

	# create the network
	virsh -c "${LIBVIRT_CONNECTION}" net-create --file /tmp/bootnetwork.xml

	# Needed to not break tftp
	# default policy is DROP in out firewall
	# TODO: Find a better/more specific way to do this?
	iptables -t filter -A INPUT -i bootbr0 -j ACCEPT
fi





# get total memory
MEM_TOTAL_KB="$(grep "MemTotal:" /proc/meminfo | cut -d ":" -f 2 | tr -d " " | cut -d "k" -f 1)"

# Use 1/2 the available memory for VM
MEM_VM_MB="$(( MEM_TOTAL_KB/1024/2 ))"

# Use LIBVIRT_VM_MEM_MB if specified
if [ -n "${LIBVIRT_VM_MEM_MB}" ]; then
	MEM_VM_MB="${LIBVIRT_VM_MEM_MB}"
fi

# use all CPU cores by default
VM_CPUS="$(nproc)"

# use LIBVIRT_VM_NCPUS if specified
if [ -n "${LIBVIRT_VM_NCPUS}" ]; then
	VM_CPUS="${LIBVIRT_VM_NCPUS}"
fi

# generate a MAC address for the VM, so we can pre-configure DHCP
VM_MAC="$(get_kvm_random_mac)"




# run virt-install to create the VM and boot from PXE for installation
# (This performs the automated installation)
LOG "Creating libvirtd VM, booting from PXE"
virt-install --connect "${LIBVIRT_CONNECTION}" -n "${LIBVIRT_VM_NAME}" \
 --noreboot --autoconsole text \
 --sysinfo host --cpu host-passthrough \
 --vcpus "${VM_CPUS}" \
 --memory "${MEM_VM_MB}" \
 --disk size="${LIBVIRT_VM_DISK_GB}" \
 --pxe \
 --os-variant debiantesting \
 --network network=boot_network,mac="${VM_MAC}" || true


# remove previously created boot network.
if [ -f "/tmp/bootnetwork.xml" ]; then
	# Revert temporary rule
	iptables -t filter -D INPUT -i bootbr0 -j ACCEPT

	# delete uneeded boot network
	virsh -c "${LIBVIRT_CONNECTION}" net-destroy boot_network

	# delete temporary config file
	rm -f /tmp/bootnetwork.xml
fi


# edit VM to use default network
virt-xml --connect "${LIBVIRT_CONNECTION}" "${LIBVIRT_VM_NAME}" --print-diff --edit --network source="default"
virt-xml --connect "${LIBVIRT_CONNECTION}" "${LIBVIRT_VM_NAME}" --edit --network source="default"


# boot up the VM and wait for it to become SSH ready.
LOG "Starting the VM"
virsh -c "${LIBVIRT_CONNECTION}" start "${LIBVIRT_VM_NAME}"

# wait for network ready, get VM_IP
LOG "Waiting for VM network to become available..."
wait_for_vm_net "${LIBVIRT_CONNECTION}" "${LIBVIRT_VM_NAME}"
VM_MAC="$(get_vm_mac "${LIBVIRT_CONNECTION}" "${LIBVIRT_VM_NAME}")"
VM_IP="$(get_vm_ip "${LIBVIRT_CONNECTION}" "${LIBVIRT_VM_NAME}" "${VM_MAC}")"
LOG "VM IP: ${VM_IP}"

# tell the libvirt DHCP server to permanently assign the VM the IP
#virsh -c "${LIBVIRT_CONNECTION}" net-update default add ip-dhcp-host \
# "<host mac='${VM_MAC}' name='${LIBVIRT_VM_NAME}' ip='${IPV4_ADDR}' />" \
# --live --config || true

# wait for ssh to become available
LOG "Waiting for SSH ready..."
wait_for_connection "${VM_IP}" 22 || true

# create a snapshot to be restored later
if [ -n "${LIBVIRT_VM_SNAPSHOT}" ]; then
	LOG "Creating snapshot of VM"
	virsh -c "${LIBVIRT_CONNECTION}" snapshot-create-as "${LIBVIRT_VM_NAME}" "${LIBVIRT_VM_SNAPSHOT}"
fi

# Inform the user of the creation of the VM and provide default login credentials:
LOG "The VM \"${LIBVIRT_VM_NAME}\" has been installed."
LOG "You can now login as ${DI_USERNAME}@${VM_IP}"
LOG "The default password is \"${DI_PASSWORD}\"."
if [ -n "${DI_SSH_PUB}" ]; then
	LOG "Your SSH public key has been installed. "
fi
LOG "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
LOG "!!!                                             !!!"
LOG "!!! You should immediately change your password! !!!"
LOG "!!!                                             !!!"
LOG "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
# TODO: Ask user to change password using virsh set-user-password

