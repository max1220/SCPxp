#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script lists all tmux sessions

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"


# read tmux sessions list
readarray -t sessions_list < <( tmux list-session -F "#{q:session_name}" )

if [ ! -v sessions_list[0] ]; then
	# no sessions running
	echo "Content-Type: application/json"
	echo
	echo -e "{ \"success\": true, \"empty\": true, \"sessions\": [] }"
	exit 0
fi

# output sessions list as JSON
echo "Content-Type: application/json"
echo
echo "{"
echo -e "\t\"success\": true,"
echo -e "\t\"sessions\": ["
length="${#sessions_list[@]}"
last_elem="$(( length-1 ))"
for (( i=0; i<"${length}"; i++)); do
	session="${sessions_list[i]}"
	echo -en "\t\t\""
	echo -n "${session}"
	echo -ne "\""
	[ "${i}" -eq "${last_elem}" ] || echo -n ","
	echo
done
echo -e "\t]"
echo "}"
