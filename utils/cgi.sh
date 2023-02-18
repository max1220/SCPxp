# utillity functions for the CGI scripts

# Exit with an HTTP status code and message
function exit_with_status_message() {
	local status="${1}" message="${2}"

	echo "Status: ${status}"
	echo "Content-type: text/plain"
	echo
	echo "${message}"
	exit
}

# Exit with an HTTP redirection
function exit_with_redirect() {
	local redirect_url="${1}"

	echo "Status: 302"
	echo "Location: ${redirect_url}"
	echo
	exit
}

# parse $QUERY_STRING into the list $query_parms_list of keys(odd index) and values(even index)
function parse_query_parms_list() {
	IFS="&=" read -ra query_parms_list <<< "${1}"
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

# Decode the URL-encoded string $1
function url_decode() {
	# TODO: Replace busybox
	busybox httpd -d "${1}"
}

function url_encode() {
    local string="${1}" encoded="" pos c o
    local strlen="${#string}"
    for (( i=0 ; i<strlen ; i++ )); do
        char="${string:$i:1}"
        case "${char}" in
           [-_.~a-zA-Z0-9] ) echo -n "${char}" ;;
           * )               printf '%%%02x' "'${char}'"
        esac
    done
    echo "${encoded}"
}

# TODO: This uses JQ, but could probably replaced with some string manipulation
function json_escape() {
	echo -n "${1}" | jq -Rsa . | tr -d '\n'
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

# HTML-encode special characters in stdin
function html_encode_stdin() {
	while read -rN1 s; do
		s="${s//'&'/'&amp;'}"
		s="${s//'<'/'&lt;'}"
		s="${s//'>'/'&gt;'}"
		s="${s//\"/'&quot;'}"
		echo -n "${s}"
	done
}

