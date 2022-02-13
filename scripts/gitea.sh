#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Sets up a gitea instance.
# Use on Debian 10.

# TODO: pre-configure gitea for sqlite and don't require the web setup?

wget -O /etc/apt/trusted.gpg.d/morph027-gitea.asc "https://packaging.gitlab.io/gitea/gpg.key"
echo "deb [arch=amd64] https://packaging.gitlab.io/gitea gitea main" > /etc/apt/sources.list.d/gitea.list

# install gitea
LOG "Installing gitea..."
apt-get -y update
apt-get -y upgrade
apt-get -y install gitea


LOG
LOG
LOG "gitea setup done."
LOG "Configure via the web interface now!"
LOG
#LOG "(press enter to return)"
#read
