#!/bin/bash
set -e

# This script is used to setup a LXC container host.
# Use it on a fresh install of Debian 10 with working internet connection.

# You also want to setup networking for the server.
# See host_network.sh for an example network setup(it's easily configurable)
# Things that (currently) need to be done manually:
# * setup mounts/fstab

function LOG() {
	echo -e "\e[32m$@\e[0m"
}

# install apt-transport-https
apt-get update -y
apt-get upgrade -y
apt-get install -y apt-utils gnupg apt-transport-https ca-certificates

# install sources.list for stable that uses https
LOG "Setting up APT for https..."
cp /etc/apt/sources.list /etc/apt/sources.list.orig
cat << EOF > /etc/apt/sources.list
# use default CDN(fastly) over HTTPS, enable contrib and non-free
deb https://deb.debian.org/debian buster main contrib non-free
deb https://deb.debian.org/debian buster-updates main contrib non-free
deb https://deb.debian.org/debian-security buster/updates main
deb https://deb.debian.org/debian buster-backports main contrib non-free
EOF

# set debconf config value before installing so no promts are needed:

# no tunneling through apt-cacher-ng(this could bypass firewall rules)
echo "apt-cacher-ng apt-cacher-ng/tunnelenable boolean false" | debconf-set-selections

# don't save the current iptable rules(added later)
echo "apt-cacher-ng iptables-persistent/autosave_v4 boolean false" | debconf-set-selections
echo "apt-cacher-ng iptables-persistent/autosave_v6 boolean false" | debconf-set-selections

# install required and nice-to-have packages
LOG "Installing required packages..."
apt-get update -y
#apt-get upgrade -y
apt-get dist-upgrade -y
apt-get install -y --no-install-recommends \
 sudo screen nano less bash-completion man-db dialog lua5.1 dnsutils netcat \
 openssh-server unattended-upgrades \
 systemd-journal-remote iptables-persistent apt-cacher-ng fail2ban certbot \
 lxc dnsmasq-base lxc-templates debootstrap rsync \
 uidmap apparmor apparmor-utils \
 linux-image-amd64/buster-backports



# enable apparmor
echo "GRUB_CMDLINE_LINUX_DEFAULT=\"\$GRUB_CMDLINE_LINUX_DEFAULT apparmor=1 security=apparmor\"" > /etc/default/grub.d/apparmor.cfg

# TODO: cgroupv2 currently not working
#echo "GRUB_CMDLINE_LINUX_DEFAULT=\"\$GRUB_CMDLINE_LINUX_DEFAULT systemd.unified_cgroup_hierarchy=1\"" > /etc/default/grub.d/cgroupv2.cfg
update-grub



# enable LXC bridge
echo "USE_LXC_BRIDGE=\"true\"" > /etc/default/lxc-net
systemctl enable lxc-net
systemctl restart lxc-net


# TODO: cgroupv2 currently not working
#cp /usr/share/lxc/config/debian.common.conf /usr/share/lxc/config/debian.common.conf.orig
#cp /usr/share/lxc/config/common.conf /usr/share/lxc/config/common.conf.orig
#sed -i "s/lxc.cgroup.devices/lxc.cgroup2.devices/g" /usr/share/lxc/config/debian.common.conf
#sed -i "s/lxc.cgroup.devices/lxc.cgroup2.devices/g" /usr/share/lxc/config/common.conf


mkdir -p /data/shared


# setup LXC default container config
cp /etc/lxc/default.conf /etc/lxc/default.conf.orig
cat << EOF > /etc/lxc/default.conf
lxc.apparmor.profile = generated

#lxc.cgroup.devices.allow =
#lxc.cgroup.devices.deny = a
#lxc.init.cmd = /lib/systemd/systemd systemd.unified_cgroup_hierarchy=1

lxc.start.auto = 1

lxc.mount.entry=/data/shared data/shared none bind,optional,create=dir 0 0

EOF



#setup fail2ban
rm /etc/fail2ban/jail.d/defaults-debian.conf
cat << EOF > /etc/fail2ban/10-local.conf
[DEFAULT]
bantime = 1h
ignorself = true
ignoreip = 127.0.0.1/8 ::1
bantime  = 10m
maxretry = 10
findtime = 5m
backend = systemd
logtarget = sysout

[sshd]
enabled = true
EOF



# setup apt-cacher-ng host
cp /etc/apt-cacher-ng/acng.conf /etc/apt-cacher-ng/acng.conf.orig
cat << EOF > /etc/apt-cacher-ng/acng.conf
BindAddress: 10.0.3.1
ConnectProto: v4

CacheDir: /var/cache/apt-cacher-ng
LogDir: /var/log/apt-cacher-ng
SupportDir: /usr/lib/apt-cacher-ng
LocalDirs: acng-doc /usr/share/doc/apt-cacher-ng
ReportPage: acng-report.html
ExThreshold: 7
EOF
systemctl enable apt-cacher-ng.service
systemctl restart apt-cacher-ng.service



# setup SSH server
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.orig
cat << EOF > /etc/ssh/sshd_config
# default values omitted for brevity
LogLevel VERBOSE
MaxAuthTries 5
MaxSessions 25
PermitRootLogin no
PermitEmptyPasswords no
AuthorizedKeysFile .ssh/authorized_keys
PasswordAuthentication no
IgnoreRhosts yes
HostbasedAuthentication no
ChallengeResponseAuthentication no
UsePAM no
X11Forwarding yes
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server -f AUTHPRIV -l INFO
EOF
systemctl enable ssh
systemctl restart ssh



# setup remote logging for containers
cp /etc/systemd/journald.conf /etc/systemd/journald.conf.orig
cat << EOF > /etc/systemd/journald.conf
# See journald.conf(5) for details.
# default values omitted for brevity
[Journal]
Storage=persistent
Compress=yes
SystemMaxUse=2G
EOF

# change from HTTPS to HTTP
mkdir -p /etc/systemd/system/systemd-journal-remote.service.d
cat << EOF > /etc/systemd/system/systemd-journal-remote.service.d/override.conf
[Service]
ExecStart=
ExecStart=/lib/systemd/systemd-journal-remote --listen-http=-3 --output=/var/log/journal/remote/
LockPersonality=yes
LogsDirectory=journal/remote
MemoryDenyWriteExecute=yes
NoNewPrivileges=yes
PrivateDevices=yes
PrivateNetwork=yes
PrivateTmp=yes
ProtectControlGroups=yes
ProtectHome=yes
ProtectKernelModules=yes
ProtectKernelTunables=yes
ProtectSystem=strict
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
RestrictNamespaces=yes
RestrictRealtime=yes
SystemCallArchitectures=native
User=systemd-journal-remote
WatchdogSec=3min

# If there are many split up journal files we need a lot of fds to access them
# all in parallel.
LimitNOFILE=524288
EOF

# only listen on container bridge IP
mkdir -p /etc/systemd/system/systemd-journal-remote.socket.d
cat << EOF > /etc/systemd/system/systemd-journal-remote.socket.d/override.conf
[Socket]
ListenStream=
ListenStream=10.0.3.1:19532
FreeBind=true
EOF
systemctl enable systemd-journal-remote
systemctl restart systemd-journal-remote



LOG
LOG "Host setup ok!"
LOG
#LOG "(press enter to return)"
#read
