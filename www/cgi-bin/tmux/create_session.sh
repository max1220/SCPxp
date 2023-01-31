#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script launches a detatched tmux session with the specified command.

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the command to run
command_str="${query_parms_arr[command_str]:-}"
[ "${command_str}" = "" ] && command_str="bash"

# generate a new name for the session
session_name="web-terminal-session-$RANDOM"

# launch new session with command
tmux new-session -d -s "${session_name}" "${command_str}"

# return the created session name
cat << EOF
Content-type: application/json

{
	"success": true,
	"session_name": "${session_name}"
}
EOF
