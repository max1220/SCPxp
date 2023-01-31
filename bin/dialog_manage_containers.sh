#!/bin/bash
set -euo pipefail
# This script show a graphical menu for managing LXC containers.
# It can be run as root to manage "priviledged" containers,
# and can be run as a regular user to manage "unprivileged" containers.
# Menu options are provided to start, stop, create, edit, backup,
# destroy a container etc.

# cd to base directory for this script
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/..

DEFAULT_LXC_TEMPLATE="download"
DEFAULT_LXC_TEMPLATE_ARGS="-d debian -r bullseye -a amd64"
DEFAULT_POST_INSTALL_SCRIPT="scripts/onboard.sh"
USERNAME="${USER}"
SCRIPTS_DIR="scripts"
BACKUPS_DIR="backups"

# configure required utils
UTILS_CONFIRM_ENABLE="true"
UTILS_CONFIRM_DRYRUN="false"
UTILS_CONFIRM_WAIT="true"
UTILS_DIALOG_BACKTITLE="Manage containers as $USER on $HOSTNAME"

# Load required utils
. ./utils/log.sh
. ./utils/lxc.sh
. ./utils/port_forward.sh
. ./utils/dialog/dialog.sh
. ./utils/dialog/confirm_dialog.sh
. ./utils/dialog/menu_create_container.sh
. ./utils/dialog/menu_manage_containers.sh
. ./utils/dialog/menu_port_forward.sh
. ./utils/dialog/menu_running_container.sh
. ./utils/dialog/menu_stopped_container.sh

# launch main menu
while menu_manage_containers; do true; done
