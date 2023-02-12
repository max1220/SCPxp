#!/bin/bash
mkdir -p xsessions

# create file with info about display
RANDOM_ID="${1}"
echo -n "${DISPLAY}" > "xsessions/${RANDOM_ID}.display"
shift

# launch the window manager
ratpoison &

# start the command
"${@}"
