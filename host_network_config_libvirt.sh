HOSTNAME="vm"
DOMAINNAME="local"

# WAN interface name
WAN_INTERFACE="enp1s0"

# IPv4 configuration
# the default libvirtd network settings would be 192.168.122.xxx/24
# we use a different network on the host to allow the guest to use the default libvirt network
IPV4_ADDR="192.168.100.25" # needs to be without subnet mask
IPV4_NETMASK="24"
IPV4_GATEWAY="192.168.100.1" # gateway/router ip
IPV4_NS1="nameserver 9.9.9.9" # nameservers
IPV4_NS2="nameserver 149.112.112.112"

# IPv6 configuration
IPV6_ENABLE=false # you can disable IPv6 configuration enirely.
#IPV6_HOST_ADDR="" # address the VM host is reachable at(for "eth0"), without netmask
#IPV6_HOST_NETMASK="" # Just the integer, in this setup "80"
#IPV6_HOST_GATEWAY="" # provider-provided gateway
#IPV6_NS1="" # nameservers
#IPV6_NS2=""
#IPV6_BR_PREFIX="" # ip prefix for the containers(should end in ::)
#IPV6_BR_ADDR="" # ip address of the bridge used for containers, without netmask
#IPV6_BR_NETMASK="" # Just the integer, in this setup "80"
