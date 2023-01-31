#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script sends some keys to a tmux session

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the name of the session
session_name="${query_parms_arr[session_name]:-}"
[ "${session_name}" = "" ] && exit_with_status_message "400" "Bad request"

# get the keys argument
keys_str="${query_parms_arr[keys_str]:-}"
[ "${keys_str}" = "" ] && exit_with_status_message "400" "Bad request"

# send the keys to tmux
tmux send-keys -t "${session_name}" "${keys_str}"

# Respond with success
cat << EOF
Content-type: application/json

{
	"success": true,
}
EOF
