#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script gets the current screen content of a tmux session

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the name of the session
session_name="${query_parms_arr[session_name]:-}"
[ "${session_name}" = "" ] && exit_with_status_message "400" "Bad request"

# enable escape sequences? This will also force base64-encoding
enable_escape="${query_parms_arr[escape]:-}"

# enable base64-encode output?
base64_encode="${query_parms_arr[base64_encode]:-}"

# get the screen content
screen_content=""
if [ "${enable_escape}" = "true" ] && [ "${base64_encode}" = "true" ]; then
	screen_content="$(tmux capture-pane -t "${session_name}" -p -e | base64 || exit_with_status_message "400" "Bad request")"
elif [ "${enable_escape}" = "true" ]; then
	screen_content="$(tmux capture-pane -t "${session_name}" -p -e || exit_with_status_message "400" "Bad request")"
elif [ "${base64_encode}" = "true" ]; then
	screen_content="$(tmux capture-pane -t "${session_name}" -p | base64 || exit_with_status_message "400" "Bad request")"
else
	screen_content="$(tmux capture-pane -t "${session_name}" -p || exit_with_status_message "400" "Bad request")"
fi


echo "Content-Type: text/plain"
echo
echo -n "${screen_content}"
