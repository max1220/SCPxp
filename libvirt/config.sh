# Configuration for the libvirt script for testing.


# name of the VM
VM="debian_bullseye"

# IP address this VM has
IP="192.168.100.254"

# name of the snapshot that is restored
SNAPSHOT="prepared"

# used for ssh and scp
SSH="max@${IP}"

# enable setting up btrfs(needs to configured in Debian installer as well)
ENABLE_BTRFS=false

# the complete configuration used to setup the host systme
HOST_CONFIG="host/config_libvirt.sh"
