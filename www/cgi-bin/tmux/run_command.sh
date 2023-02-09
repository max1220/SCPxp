#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script sends a tmux command, and responds with it's reply

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the command to run
command_args=()
for ((i=0; i<"${#query_parms_list[@]}"; i=i+2)); do
	[ "${query_parms_list[i]}" = "arg" ] || exit_with_status_message "400" "Bad request"
	command_arg="$(url_decode "${query_parms_list[i+1]}")"
	command_args+=("${command_arg}")
done

echo "Content-Type: text/plain"
echo

# run the tmux command
tmux -C "${command_args[@]}"
