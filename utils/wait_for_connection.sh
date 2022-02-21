# Checks for up to 30s for a connection to become available.
# $1 is address
# $2 is port
function wait_for_connection() {
	for i in {1..30}; do
		if timeout 1 bash -c ": >/dev/tcp/${1}/${2}" 2> /dev/zero; then
			LOG "connection established!"
			exec 3<&-
			return 0
		else
			LOG "Waiting for connection ${i}/30"
		fi
		sleep 1
	done
	return 1
}
