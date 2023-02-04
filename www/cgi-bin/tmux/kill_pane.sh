#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script kills a tmux session.

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the name of the session to kill
session_name="${query_parms_arr[session_name]:-}"
[ "${session_name}" = "" ] && exit_with_status_message "400" "Bad request"

pane_name="${query_parms_arr[pane_name]:-}"
[ "${pane_name}" = "" ] && exit_with_status_message "400" "Bad request"

# kill the session
tmux kill-pane -t "${session_name}:0.${pane_name}"

# indicate success
cat << EOF
Content-type: application/json

{
	"success": true
}
EOF
