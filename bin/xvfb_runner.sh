#!/bin/bash
# This is a utillity script used by the X11 streamer web application to
# create a session based on a few arguments. See x11_streamer.js.

# make sure the session directory exists
SESSION_DIR="xsessions/${SESSION_ID}"
mkdir -p "${SESSION_DIR}"

# create some info files
echo -n "${BASHPID}" > "${SESSION_DIR}/pid"
echo -n "${DISPLAY}" > "${SESSION_DIR}/display"

# create a fifo to write commands to xdotool
mkfifo "${SESSION_DIR}/xdotool"
xdotool "${SESSION_DIR}/xdotool" &
exec 3>"${SESSION_DIR}/xdotool" # keep EOF from reaching xdotool

# start the window manager if requested
if ! [ "${SESSION_WM:-}" = "" ]; then
	"${SESSION_WM[@]}" &
fi

# start the command
"${@}"
