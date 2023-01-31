#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# This file is used to setup a basic build envirioment.
# Installs multiple versions of GCC(including very old), git, wget, etc.
# Use on Debian 10.



# add old releases for older versions of gcc
LOG "Enabling oldstable and oldoldstable sources..."
apt-get update -y
apt-get install -y gnupg2

# retrieve keys for Debian 8 archive
gpg --keyserver keyserver.ubuntu.com --recv-keys 7638D0442B90D010
gpg --export 7638D0442B90D010 | apt-key add -
cat << EOF | tee /etc/apt/sources.list.d/old_releases.list
deb https://deb.debian.org/debian oldstable main
deb https://deb.debian.org/debian oldoldstable main
EOF
apt-get update -y

# install common build utils
LOG "Installing common build tools..."
apt-get install -y build-essential wget git bzip2 libgmp-dev libmpfr-dev libmpc-dev texinfo
update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-8 100 --slave /usr/bin/g++ g++ /usr/bin/g++-8

# install oldest available common GCC version
LOG "Installing oldest GCC..."
apt-get install -y gcc-4.9 g++-4.9
update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-4.9 60 --slave /usr/bin/g++ g++ /usr/bin/g++-4.9


LOG
LOG "Old GCC setup ok!"
LOG "Use update-alternatives to change the gcc and g++ versions"
LOG "# update-alternatives --config gcc"
LOG
#LOG "(press enter to return)"
#read
