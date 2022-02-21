# from host/setup_host.sh:


# perform setup needed for cgroup v2
ENABLE_CGROUPV2=true

# enable setup for unprivileged containers
ENABLE_UNPRIVILEGED=true

# setup this user for unprivileged containers/libvirt(needs to exist already!)
USERNAME="max"

# enable setup for libvirtd on the host
ENABLE_LIBVIRT=true



# from host/setup_btrfs.sh:


# Enable btrfs setup
ENABLE_BTRFS=true

# the partition of the btrfs
BTRFS_DISK="/dev/vda2"

# a snapshot of the current root will be created, this is it's name
BTRFS_SUBVOLUME="current"

# directories that get their own subvolume.
BTRFS_SUBVOLUME_DIRS="/root /home /var/log /var/cache"



# from host/setup_network.sh:


# Enable networking setup
ENABLE_NETWORK=true

# Hostname to setup for this machine
HOSTNAME="host"

# Domainname to setup for this machine
DOMAINNAME="max1220.de"

# WAN interface name
WAN_INTERFACE="ens3"

# IPv4 configuration:

# IPv4 address(without subet)
IPV4_ADDR="202.61.255.253"

# Subnet size
IPV4_NETMASK="22"

# Gateway/router IP
IPV4_GATEWAY="202.61.252.1"

# Default nameservers
IPV4_NS1="nameserver 46.38.225.230"
IPV4_NS2="nameserver 46.38.252.230"

# IPv6 configuration:

# enable IPv6
IPV6_ENABLE=true

# address the VM host is reachable at, without netmask
IPV6_HOST_ADDR="2a03:4000:55:bbf:aaaa::1"

# Subnet size
IPV6_HOST_NETMASK="80"

# Gateway/router IP
IPV6_HOST_GATEWAY="fe80::1"

# Default nameservers(IPv6)
IPV6_NS1="nameserver 2a03:4000:0:1::e1e6"
IPV6_NS2="nameserver 2a03:4000:8000::fce6"

# IP prefix for the containers(should end in ::)
IPV6_BR_PREFIX="2a03:4000:55:bbf:cccc::"

# IP address of the bridge used for containers, without netmask
IPV6_BR_ADDR="2a03:4000:55:bbf:cccc::1"

# IPv6 subnet mask. Just the integer, in this setup "80"
IPV6_BR_NETMASK="80"



# from libvirt/setup_libvirt.sh

# Configuration for the libvirt VM installation script
LIBVIRT_CONFIG="host/config_libvirt.sh"

# The connection URL for libvirtd
LIBVIRT_CONNECTION="qemu:///system"

# name of the prepared libvirt VM:
LIBVIRT_VM_NAME="debian_bullseye"

# name of the snapshot that is restored before the setup:
LIBVIRT_VM_SNAPSHOT="prepared"
