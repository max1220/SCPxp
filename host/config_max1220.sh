# from setup_host.sh:


# perform setup needed for cgroup v2(currently broken)
ENABLE_CGROUPV2=false

# enable setup for unprivileged containers(currently broken)
ENABLE_UNPRIVILEGED=false

# setup this user for unprivileged containers/libvirt(needs to exist already!)
USERNAME="max"

# enable setup for libvirtd
ENABLE_LIBVIRT=true



# from setup_btrfs.sh:


# Try to setup btrfs?
ENABLE_BTRFS=true

# the partition of the btrfs
BTRFS_DISK="/dev/vda2"

# a snapshot of the current root will be created, this is it's name
BTRFS_SUBVOLUME="current"

# directories that get their own subvolume.
BTRFS_SUBVOLUME_DIRS="/root /home /var/log /var/cache"



# from setup_network.sh:


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

# address the VM host is reachable at(for "eth0"), without netmask
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



# from remote_install.sh:


# used for ssh and scp during installation
REMOTE_SSH="${USERNAME}@${IPV4_ADDR}"

# the configuration used to setup the remote host system(typically this file)
REMOTE_HOST_CONFIG="host/config_libvirt.sh"

# the network configuration that is applied to the remote host system
REMOTE_NETWORK_CONFIG="${HOST_CONFIG}"

# the btrfs configuration that is used on the remote host system
REMOTE_BTRFS_CONFIG="${HOST_CONFIG}"

# Time to wait for the remote system to come back online
REMOTE_REBOOT_TIMEOUT=25
