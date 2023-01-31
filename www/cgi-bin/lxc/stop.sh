#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh
. utils/lxc.sh
function confirm() { return 0; }
function confirm_exec() { "$@"; }

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the container_name argument
container_name="${query_parms_arr[container_name]:-}"
[ "${container_name}" = "" ] && exit_with_status_message "400" "Bad request"

mode="${query_parms_arr[mode]:-}"

# check that container exists
lxc_check_exists "${container_name}" || exit_with_status_message "400" "Bad request"

# perform required action
if [ "${mode}" = "kill" ]; then
	lxc_kill_container "${container_name}"
elif [ "${mode}" = "restart" ]; then
	lxc_restart_container "${container_name}"
else
	lxc_stop_container "${container_name}"
fi


# output success
echo "Content-Type: application/json"
echo
echo "{ \"success\": true } "
