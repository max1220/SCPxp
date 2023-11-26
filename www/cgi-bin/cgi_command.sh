#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../..

# Execute arbitrary commands via CGI, optionally encode the output as event-stream.
# Allows to set the response headers, including content-type,
# and allows setting environment variables for the command.
# Allows all methods, parameters are always URL-encoded(in QUERY_STRING).

# Exit with an HTTP status code and message
function exit_with_status_message() {
	local status="${1}" message="${2}"

	echo "Status: ${status}"
	echo "Content-type: text/plain"
	echo
	echo "${message}"
	exit
}

# Decode the URL-encoded string $1
function url_decode() {
	# TODO: Replace busybox with Bash stuff
	busybox httpd -d "${1}"
}

# parse $query_parms_list into the associative array $query_parms_arr
function parse_query_parms_arr() {
	declare -g -A query_parms_arr
	for ((i=0; i<${#query_parms_list[@]}; i+=2)); do
		# read key-value from #query_list
		local query_key="${query_parms_list[i]}"
		local query_value="${query_parms_list["$((i+1))"]:-}"
		if [ "${1:-false}" = "true" ]; then
			# url-decode before parsing
			local query_key_dec query_value_dec
			query_key_dec="$(url_decode "${query_key}")"
			query_value_dec="$(url_decode "${query_value}")"
			query_parms_arr+=(["${query_key_dec}"]="${query_value_dec}")
		else
			query_parms_arr+=(["${query_key}"]="${query_value}")
		fi
	done
}

# encode the stdout stream as event-stream events, line-by-line
function eventstream_encode_stdout_lines() {
	while LANG="C" IFS="" read -r line; do
		printf "event: stdout_line\ndata: %s\n\n" "${line}"
	done
}

# encode the stdout stream as event-stream events, byte-by-byte
function eventstream_encode_stdout_bytes() {
	while LANG="C" IFS="" read -r -d "" -N 1 byte_val; do
		printf "event: stdout_byte\ndata: %.2x\n\n" "'${byte_val}"
	done
}

# run the arguments as a command, and encode stdout/stderr into an event-stream line-by-line
function eventstream_run_command_lines() {
	# send the initial message
	printf "event: begin\ndata: lines\n\n"

	# run the command and redirect to encoder functions
	local merge_stderr="${1}"
	shift
	if [ "${merge_stderr}" = "true" ]; then
		"${@}" |& eventstream_encode_stdout_lines && return_value="0" || return_value="$?"
	else
		"${@}" | eventstream_encode_stdout_lines && return_value="0" || return_value="$?"
	fi

	# send final event
	printf "event: return\ndata: ${return_value}\n\n"
}

# run the arguments as a command, and encode stdout/stderr into an event-stream byte-by-byte
function eventstream_run_command_bytes() {
	# send the initial message
	printf "event: begin\ndata: bytes\n\n"

	# run the command and redirect to encoder functions
	"${@}" | eventstream_encode_stdout_bytes && return_value="0" || return_value="$?"

	# send final event
	printf "event: return\ndata: ${return_value}\n\n"
}



# parse $QUERY_STRING into the list $query_parms_list of keys(odd index) and values(even index)
IFS="&=" read -ra query_parms_list <<< "${QUERY_STRING}"

# parse $query_parms_list into the associative array $query_parms_arr
parse_query_parms_arr true

# check if command_str was provided
command_str="${query_parms_arr[command_str]:-}"
[ "${command_str}" = "" ] && exit_with_status_message "400" "Bad request"

# parse query_parms_list and get the command to run and the HTTP headers to include
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
