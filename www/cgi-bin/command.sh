#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../..

. utils/cgi.sh

# Run an arbitrary command(allows custom headers and content-type, all methods)
parse_query_parms_list "${QUERY_STRING}"
parse_query_parms_arr true

# check if command_str was provided
command_str="${query_parms_arr[command_str]:-}"
[ "${command_str}" = "" ] && exit_with_status_message "400" "Bad request"

# get the command to run and the HTTP headers to include
command_args=()
headers=()
env_key=""
# TODO: Add envirioment variables?
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

# this script simply runs a command, and returns the output as-is.
# output the content-type
content_type="${query_parms_arr[content_type]:-text/plain}"
echo "Content-Type: ${content_type}"

# output other headers
for ((i=0; i<"${#headers[@]}"; i++)); do
	echo "${headers[i]}"
done

# begin body
echo

# run the command
"${command_str}" "${command_args[@]}"
