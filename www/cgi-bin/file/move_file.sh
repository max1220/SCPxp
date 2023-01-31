#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script moves a file or directory.

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the filepath arguments
source_file_path="${query_parms_arr[source_file_path]:-}"
target_file_path="${query_parms_arr[target_file_path]:-}"
[ "${source_file_path}" = "" ] && exit_with_status_message "400" "Bad request"
[ "${target_file_path}" = "" ] && exit_with_status_message "400" "Bad request"

# check that $source_file_path exists
[ -e "${source_file_path}" ] || exit_with_status_message "400" "Bad request"

rm -f -- "${file_path}"

# respond with success
cat << EOF
Content-type: application/json

{
	"success": true
}
EOF
