#!/bin/bash

# utils/dialog.sh
# Utillity functions for getting interactive user input.
# All invocations of the dialog program should happen here, so that
# replacing this file can enable using another tool than dialog(e.g. yad for X11).

# The functions use these envirioment variables:
#  * UTILS_DIALOG_BACKTITLE

UTILS_DIALOG="dialog" # The path to the dialog executable
UTILS_DIALOG_HEIGHT=20 # Height of the dialog boxes
UTILS_DIALOG_WIDTH=72 # Width of the dialog boxes



# Show a menu for the user to select a single option.
# $1 is the menu title
# All following arguments are interpreted as the list of menu options.
# Every menu option has two arguments, the short hand name and a description.
# The return value is 0 on success,
# 1 when the cancel button was pressed, and
# 255 if escape was pressed.
# Writes the selected menu entry short hand name to stdout
function menu() {
	"${UTILS_DIALOG}" --backtitle "${UTILS_DIALOG_BACKTITLE}" --stdout --menu "${1}" "${UTILS_DIALOG_HEIGHT}" "${UTILS_DIALOG_WIDTH}" 0 "${@:2}"
}

# Same as above, except that only one argument per menu entry is required,
# and no descriptions are shown.
function menu_single() {
	"${UTILS_DIALOG}" --backtitle "${UTILS_DIALOG_BACKTITLE}" --stdout --no-items --menu "${1}" "${UTILS_DIALOG_HEIGHT}" "${UTILS_DIALOG_WIDTH}" 0 "${@:2}"
}


# Show a message to the user. Only the "OK"-button is shown.
# $1 is the message
# Returns 0 when the user presses OK, 255 if the user uses escape.
function msgbox() {
	"${UTILS_DIALOG}" --backtitle "${UTILS_DIALOG_BACKTITLE}" --msgbox "${1}" "${UTILS_DIALOG_HEIGHT}" "${UTILS_DIALOG_WIDTH}"
}


# Ask the user for text input.
# $1 is the promt(text above the textbox explaining what to enter)
# $2 is the optional default(pre-entered) text.
# The return value is 0 on confirming the input,
# 1 when the cancel button was pressed, and
# 255 if escape was pressed.
# Writes entered text to stdout
function inputbox() {
	"${UTILS_DIALOG}" --backtitle "${UTILS_DIALOG_BACKTITLE}" --stdout --inputbox "${1}" "${UTILS_DIALOG_HEIGHT}" "${UTILS_DIALOG_WIDTH}" "${2-}"
}


# Ask a yes-no question to the user.
# $1 is the prompt(The yes-no question) to the user.
# The return value is 0 on yes,
# 1 when no was selected,
# 255 when the escape button was used.
function yesno() {
	"${UTILS_DIALOG}" --backtitle "${UTILS_DIALOG_BACKTITLE}" --yesno "${1}" "${UTILS_DIALOG_HEIGHT}" "${UTILS_DIALOG_WIDTH}"
}

# return the selected value, represented by the string "true" or "false"
# $1 is the prompt(The yes-no question) to the user.
# The return value is 1 if the user aborted, 0 otherwise.
# Writes the value true/false to stdout on an answer
function yesno_bool() {
	"${UTILS_DIALOG}" --stdout --backtitle "${UTILS_DIALOG_BACKTITLE}" --yesno "${1}" "${UTILS_DIALOG_HEIGHT}" "${UTILS_DIALOG_WIDTH}"
	ret="${?}"
	if [ "${ret}" = "0" ]; then
		echo "true"
	elif [ "${ret}" = "1" ]; then
		echo "false"
	else
		return 1
	fi
}


# Ask the user to provide a file
# $1 is the prompt to give to the user
# $2 is the filepath to start looking for files
function fselect() {
	msgbox "${1}"
	"${UTILS_DIALOG}" --backtitle "${UTILS_DIALOG_BACKTITLE}" --fselect "${2}" "${UTILS_DIALOG_HEIGHT}" "${UTILS_DIALOG_WIDTH}"
}

# Ask the user to provide a directory
# $1 is the prompt to give to the user
# $2 is the filepath to start looking for directories
function dselect() {
	msgbox "${2}"
	"${UTILS_DIALOG}" --backtitle "${UTILS_DIALOG_BACKTITLE}" --dselect "${2}" "${UTILS_DIALOG_HEIGHT}" "${UTILS_DIALOG_WIDTH}"
}
