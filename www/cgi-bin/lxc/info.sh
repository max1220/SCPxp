#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh
. utils/lxc.sh

# only GET allowed
[ "${REQUEST_METHOD}" = "GET" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from URL
parse_query_parms_list "${QUERY_STRING}"
# parse into array and URL-decode
parse_query_parms_arr true

# get the container_name argument
container_name="${query_parms_arr[container_name]:-}"
[ "${container_name}" = "" ] && exit_with_status_message "400" "Bad request"

# check that container exists
lxc_check_exists "${container_name}" || exit_with_status_message "400" "Bad request"

state="$(lxc-info -H -q -s -n "${container_name}")"
pid="$(lxc-info -H -q -p -n "${container_name}")"
ips="$(lxc-info -H -q -i -n "${container_name}")"
stats="$(lxc-info -H -q -S -n "${container_name}")"

# output sessions list as JSON
echo "Content-Type: application/json"
echo
cat << EOF
{
	"success": true,
	"name": $(json_escape "${container_name}"),
	"state": $(json_escape "${state}"),
	"pid": $(json_escape "${pid}"),
	"ips": $(json_escape "${ips}"),
	"stats": $(json_escape "${stats}")
}
EOF
