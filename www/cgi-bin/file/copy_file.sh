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

# get the source and target arguments
source_file_path="${query_parms_arr[source_file_path]:-}"
target_dir_path="${query_parms_arr[target_dir_path]:-}"
[ -e "${source_file_path}" ] || exit_with_status_message "400" "Bad request"
[ -d "${target_dir_path}" ] || exit_with_status_message "400" "Bad request"

# copy the file(s)
recursive="${query_parms_arr[recursive]:-}"
recursive_arg=""
if [ "${recursive}" = "true" ]; then
	cp -n -r "${source_file_path}" "${target_dir_path}" || exit_with_status_message "500" "Internal server error"
else
	cp -n "${source_file_path}" "${target_dir_path}" || exit_with_status_message "500" "Internal server error"
fi

# respond with success
cat << EOF
Content-type: application/json

{
	"success": true
}
EOF
