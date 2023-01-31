#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh
. utils/hex.sh

# this script streams data from a a file and sends hex-encoded bytes.
# This is useful for FIFOs, and can stream the output in real-time.

# only GET allowed
[ "${REQUEST_METHOD}" = "GET" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from URL
parse_query_parms_list "${QUERY_STRING}"
# parse into array and URL-decode
parse_query_parms_arr true

# get the fifo file descriptor argument
file_path="${query_parms_arr[file_path]:-}"
[ -r "${file_path}" ] || exit_with_status_message "400" "Bad request"

# respond with the text/event-stream header
echo "Content-Type: text/event-stream"
echo

# stream the output of the command, by sending separate events for every byte
while true; do
	while IFS="" read -rN1 data; do
		hex_data="$(char_to_hex "${data}")"
		#echo "event: read"
		echo "data: { \"data\": \"${hex_data}\" }"
		#echo "data: ${hex_data}"
		echo
	done < "${file_path}"
done
