HOSTNAME="vm"
DOMAINNAME="local"

# WAN interface name
WAN_INTERFACE="enp1s0"

# IPv4 configuration
IPV4_ADDR="192.168.122.26" # needs to be without subnet mask
IPV4_NETMASK="24"
IPV4_GATEWAY="192.168.122.1" # gateway/router ip
IPV4_NS1="nameserver 9.9.9.9" # nameservers
IPV4_NS2="nameserver 149.112.112.112"

# IPv6 configuration
IPV6_ENABLE=false # you can disable IPv6 configuration enirely.
