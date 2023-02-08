#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script gets the current screen content of a tmux session

# only GET allowed
[ "${REQUEST_METHOD}" = "GET" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "${QUERY_STRING}"
# parse into array and URL-decode
parse_query_parms_arr true

# get the name of the session
session_name="${query_parms_arr[session_name]:-}"
[ "${session_name}" = "" ] && exit_with_status_message "400" "Bad request"

# respond with the text/event-stream header
echo "Content-Type: text/event-stream"
echo

# stream the output of tmux control-mode as event-stream

# create a pipe that never has any data, because stdin in closed
sleep 9999999 | tmux -C attach-session -t "${session_name}" | while IFS="" read -r data; do
	echo "data: ${data}"
	echo
done

echo "event: ended"
echo "data: ret: $?"
echo
