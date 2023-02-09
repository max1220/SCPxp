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

# check that $file_path exists
[ -f "${file_path}" -o -d "${file_path}" ] || exit_with_status_message "400" "Bad request"

# check that the new mode is valid
new_mode="${query_parms_arr[new_mode]:-}"
[[ "${new_mode}" =~ [0-7][0-7][0-7][0-7] ]] || exit_with_status_message "400" "Bad request"

# run chmod
chmod "${new_mode}" "${file_path}"

# respond with success
cat << EOF
Content-type: application/json

{
	"success": true
}
EOF
