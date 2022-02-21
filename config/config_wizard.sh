#!/bin/bash
set -eu
# This scritp set the required configuration variables for the host
# setup interactively, and optionally writes them to a config file.

DIALOG_BACKTITLE="Configuration Wizard"
REQUIRE_CONFIRM=false
DRYRUN=false
WAIT_AFTER_COMMAND=true
ASK_EVERY_QUESTION=false

# Load required utils
. ./utils/ui_dialog.sh



function write_to_config() { return; }

# Show the configuration wizard welcome screen
msgbox "Welcome to the Configuration Wizard!

This program will interactively set all the required
envirioment variables for the host setup,
and optionally write them to a configuration file.

You can cancel anytime by pressing escape.
"

ASK_EVERY_QUESTION="$(yesno_bool "Ask for envirioment variables that are already set?")"

CONFIG_FILE="$(inputbox "Please enter filename to save the config:" "config/magic_configuration.sh")"
function write_to_config() {
	 echo "${1}" >> "${CONFIG_FILE}"
}
write_to_config "# this configuration file was generated using the configuration wizard!"
write_to_config "# generated at: $(date)"
write_to_config ""


function set_env_variable() {
	# the variable name to check and set
	VARNAME="${1}"

	# description of what the variable does(for prompt and config
	DESCRIPTION="${2}"

	# is this argument a boolean-type ("true" or "false")
	IS_BOOLEAN="${3-}"

	# if variable is already set, use the previous value as the new value
	NEW_VALUE="${!VARNAME-}"

	# if we should ask every question or we don't have a value, ...
	if [ -z "${NEW_VALUE}" ] || [ "${ASK_EVERY_QUESTION}" = true ]; then
		# ... get new value interactively from user
		INTERACTIVE_PROMPT="${VARNAME}\n\nPlease specify the $( [ "${IS_BOOLEAN}" = true ] && echo "boolean " )value for \"${VARNAME}\"\n\n\nDescription:\n${DESCRIPTION}"
		if [ "${IS_BOOLEAN}" = true ]; then
			NEW_VALUE="$(yesno_bool "${INTERACTIVE_PROMPT}")"
		else
			clear
			echo "testfoo"
			if true; then
				exit 1
			fi
			NEW_VALUE="$(inputbox "${INTERACTIVE_PROMPT}" "${NEW_VALUE}")"
		fi
	fi

	# if we don't have a value, exit
	if [ -z "${NEW_VALUE}" ]; then
		exit 1
	fi

	# write variable to configuration file
	write_to_config "# ${DESCRIPTION}" > "CONFIG_FILE"
	write_to_config "${VARNAME}=\"${NEW_VALUE}\""

	# set envirioment variable
	declare -g "${VARNAME}=${NEW_VALUE}"

	# output the value to stdout so we can catch it later for dependent configuration items
	echo "${NEW_VALUE}"
}


write_to_config "# from host/setup_host.sh:"
write_to_config ""
set_env_variable ENABLE_CGROUPV2		"Enable cgroup v2 setup " true
set_env_variable ENABLE_UNPRIVILEGED	"Enable setup for unprivileged containers" true
set_env_variable ENABLE_LIBVIRT			"Enable setup for libvirtd on the host" true
set_env_variable USERNAME				"User for unprivileged containers/libvirt"
write_to_config ""



write_to_config "# from host/setup_btrfs.sh:"
write_to_config ""
set_env_variable ENABLE_BTRFS				"Enable btrfs setup" true
if [ "${ENABLE_BTRFS}" = true ]; then
	set_env_variable BTRFS_DISK				"the partition of the btrfs"
	set_env_variable BTRFS_SUBVOLUME		"a snapshot of the current root will be created, this is it's name"
	set_env_variable BTRFS_SUBVOLUME_DIRS	"directories that get their own subvolume"
fi
write_to_config ""



write_to_config "# from host/setup_network.sh:"
write_to_config ""
set_env_variable ENABLE_NETWORK		"Enable networking setup" true
if [ "${ENABLE_NETWORK}" = true ]; then
	set_env_variable HOSTNAME		"Hostname to setup for this machine"
	set_env_variable DOMAINNAME		"Domainname to setup for this machine"
	set_env_variable WAN_INTERFACE	"WAN interface name"
	write_to_config ""
	write_to_config "IPv4 configuration:"
	set_env_variable IPV4_ADDR		"IPv4 address(without subet)"
	set_env_variable IPV4_NETMASK	"IPv4 Subnet size"
	set_env_variable IPV4_GATEWAY	"IPv4 Gateway/router IP"
	set_env_variable IPV4_NS1		"IPv4 Default nameserver 1"
	set_env_variable IPV4_NS2		"IPv4 Default nameserver 2"

	write_to_config ""
	write_to_config "IPv6 configuration:"
	set_env_variable IPV6_ENABLE 			"enable IPv6" true
	if [ "${IPV6_ENABLE}" = true ]; then
		set_env_variable IPV6_HOST_ADDR		"IPv6 address the VM host is reachable at, without netmask"
		set_env_variable IPV6_HOST_NETMASK	"IPv6 Subnet size"
		set_env_variable IPV6_HOST_GATEWAY	"IPv6 Gateway/router IP"
		set_env_variable IPV6_NS1			"IPv6 Default nameserver 1"
		set_env_variable IPV6_NS2			"IPv6 Default nameserver 2"
		set_env_variable IPV6_BR_PREFIX		"IPv6 prefix for the containers(should end in ::)"
		set_env_variable IPV6_BR_ADDR		"IPv6 address of the bridge used for containers, without netmask"
		set_env_variable IPV6_BR_NETMASK	"IPv6 subnet mask. Just the integer"
	fi
fi
write_to_config ""



write_to_config ""
write_to_config "from libvirt/setup_libvirt.sh"
if [ -n "${LIBVIRT_CONFIG}"]; then
	set_env_variable LIBVIRT_CONFIG		"Configuration for the libvirt VM installation script"
else
	LIBVIRT_CONFIG="${CONFIG_FILE}"
	set_env_variable LIBVIRT_CONFIG		"Configuration for the libvirt VM installation script"
fi
set_env_variable LIBVIRT_CONNECTION		"The connection URL for libvirtd"
set_env_variable LIBVIRT_VM_NAME		"name of the prepared libvirt VM"
set_env_variable LIBVIRT_VM_SNAPSHOT	"name of the snapshot that is restored before the setup"
write_to_config ""
