#!/bin/bash

# utils/log.sh
# Logging utillity functions.

UTILS_LOG_FILE="/dev/stdout" # Where to save logs to. Could also log to file.
UTILS_LOG_ENABLE_ANSI="true" # enable ANSI escape sequences to color log?
declare -g -A UTILS_LOG_COLORS
UTILS_LOG_COLORS=( # Available colors/log categories to log under.
	["ok"]="32"
	["info"]="36"
	["error"]="31"
	["red"]="31"
	["green"]="32"
	["yellow"]="33"
	["blue"]="34"
	["magenta"]="35"
	["cyan"]="36"
	["white"]="0"
)



# output a log message
function LOG_COLOR() {
	# lookup color name to color value
	local color_code="${1}" log_pre log_post
	if ! [ "${color_code}" -eq "${color_code}" ] 2>/dev/null; then # not a number
		color_code="${UTILS_LOG_COLORS[${color_code}]}" # lookup in UTILS_LOG_COLORS
	fi
	shift

	# if interactive, color log output using ANSI escape sequences
	log_pre="$(date +%s: )"
	log_post=""
	if [ "${UTILS_LOG_ENABLE_ANSI}" = "true" ] && [ -n "${PS1-}" ]; then
		log_pre="\e[${color_code}m"
		log_post="\e[0m"
	fi

	# output (formatted) log message to LOG_FILE
	echo -e "${log_pre}$*${log_post}" > "${UTILS_LOG_FILE}"
}

# shortcut to LOG_COLOR using printf first to format a string
function LOGF_COLOR() {
	local color_code="${1}"
	shift
	LOG_COLOR "${color_code}" "$(printf "'%q' " "$@")"
}

# shortcut to LOG_COLOR using the info color
function LOG() {
	LOG_COLOR "info" "$@"
}

# shortcut to LOG using printf first to format a string
function LOGF() {
	LOG "$(printf "'%q' " "$@")"
}

# exit with an error log message
function EXIT_ERROR() {
	LOG_COLOR "error" "${@:2}"
	exit "${1}"
}
