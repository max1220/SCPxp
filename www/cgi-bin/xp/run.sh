#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh
. utils/template.sh

[ "${REQUEST_METHOD}" = "POST" ] || exit_with_status_message "405" "Method not allowed"

# parse $QUERY_STRING into $query_parms_list and $query_parms_arr
parse_query_parms_list "$(</dev/stdin)"
parse_query_parms_arr true

# get the fifo file descriptor argument
command_str="${query_parms_arr[command_str]}"
max_time="${query_parms_arr[timeout]:-5}"

[ "${command_str}" = "" ] && exit_with_status_message "400" "Bad request"

# run the command
command_output="$(timeout "${max_time}" bash - 2>&1 <<< "${command_str}" || true)"

# encode special characters
command_output_html="$(html_encode_stdin <<< "${command_output}")"

# reply with rendered template
echo -e "Content-type: text/html\n"
template_eval www/templates/xp/run_output.template.html
