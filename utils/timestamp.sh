
# get time in seconds since epoch
function get_timestamp() {
	#date +%s.%N
	echo "${EPOCHREALTIME}"
}
