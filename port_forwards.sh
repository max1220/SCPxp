#!/bin/bash
set -e
while IFS=':' read -r host_port container container_port; do
	container_ip=$(lxc-info -Hiq -n $container)
	echo "iptables -t nat -A PREROUTING -p tcp --dport $host_port $1 -j DNAT --to $container_ip:$container_port"
done
