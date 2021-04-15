#!/bin/bash
# This file is used to setup a basic build container.
# Installs multiple versions of GCC, git, wget, etc.
# Use in a Debian 10 container.

# add old releases for older versions of gcc
cat << EOF | sudo tee /etc/apt/sources.list.d/old_releases.list
deb https://deb.debian.org/debian oldstable main
deb https://deb.debian.org/debian oldoldstable main
EOF
sudo apt-get update -y

# install common build utils
sudo apt-get install -y build-essential wget git bzip2 libgmp-dev libmpfr-dev libmpc-dev texinfo
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-8 100 --slave /usr/bin/g++ g++ /usr/bin/g++-8

# install oldest available common GCC version
sudo apt-get install -y gcc-4.9 g++-4.9
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-4.9 60 --slave /usr/bin/g++ g++ /usr/bin/g++-4.9

# Use update-alternatives to change the gcc and g++ symlinks
# sudo update-alternatives --config gcc



echo
echo
echo "Build container setup ok!"
echo "Use update-alternatives to change the gcc and g++ versions"
echo "# update-alternatives --config gcc"
echo
#echo "(press enter to return)"
#read
