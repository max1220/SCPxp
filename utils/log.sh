LOG_FG_COLOR="32" # as in the ANSI 3/4-bit color escape sequence
LOG_FILE="/dev/stdout" # could also log to stderr

# output a log message
function LOG() {
	log_pre=""
	log_post="\n"

	if [ -n "${PS1-}" ]; then
		# if interactive, color log output using ANSI escape sequences
		log_pre="\e[${LOG_FG_COLOR}m$(basename "${0}"):${LINENO}: "
		log_post="\e[0m\n"
	fi

	# output (formatted) log message to LOG_FILE
	echo -e -n "${log_pre}$*${log_post}" > "${LOG_FILE}"
}


# Output a final message and exit
function ERROR() {
	LOG_FG_COLOR="31"
	LOG "${1}"
	exit "${2}"
}
