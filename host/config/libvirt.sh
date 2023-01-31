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
ENABLE_BTRFS=false

# the partition of the btrfs
#BTRFS_DISK="/dev/vda2"

# a snapshot of the current root will be created, this is it's name
#BTRFS_SUBVOLUME="current"

# directories that get their own subvolume.
#BTRFS_SUBVOLUME_DIRS="/root /home /var/log /var/cache"



# from host/setup_network.sh:


# Enable networking setup
ENABLE_NETWORK=true

# Hostname to setup for this machine
HOSTNAME="host"

# Domainname to setup for this machine
DOMAINNAME="example.com"

# WAN interface name
WAN_INTERFACE="enp1s0"

# IPv4 configuration:

# IPv4 address(without subnet)
IPV4_ADDR="192.168.100.254"

# Subnet size
IPV4_NETMASK="24"

# Gateway/router IP
IPV4_GATEWAY="192.168.100.1"

# Default nameservers
IPV4_NS1="nameserver 9.9.9.9"
IPV4_NS2="nameserver 149.112.112.112"

# IPv6 configuration:

# enable IPv6
IPV6_ENABLE=false

# address the VM host is reachable at, without netmask
#IPV6_HOST_ADDR="xxxx:xxxx:xxxx:xxxx:aaaa::1"

# Subnet size
#IPV6_HOST_NETMASK="80"

# Gateway/router IP
#IPV6_HOST_GATEWAY="fe80::1"

# Default nameservers(IPv6)
#IPV6_NS1="nameserver xxxx:xxxx:xxxx:xxxx::1234"
#IPV6_NS2="nameserver xxxx:xxxx:xxxx:xxxx::2345"

# IP prefix for the containers(should end in ::)
#IPV6_BR_PREFIX="xxxx:xxxx:xxxx:xxxx:cccc::"

# IP address of the bridge used for containers, without netmask
#IPV6_BR_ADDR="xxxx:xxxx:xxxx:xxxx:cccc::1"

# IPv6 subnet mask. Just the integer, in this setup "80"
#IPV6_BR_NETMASK="80"



# from libvirt/prepare_libvirt.sh


# SSH Public key to install for the user on the VM
SSH_PUB="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDKvYFrAT997455zvBcOgudHwp2ZvlNKq278ZsTDR+MQFH0xwKVywzQMnOH1MtzBocwO44VmDKm6YM92KXuMcxQ/8QeTzp+dj+PuOfPgCYXNNqCsPw75ruTFxADBVmtVUCA+SSlmj85RMqgcRVXKp55it3EukbvQJVeMoAhUwiLpi+lVQwFfB9Poh9gFACK/J6yZ7g2aUzDwOog/YhQwpuiD1Z2C9jezaBDm+Z/sDMWN0HKoCfLcOz95kgGTVU1C+KKQdGFO9KRc1t7bA5VUyFwWRf97JDtAdCq/QCQLZc1ZoFHYDsKv6THuLJR0D4paKqqTLFCyKZtv7qVpsNJwOBANA8W+2R3/eoWVbTJS2eNkNM3nsxoyJAwBsz4DmsJghkapHrGh9GElMqjlDVpfFNX+B3un6LiqvUDJxcUCvaBLdygxchwQ3oeDSpNGADw6L/PsRB+k4UN0uUhP1YAnyv7RtaK9X20V/EsPj1KlG+2yNsCsmtXyI+Kv/z3Y/TuXok= max@debian-fx"



# from libvirt/setup_libvirt.sh

# Configuration for the libvirt VM installation script
LIBVIRT_CONFIG="config/host_libvirt.sh"

# The connection URL for libvirtd
LIBVIRT_CONNECTION="qemu:///system"

# name of the prepared libvirt VM:
LIBVIRT_VM_NAME="debian_bullseye"

# name of the snapshot that is restored before the setup:
LIBVIRT_VM_SNAPSHOT="prepared"
