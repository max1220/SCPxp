#!/bin/bash
set -e

# trigger script for letsencrypt to be run *before* letsencrypt tries
# to authenticate a domain. Adds temporary firewall rules for the
# web-based authentication.

# temporary rule allow incomming http traffic for the host
iptables -t filter -A INPUT -p tcp --syn --destination-port 80 -j ACCEPT -m comment --comment temporary_for_letsencrypt

# add early-return for container DNAT for port 80
iptables -t nat -I PREROUTING 1 -p tcp --dport 80 -j RETURN -m comment --comment temporary_for_letsencrypt
