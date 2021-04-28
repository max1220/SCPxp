#!/bin/bash
set -e

# Downloads and then runs the iRedMail scripts for setting up a mailserver.
# Use on Debian 10.

### CONFIGURATION ###

# Version of iRedMail to use
IREDMAIL_VERSION="1.4.0"

# URL to download iRedMail from
IREDMAIL_URL="https://github.com/iredmail/iRedMail/archive/${IREDMAIL_VERSION}.tar.gz"

### END CONFIGURATION ###

# download iredmail
filename="iRedMail-$(basename ${IREDMAIL_URL})"
wget -O ${filename} ${IREDMAIL_URL}

# extract
tar -xvf ${filename}

# run setup script
cd iRedMail-${IREDMAIL_VERSION}
bash iRedMail.sh
