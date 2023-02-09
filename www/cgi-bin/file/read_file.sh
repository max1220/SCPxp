#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script reads a file, and optionally returns it base64-encoded

# only GET allowed
[ "${REQUEST_METHOD}" = "GET" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from URL
parse_query_parms_list "${QUERY_STRING}"
# parse into array and URL-decode
parse_query_parms_arr true

# get the filepath argument
file_path="${query_parms_arr[file_path]:-}"
[ "${file_path}" = "" ] && exit_with_status_message "400" "Bad request"

# check that $file_path is a file
[ -r "${file_path}" ] || exit_with_status_message "400" "Bad request"

# Enable base64-encoding the file first?
enable_base64_encode="${query_parms_arr[base64_encode]:-}"
#content_type="${query_parms_arr[content_type]:-application/octet-stream}"
content_type="${query_parms_arr[content_type]:-text/plain}"
content_disposition="${query_parms_arr[content_disposition]:-}"

echo "Content-Type: ${content_type}"
if ! [ "${content_disposition}" = "" ]; then
	echo "Content-Disposition: ${content_disposition}"
fi
echo

if [ "${enable_base64_encode}" = "true" ]; then
	# output the file base64-encoded
	base64 "${file_path}"
else
	# output the file as-is
	cat "${file_path}"
fi
