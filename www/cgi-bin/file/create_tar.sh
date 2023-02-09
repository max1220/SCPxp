#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script create a tar from a list of files

# only GET allowed
[ "${REQUEST_METHOD}" = "GET" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from URL
parse_query_parms_list "${QUERY_STRING}"
# parse into array and URL-decode
parse_query_parms_arr true

# get the command to run
files=()
for ((i=0; i<"${#query_parms_list[@]}"; i=i+2)); do
	[ "${query_parms_list[i]}" = "file_path" ] || exit_with_status_message "400" "Bad request"
	file="$(url_decode "${query_parms_list[i+1]}")"
	files+=("${file}")
done

echo "Content-Type: application/octet-stream"
echo "Content-Disposition: attachment; filename=\"download.tar\""
echo

# run the tar command
printf "%s\n" "${files[@]}" | tar --verbatim-files-from --files-from - -cf -
