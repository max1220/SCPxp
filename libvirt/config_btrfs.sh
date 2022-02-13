# Configuration for the libvirt script for testing.


# name of the VM
VM="debian_bullseye_btrfs"

# IP address this VM has
IP="192.168.100.155"

# name of the snapshot that is restored
SNAPSHOT="prepared"

# used for ssh and scp
SSH="max@${IP}"

# enable setting up btrfs(needs to configured in Debian installer as well)
ENABLE_BTRFS=false

# the configuration used to setup the host systme
HOST_CONFIG="host/config_libvirt_btrfs.sh"

# the network configuration that is applied to the host system
NETWORK_CONFIG="${HOST_CONFIG}"

# the btrfs configuration that is used
BTRFS_CONFIG="${HOST_CONFIG}"
