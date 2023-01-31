#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh
. utils/lxc.sh

# this script lists all tmux sessions

# only GET allowed
[ "${REQUEST_METHOD}" = "GET" ] || exit_with_status_message "405" "Method not allowed"

# read tmux sessions list
readarray -t stoppped_containers < <( lxc_list_stopped )
readarray -t running_containers < <( lxc_list_running )

# output sessions list as JSON
echo "Content-Type: application/json"
echo
echo "{"
echo -e "\t\"success\": true,"

echo -e "\t\"stopped_containers\": ["
stopped_containers_length="${#stoppped_containers[@]}"
stopped_containers_last_elem="$(( stopped_containers_length-1 ))"
for (( i=0; i<"${stopped_containers_length}"; i++)); do
	stopped_container="${stoppped_containers[i]}"
	echo -en "\t\t"
	json_escape "${stopped_container}"
	[ "${i}" -eq "${stopped_containers_last_elem}" ] || echo -n ","
	echo
done
echo -e "\t],"

echo -e "\t\"running_containers\": ["
running_containers_length="${#running_containers[@]}"
running_containers_last_elem="$(( running_containers_length-1 ))"
for (( i=0; i<"${running_containers_length}"; i++)); do
	running_container="${running_containers[i]}"
	echo -en "\t\t"
	json_escape "${running_container}"
	[ "${i}" -eq "${running_containers_last_elem}" ] || echo -n ","
	echo
done
echo -e "\t]"


echo "}"
