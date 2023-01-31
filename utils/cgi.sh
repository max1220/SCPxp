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

function html_encode_stdin() {
	while read -rN1 s; do
		s="${s//&/"&amp;"}"
		s="${s//</"&lt;"}"
		s="${s//>/"&gt;"}"
		s="${s//'"'/"&quot;"}"
		echo -n "${s}"
	done
}

