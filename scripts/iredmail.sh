#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Downloads and then runs the iRedMail scripts for setting up a mailserver.
# Use on Debian 10.

### CONFIGURATION ###

# Version of iRedMail to use
IREDMAIL_VERSION="1.4.0"

# URL to download iRedMail from
IREDMAIL_URL="https://github.com/iredmail/iRedMail/archive/${IREDMAIL_VERSION}.tar.gz"

### END CONFIGURATION ###

sudo apt-get install -y --no-install-recommends gnupg2

cd /root

# download iredmail
filename="iRedMail-$(basename ${IREDMAIL_URL})"
wget -O ${filename} ${IREDMAIL_URL}

# extract
tar -xvf ${filename}

# pre-configure some services to not require seperate namespaces:
LOG "Pre-configuring services for container..."

mkdir -p /etc/systemd/system/dovecot.service.d
cat << EOF > /etc/systemd/system/dovecot.service.d/override.conf
[Service]
PrivateTmp=false
ProtectSystem=false
NoNewPrivileges=true
PrivateDevices=false
EOF

mkdir -p /etc/systemd/system/mariadb.service.d
cat << EOF > /etc/systemd/system/mariadb.service.d/override.conf
[Service]
PrivateTmp=false
ProtectSystem=false
NoNewPrivileges=true
PrivateDevices=false
EOF

mkdir -p /etc/systemd/system/memcached.service.d
cat << EOF > /etc/systemd/system/memcached.service.d/override.conf
[Service]
PrivateTmp=false
ProtectSystem=false
NoNewPrivileges=true
PrivateDevices=false
EOF

mkdir -p /etc/systemd/system/memcached.service.d
cat << EOF > /etc/systemd/system/memcached.service.d/override.conf
[Service]
PrivateTmp=false
ProtectSystem=false
NoNewPrivileges=true
PrivateDevices=false
EOF

mkdir -p /etc/systemd/system/phpsessionclean.service.d
cat << EOF > /etc/systemd/system/phpsessionclean.service.d/override.conf
[Service]
PrivateTmp=false
ProtectSystem=false
NoNewPrivileges=true
PrivateDevices=false
EOF


# run setup script
cd iRedMail-${IREDMAIL_VERSION}
bash iRedMail.sh

LOG
LOG "Container setup ok. "
LOG
