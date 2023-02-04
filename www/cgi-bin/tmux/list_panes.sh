#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script lists all panes in a tmux session

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the name of the session to kill
session_name="${query_parms_arr[session_name]:-}"

# read tmux panes list
readarray -t panes_list < <( tmux list-panes -s -t "${session_name}" -F "\"pane_name\": \"#{q:pane_name}\", \"pane_id\": \"#{q:pane_id}\", \"cursor_x\":#{q:cursor_x},\"cursor_y\":#{q:cursor_y}" )

if [ ! -v panes_list[0] ]; then
	# no sessions running
	echo "Content-Type: application/json"
	echo
	echo -e "{ \"success\": true, \"empty\": true, \"panes\": [] }"
	exit 0
fi

# output panes list as JSON
echo "Content-Type: application/json"
echo
echo "{"
echo -e "\t\"success\": true,"
echo -e "\t\"panes\": ["
length="${#sessions_list[@]}"
last_elem="$(( length-1 ))"
for (( i=0; i<"${length}"; i++)); do
	pane="${panes_list[i]}"
	echo -en "\t\t"
	echo -n "{${pane}}"
	echo -ne ""
	[ "${i}" -eq "${last_elem}" ] || echo -n ","
	echo
done
echo -e "\t]"
echo "}"
