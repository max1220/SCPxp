#!/bin/bash
set -euo pipefail
# This is a utillity script used by the X11 streamer web application to
# create a session based on a few arguments. See x11_streamer.js.

# SESSION_ID is required env variable
[ "${SESSION_ID:-}" = "" ] && exit 1
[ "${SESSIONS_DIR:-}" = "" ] && exit 1
[ "${1}" = "" ] && exit 1;

# make sure the session directory exists
SESSION_DIR="${SESSIONS_DIR}/${SESSION_ID}"
mkdir -p "${SESSION_DIR}"

# create some info files
echo -n "${BASHPID}" > "${SESSION_DIR}/pid"
echo -n "${DISPLAY}" > "${SESSION_DIR}/display"
echo -n "${@}" > "${SESSION_DIR}/command"

# create a fifo to write commands to xdotool
mkfifo -m 0600 "${SESSION_DIR}/xdotool"
xdotool "${SESSION_DIR}/xdotool" &
exec 3>"${SESSION_DIR}/xdotool" # keep EOF from reaching xdotool

# inform the JS part of the session that we're now ready to receive input on the fifo
echo "READY ${SESSION_ID}"

# on exit, end the session
function end_session() {
	exec 3>&-
	trap - SIGTERM
	rm -rf "${SESSION_DIR}"
	kill -- -$$ || true
	exit 0
}
trap "end_session" SIGINT SIGTERM EXIT

# run the WM_COMMAND and command specified via arguments
if ! [ "${SESSION_WM:-}" = "" ]; then
	eval "${SESSION_WM}" &
fi

eval "${@}" &
wait
