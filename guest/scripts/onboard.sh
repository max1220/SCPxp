#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# This script is my default container onboarding scirpt.
# It sets up a Debian 10 system nicely:
#  * configure apt for contrib and non-free, enable apt-transport-https
#  * installs some common packages
#  * sets up sudo so that the default user needs no password
#  * configures systemd-journal-remote to send journald logs to host
# Below are a few user-configurable settings for this script:

#TODO: Setup logalerts

### CONFIGURATION ###

# a new non-root user will be created, this is its username:
USERNAME=max

# the new user will have this list of keys in its ~/.ssh/authorized_keys
SSH_PUB="
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDKvYFrAT997455zvBcOgudHwp2ZvlNKq278ZsTDR+MQFH0xwKVywzQMnOH1MtzBocwO44VmDKm6YM92KXuMcxQ/8QeTzp+dj+PuOfPgCYXNNqCsPw75ruTFxADBVmtVUCA+SSlmj85RMqgcRVXKp55it3EukbvQJVeMoAhUwiLpi+lVQwFfB9Poh9gFACK/J6yZ7g2aUzDwOog/YhQwpuiD1Z2C9jezaBDm+Z/sDMWN0HKoCfLcOz95kgGTVU1C+KKQdGFO9KRc1t7bA5VUyFwWRf97JDtAdCq/QCQLZc1ZoFHYDsKv6THuLJR0D4paKqqTLFCyKZtv7qVpsNJwOBANA8W+2R3/eoWVbTJS2eNkNM3nsxoyJAwBsz4DmsJghkapHrGh9GElMqjlDVpfFNX+B3un6LiqvUDJxcUCvaBLdygxchwQ3oeDSpNGADw6L/PsRB+k4UN0uUhP1YAnyv7RtaK9X20V/EsPj1KlG+2yNsCsmtXyI+Kv/z3Y/TuXok= max@debian-fx
"

# should this system use the apt-cacher-ng on the host?
ENABEL_APT_CACHE=true

# the Domain as part of the FQDN
DOMAINNAME="example.com"

### END CONFIGURATION ###


# wait 30s for network to become available for apt updates
for i in {1..30}; do
	if timeout 1 bash -c ": >/dev/tcp/debian.org/80" 2> /dev/zero; then
		LOG "Internet connection established!"
		exec 3<&-
		break
	else
		LOG "Waiting for network connection $i/30"
	fi
	sleep 1
done
# continue even if (seemingly) no connection was established

### SYSTEM SETUP ###




LOG "Configuring APT..."
cat << EOF > /etc/apt/sources.list.d/debian_cached.list.disabled
deb http://10.0.3.1:3142/deb.debian.org/debian bullseye main contrib non-free
deb http://10.0.3.1:3142/deb.debian.org/debian bullseye-updates main contrib non-free
deb http://10.0.3.1:3142/deb.debian.org/debian bullseye-backports main contrib non-free
deb http://10.0.3.1:3142/security.debian.org/debian-security bullseye-security main contrib non-free

EOF
cat << EOF > /etc/apt/sources.list.d/debian_https.list.disabled
deb https://deb.debian.org/debian bullseye main contrib non-free
deb https://deb.debian.org/debian bullseye-updates main contrib non-free
deb https://deb.debian.org/debian bullseye-backports main contrib non-free
deb http://security.debian.org/debian-security bullseye-security main contrib non-free
EOF
if [ "${ENABEL_APT_CACHE}" = true ]; then
	mv /etc/apt/sources.list.d/debian_cached.list.disabled /etc/apt/sources.list.d/debian_cached.list
	# remove non-cached sources.list
	rm /etc/apt/sources.list
	apt-get update -y
else
	cat << EOF > /etc/apt/sources.list
# temporary sources.list, to install apt-transport-https
deb http://deb.debian.org/debian bullseye main
deb http://deb.debian.org/debian bullseye-updates main
deb http://security.debian.org/debian-security bullseye-security main contrib non-free
EOF
	apt-get update -y
	LOG "Installing apt-transport-https..."
	apt-get install -y --no-install-recommends apt-transport-https ca-certificates

	# remove temporary sources.list
	rm /etc/apt/sources.list

	# enable https repositories
	mv /etc/apt/sources.list.d/debian_https.list.disabled /etc/apt/sources.list.d/debian_https.list
	apt-get update -y
fi

# upgrade outdated packages
apt-get upgrade -y

LOG "Installing base packages..."
apt-get install -y --no-install-recommends \
apt-utils iputils-ping ca-certificates wget screen less bash-completion sudo \
nano openssh-server systemd-journal-remote unattended-upgrades gnupg2

# setup hostname
hostname="$(hostname --short)"
LOG "Setting up hostname: ${hostname}.${DOMAINNAME}..."
# TODO: requires dbus?!: hostnamectl set-hostname $hostname.$domainname
echo "${hostname}.${DOMAINNAME}" > /etc/hostname
echo "" >> /etc/hosts
echo "# FQDN:  ${hostname}.${DOMAINNAME}" >> /etc/hosts
echo "127.0.1.1 ${hostname}.${DOMAINNAME} ${hostname}" >> /etc/hosts

# configure remote systemd journal logging
LOG "Setting up remote logging..."
cat << EOF > /etc/systemd/journal-upload.conf
[Upload]
 URL=http://10.0.3.1:19532
EOF

# we need to disable some of the isolation features as they are blocked
# because the LXC config disables both CAP_SYS_ADMIN and some bind mounts
LOG "Configuring systemd-journal-upload for unprivileged container"
mkdir -p /etc/systemd/system/systemd-journal-upload.service.d
cat << EOF > /etc/systemd/system/systemd-journal-upload.service.d/override.conf
[Service]
DynamicUser=no
PrivateDevices=no
StateDirectory=
User=

EOF



systemctl enable systemd-journal-upload.service
systemctl start systemd-journal-upload.service

# configure SSH server
cat << EOF > /etc/ssh/sshd_config
# default values omitted for brevity
MaxAuthTries 5
MaxSessions 25
PermitRootLogin no
AuthorizedKeysFile .ssh/authorized_keys
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM no
X11Forwarding yes
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
EOF
systemctl restart ssh


### USER SETUP ###

LOG "Adding user ${USERNAME}..."
adduser "${USERNAME}" --disabled-password --gecos ""
adduser "${USERNAME}" sudo

# allow sudo without password(this user has password login disabled)
echo "${USERNAME} ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/user_nopasswd
chmod 0440 /etc/sudoers.d/user_nopasswd

# copy host SSH public key to user authorized_keys
LOG "Copying host SSH key..."
mkdir "/home/${USERNAME}/.ssh/"
echo "${SSH_PUB}" > "/home/${USERNAME}/.ssh/authorized_keys"
chown -R "${USERNAME}:${USERNAME}" "/home/${USERNAME}/.ssh"
chmod 0400 "/home/${USERNAME}/.ssh/authorized_keys"

LOG
LOG "Try logging in using:"
LOG
LOG "  ssh ${USERNAME}@${HOSTNAME}"
LOG
IP=$(ip route get 1 | head -1 | cut -d " " -f7)
LOG "  ssh ${USERNAME}@${IP}"
LOG
#LOG "  ssh -J $DOMAINNAME $USERNAME@$IP"
#LOG
LOG "(Restarting the container might be needed to apply new hostname)"
#LOG "(press enter to return)"
#read
