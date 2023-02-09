#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script creates a directory

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from URL
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the source and target arguments
target_dir_path="${query_parms_arr[target_dir_path]:-}"
[ -e "${target_dir_path}" ] && exit_with_status_message "400" "Bad request"

# create the directory
mkdir -p "${target_dir_path}"

# respond with success
cat << EOF
Content-type: application/json

{
	"success": true
}
EOF
