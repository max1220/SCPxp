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
if [ -f "${file_path}" ] && [ ! -w "${file_path}" ]; then
	# is a file, but can't be written
	exit_with_status_message "400" "Bad request"
elif ! touch "${file_path}"; then
	# file not found and can't be created
	exit_with_status_message "400" "Bad request"
fi

# get append argument
append="${query_parms_arr[append]:-}"

# enable base64-decoding the content first?
enable_base64_decode="${query_parms_arr[base64_decode]:-}"

# get the data argument
data="${query_parms_arr[data]:-}"

# function that writes to a file, and counts the bytes written
function writer() {
	if [ "${append}" = "true" ]; then
		cat >> "${file_path}"
	else
		cat > "${file_path}"
	fi
}

# write the data
if [ "${enable_base64_decode}" = "true" ]; then
	# pass the base64-decoded data to the writer
	base64 -d - <<< "${data}" | writer
else
	# pass the data as-is to the writer
	echo -n "${data}" | writer
fi

# get the new filesize
new_bytes="$(wc -c < "${file_path}")"

# Respond with the ammount of bytes written to the browser
cat << EOF
Content-type: application/json

{
	"success": true,
	"new_bytes": ${new_bytes}
}
EOF
