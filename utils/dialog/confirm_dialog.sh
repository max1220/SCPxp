#!/bin/bash

# utils/confirm_dialog.sh
# Utillity functions for asking the user to confirm an action.
# Call with the command to be run as first argument, which is run
# if the user confirms it.
# These functions should always be called when the system is about to be
# modified.
# Asking for permission can be disabled via UTILS_CONFIRM_ENABLE.
# Running any commands can be disabled via UTILS_CONFIRM_DRYRUN.
# Waiting for the user to confirm output of command can be enabled via UTILS_CONFIRM_WAIT.

# The functions uses these envirioment variables:
#  * UTILS_CONFIRM_DRYRUN - If true, don't run any commands
#  * UTILS_CONFIRM_ENABLE - If true, ask user for permission(false = always confirm)
#  * UTILS_CONFIRM_WAIT - If true, wait for user after running the command

# The functions use the following functions from other files:
#  * yesno from utils/dialog.sh
#  * LOG from utils/log.sh
#  * LOG_COLOR from utils/log.sh



function confirm() {
	# when UTILS_CONFIRM_ENABLE is enabled, ask the user for confirmation,
	# and if aborted or user answered "no" then exit.
	if [ "${UTILS_CONFIRM_ENABLE}" = true ]; then
		if ! yesno "${*}"; then
			return 1
		fi
	fi
}

function confirm_exec() {
	# Ask user for confirmation about this command:
	confirm "About to run command:\n\n${*}"

	# on UTILS_CONFIRM_DRYRUN just echo the command, then exit.
	if [ "${UTILS_CONFIRM_DRYRUN}" = true ]; then
		LOG_COLOR "blue" "DRYRUN: ${*}"
		return 0
	fi

	# run command, capture exit code
	"$@"
	cmd_exit=$?

	# if WAIT_AFTER_COMMAND is enabled, show command and exit code,
	# wait fur user to press enter.
	if [ "${UTILS_CONFIRM_WAIT}" = true ]; then
		LOG "--------------------------------------------------------------------------------"
		LOG "Command: ${*}"
		LOG "Exit: ${cmd_exit}"
		read -r -p "Press enter to continue"
	fi
}
