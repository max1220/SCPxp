#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../..

. utils/cgi.sh
# Execute arbitrary commands via CGI, optionally encode the output as event-stream.
# Allows to set the response headers, including content-type,
# and allows setting environment variables for the command.
# Allows all methods, parameters are always URL-encoded(in QUERY_STRING).

parse_query_parms_list "${QUERY_STRING}"
parse_query_parms_arr true

# check if command_str was provided
command_str="${query_parms_arr[command_str]:-}"
[ "${command_str}" = "" ] && exit_with_status_message "400" "Bad request"

# get the command to run and the HTTP headers to include
command_args=()
headers=()
env_key=""
for ((i=0; i<"${#query_parms_list[@]}"; i=i+2)); do
	if [ "${query_parms_list[i]}" = "arg" ]; then
		command_arg="$(url_decode "${query_parms_list[i+1]:-}")"
		command_args+=("${command_arg}")
	elif [ "${query_parms_list[i]}" = "header" ]; then
		header="$(url_decode "${query_parms_list[i+1]:-}")"
		headers+=("${header}")
	elif [ "${query_parms_list[i]}" = "env_key" ]; then
		env_key="$(url_decode "${query_parms_list[i+1]:-}")"
	elif [ "${query_parms_list[i]}" = "env_value" ]; then
		env_value="$(url_decode "${query_parms_list[i+1]:-}")"
		export "${env_key}=${env_value}"
	fi
done

# output the content-type and headers
content_type="${query_parms_arr[content_type]:-text/plain}"
echo "Content-Type: ${content_type}"
for ((i=0; i<"${#headers[@]}"; i++)); do
	echo "${headers[i]}"
done
echo

# redirect stderr to stdout if requested
merge_stderr="${query_parms_arr[merge_stderr]:-}"
if [ "${merge_stderr}" = "true" ]; then
	exec 2>&1
fi

if [ "${query_parms_arr[event_stream]:-}" = "bytes" ]; then
	# run the command, encode stdout as hex bytes in the event-stream format
	eventstream_run_command_bytes "${command_str}" "${command_args[@]}"
elif [ "${query_parms_arr[event_stream]:-}" = "lines" ]; then
	# run the command, encode stdout as lines in the event-stream format
	eventstream_run_command_lines "${merge_stderr}" "${command_str}" "${command_args[@]}"
elif [ "${query_parms_arr[base64]:-}" = "base64" ]; then
	# base64-encode the output
	"${command_str}" "${command_args[@]}" | base64
else
	# run the command
	"${command_str}" "${command_args[@]}"
fi
