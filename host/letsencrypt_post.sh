#!/bin/bash
set -eu

# trigger script for letsencrypt to be run *after* new certificates
# have been obtained. Removes temporary firewall rules and
# restarts needed services

### CONFIGURATION ###

# space-seperated list of containers that need to be restarted
RESTART_CONTAINERS=""

### END CONFIGURATION ###



# remove temporary rules
iptables -t filter -D INPUT -p tcp --syn --destination-port 80 -j ACCEPT -m comment --comment temporary_for_letsencrypt
iptables -t nat -D PREROUTING -p tcp --dport 80 -j RETURN -m comment --comment temporary_for_letsencrypt

# set ACLs to enable reading by containers
# needed for bind-mounting when uid-mapping:
setfacl -R -m u:1000000:rx /etc/letsencrypt/archive
setfacl -R -m u:1000000:rx /etc/letsencrypt/live
# allow www-data read access
setfacl -R -m u:1000033:rx /etc/letsencrypt/archive
setfacl -R -m u:1000033:rx /etc/letsencrypt/live

# restart containers
for container_name in $RESTART_CONTAINERS; do
	if lxc-stop -n "${container_name}"; then
		# only start if container was running before
		lxc-start -n "${container_name}"
	fi
done
