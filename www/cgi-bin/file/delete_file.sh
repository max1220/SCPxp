#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script deletes a file

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from URL
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the filepath argument
file_path="${query_parms_arr[file_path]:-}"
[ "${file_path}" = "" ] && exit_with_status_message "400" "Bad request"

# check that $file_path is a file
[ -f "${file_path}" ] || exit_with_status_message "400" "Bad request"

rm -f -- "${file_path}"

# respond with success
cat << EOF
Content-type: application/json

{
	"success": true
}
EOF
