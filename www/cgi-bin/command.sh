#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/..

. utils/cgi.sh

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the command_str argument
command_str="${query_parms_arr[command_str]:-}"
[ "${command_str}" = "" ] && exit_with_status_message "400" "Bad request"

# this script simply runs a command, and returns the output as-is.
echo "Content-Type: text/plain"
echo

$command_str
