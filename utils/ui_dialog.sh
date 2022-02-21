# These functions are used to get interactive user input
DIALOG="dialog"
UI_HEIGHT=20
UI_WIDTH=72

# The functions use these envirioment variables:
#  * DIALOG_BACKTITLE
#  * DRYRUN
#  * REQUIRE_CONFIRM
#  * WAIT_AFTER_COMMAND


# Show a menu for the user to select a single option.
# $1 is the menu title
# All following arguments are interpreted as the list of menu options.
# Every menu option has two arguments, the short hand name and a description.
# The return value is 0 on success,
# 1 when the cancel button was pressed, and
# 255 if escape was pressed.
# Writes the selected menu entry short hand name to stdout
function menu() {
	"${DIALOG}" --backtitle "${DIALOG_BACKTITLE}" --stdout --menu "${1}" "${UI_HEIGHT}" "${UI_WIDTH}" 0 "${@:2}"
}


# Same as above, except that only one argument per menu entry is required,
# and no descriptions are shown.
function menu_single() {
	"${DIALOG}" --backtitle "${DIALOG_BACKTITLE}" --stdout --no-items --menu "${1}" "${UI_HEIGHT}" "${UI_WIDTH}" 0 "${@:2}"
}


# Show a message to the user. Only the "OK"-button is shown.
# Returns 0 when the user presses OK, 255 if the user uses escape.
function msgbox() {
	"${DIALOG}" --backtitle "${DIALOG_BACKTITLE}" --msgbox "${1}" "${UI_HEIGHT}" "${UI_WIDTH}"
}


# Ask the user for text input.
# $1 is the promt(text above the textbox explaining what to enter)
# $2 is the optional default(pre-entered) text.
# The return value is 0 on confirming the input,
# 1 when the cancel button was pressed, and
# 255 if escape was pressed.
# Writes entered text to stdout
function inputbox() {
	"${DIALOG}" --backtitle "${DIALOG_BACKTITLE}" --stdout --inputbox "${1}" "${UI_HEIGHT}" "${UI_WIDTH}" "${2}"
}


# Ask a yes-no question to the user.
# $1 is the prompt(The yes-no question) to the user.
# The return value is 0 on yes,
# 1 when no was selected,
# 255 when the escape button was used.
function yesno() {
	"${DIALOG}" --backtitle "${DIALOG_BACKTITLE}" --yesno "${1}" "${UI_HEIGHT}" "${UI_WIDTH}"
}


# return the selected value, represented by the string "true" or "false"
# $1 is the prompt(The yes-no question) to the user.
# The return value is 1 if the escape button was used
# Writes the value true/false to stdout on an answer
function yesno_bool() {
	"${DIALOG}" --stdout --backtitle "${DIALOG_BACKTITLE}" --yesno "${1}" "${UI_HEIGHT}" "${UI_WIDTH}"
	ret="${?}"
	if [ "${ret}" = "0" ]; then
		echo "true"
	elif [ "${ret}" = "1" ]; then
		echo "false"
	else
		return 1
	fi
}


# If REQUIRE_CONFIRM is true, ask for confirmation before running a
# command. If DRYRUN is true, don't run the command, only print the
# command.
#  ** All GUI commands that modify the system should be run **
#  ** through this function! **
# When DRYRUN is set, only prints commands, does not run them.
# If WAIT_AFTER_COMMAND is true, also wait for the user to press enter
# after the command has run.
function ask_confirm_exec() {
	# on dryrun, never ask questions and just output the command that
	# we're asked to run, then exit.
	if [ "${DRYRUN}" = true ]; then
		echo "DRYRUN: ${*}" 1>&2
		return 0
	fi

	# when REQUIRE_CONFIRM is enabled, ask the user for confirmation,
	# and if aborted/user said no then exit.
	if [ "${REQUIRE_CONFIRM}" = true ]; then
		if ! yesno "About to run command:\n\n${*}"; then
			return 1
		fi
	fi

	# run command, capture exit code
	"$@"
	cmd_exit=$?

	# if WAIT_AFTER_COMMAND is enabled, show command and exit code,
	# wait fur user to press enter.
	if [ "${WAIT_AFTER_COMMAND}" = true ]; then
		echo "--------------------------------------------------------------------------------"
		echo "Command: ${*}"
		echo "Exit: ${cmd_exit}"
		echo "Press enter."
		read
	fi
}
