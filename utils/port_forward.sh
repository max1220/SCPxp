# Generate an iptable port forward rule for the container's NAT network
# $1 is the WAN interface
# $2 is the host port
# $3 is the container ip
# $4 is the container port
function generate_port_forward_for_ip() {
	local interface="${1}"
	local host_port="${2}"
	local container_ip="${3}"
	local container_port="${4}"
	echo "iptables -t nat -A PREROUTING -p tcp --dport ${host_port} ${interface} -j DNAT --to ${container_ip}:${container_port}"
}

