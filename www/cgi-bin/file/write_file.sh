#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script writes to a file, optionally decoding the data using base64 first.

# only POST allowed
[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from POST body
parse_query_parms_list "$(</dev/stdin)"
# parse into array and URL-decode
parse_query_parms_arr true

# get the filepath argument
file_path="${query_parms_arr[file_path]:-}"
[ "${file_path}" = "" ] && exit_with_status_message "400" "Bad request"

# check that $file_path can be written to or created
if ! [ -f "${file_path}" ]; then
	# file does not exist,
	# TODO: check directory write permisisons here, instead of error further below
	#dir="$(dirname "${file_path}")"
elif ! [ -w "${file_path}" ]; then
	# file exists, but is not writeable
	exit_with_status_message "400" "Bad request"
fi

# get append argument
append="${query_parms_arr[append]:-}"
append_arg=""
[ "${append}" = "true" ] && append_arg="-a"

# enable base64-decoding the content first?
enable_base64_decode="${query_parms_arr[base64_decode]:-}"

# get the data argument
data="${query_parms_arr[data]:-}"

# function that writes to a file, and counts the bytes written
function writer() {
	tee $append_arg "${file_path}" | wc -c
}

# write the data
bytes_written=""
if [ "${enable_base64_decode}" = "true" ]; then
	# pass the base64-decoded data to the writer
	bytes_written="$(base64 -d - <<< "${data}" | writer)"
else
	# pass the data as-is to the writer
	bytes_written="$(echo -n "${data}" | writer)"
fi

# Respond with the ammount of bytes written to the browser
cat << EOF
Content-type: application/json

{
	"success": true,
	"written": ${bytes_written}
}
EOF
