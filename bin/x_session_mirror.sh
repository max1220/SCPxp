#!/bin/bash
set -euo pipefail
# This is a utillity script used by the X11 streamer web application to
# create a session based on a few arguments. See x11_streamer.js.

# SESSION_ID is required env variable
[ "${SESSION_ID:-}" = "" ] && exit 1

# make sure the session directory exists
SESSION_DIR="xsessions/${SESSION_ID}"
mkdir -p "${SESSION_DIR}"

# create some info files
echo -n "${BASHPID}" > "${SESSION_DIR}/pid"
echo -n "${DISPLAY}" > "${SESSION_DIR}/display"

# create a fifo to write commands to xdotool
mkfifo -m 0600 "${SESSION_DIR}/xdotool"

# start xdotool on the fifo
xdotool "${SESSION_DIR}/xdotool" &

# keep EOF from reaching xdotool
exec 3>"${SESSION_DIR}/xdotool"

# inform the JS part of the session that we're now ready to receive input on the fifo
echo "READY ${SESSION_ID}"

# on exit, end the session
function end_session() {
	echo "END ${SESSION_ID}"
	exec 3>&-
	trap - SIGTERM
	rm -rf "${SESSION_DIR}"
	kill -- -$$
	exit 0
}
trap "end_session" SIGINT SIGTERM EXIT

# wait for xdotool
wait
