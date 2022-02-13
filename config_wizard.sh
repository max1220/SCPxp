#!/bin/bash
# This script should interactively set the required config variables
# like the host config format.
# It should optionally write them out to a file in the same format!
# Work-in-progress!


set -eu
DIALOG="dialog"
CONFIG_FILE="$(mktemp config_wizard_config_XXXXXX.sh)"


WELCOME_MESSAGE="Welcome to the Host configuration generator \n\
\n\
This Wizard-syle setup will help you generate a host configuration, to be used \
with the scripts in the host/ directory.\n\
\n\
Every step will be explained along the way, and questions are sorted into
sections with a small introduction to each section\n\
\n\
If you abort a question, a commented out section with the default values for
that section will be included.\n\
\n\
Press escape now to abort generating a configuration.
"

LIBVIRTD_MESSAGE="Enable setup for libvirtd?"
USERNAME_MESSAGE="Enter a username:"




function msgbox() {
	"${DIALOG}" --msgbox "${1}" 0 0
}
function inputbox() {
	"${DIALOG}" --stdout --inputbox "${1}" 0 0 "${2}"
}
function yesno() {
	"${DIALOG}" --yesno "${1}" 0 0
}

function write_config() {
    echo -e "${1}" >> "${CONFIG_FILE}"
}


# show the welcome/help message
if ! msgbox "${WELCOME_MESSAGE}"; then
    return 1
fi

# first section, user setup

write_config "\n# perform setup needed for cgroup v2(currently broken)"
write_config "ENABLE_CGROUPV2=false"

write_config "\n# enable setup for unprivileged containers(currently broken)"
write_config "ENABLE_UNPRIVILEGED=false"

write_config "\n# setup this user for unprivileged containers/libvirt(needs to exist already!)"
if uname="$(inputbox "${USERNAME_MESSAGE}" "${USER}")"; then
    write_config "USERNAME=${uname}"
else
    set +u
    write_config "#USERNAME=${USERNAME}"
    set -u
fi

write_config "\n# enable setup for libvirtd"
if yesno "${LIBVIRTD_MESSAGE}"; then
    msgbox "yes to libvirtd"
    write_config "ENABLE_LIBVIRT=true"
else
    ret="$?"
    if [ "${ret}" = "1" ]; then
        msgbox "no to libvirtd"
        write_config "ENABLE_LIBVIRT=false"
    else
        msgbox "unspecified libvirtd"
        write_config "#ENABLE_LIBVIRT=${ENABLE_LIBVIRT}"
    fi
fi
