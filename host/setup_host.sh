#!/bin/bash
set -eu
# This script is used to setup a LXC container host.
# Use it on a fresh install of Debian 10 with working internet connection.
# You also want to setup networking for the server.
# See host_network.sh for an example network setup(it's easily configurable)
# Things that (currently) need to be done manually:
# * setup mounts/fstab
#TODO: Setup logalerts

# Load required utils
. ./utils/log.sh


if [ -z "${1}" ]; then
	>&2 echo "Error: Need to supply configuration file as first parameter"
	exit 1
fi
LOG "Using base configuration file: ${1}"
. "${1}"



# install apt-transport-https
LOG "Installing apt-transport-https..."
apt-get update -y
apt-get install -y apt-utils gnupg2 apt-transport-https ca-certificates

LOG "Setting up temporary sources.list entries..."
# use the debian https mirror for now. (will be disabled once apt-cacher-ng is installed)
cat << EOF > /etc/apt/sources.list.d/01_debian_https.list
deb https://deb.debian.org/debian bullseye main contrib non-free
deb https://deb.debian.org/debian bullseye-updates main contrib non-free
deb https://deb.debian.org/debian bullseye-backports main contrib non-free
deb http://security.debian.org/debian-security bullseye-security main contrib non-free

EOF

# will be enabled once apt-cacher-ng is setup
cat << EOF > /etc/apt/sources.list.d/00_debian_cached.list.disabled
deb http://10.0.3.1:3142/deb.debian.org/debian bullseye main contrib non-free
deb http://10.0.3.1:3142/deb.debian.org/debian bullseye-updates main contrib non-free
deb http://10.0.3.1:3142/deb.debian.org/debian bullseye-backports main contrib non-free
deb http://10.0.3.1:3142/security.debian.org/debian-security bullseye-security main contrib non-free

EOF

# disable current(reduntant) sources.list
mv /etc/apt/sources.list /etc/apt/sources.list.disabled

# set debconf config value before installing so no promts are needed:

LOG "Preconfiguring debconf..."
# no tunneling through apt-cacher-ng(this could bypass firewall rules)
echo "apt-cacher-ng apt-cacher-ng/tunnelenable boolean false" | debconf-set-selections

# don't save the current iptable rules(added later)
echo "apt-cacher-ng iptables-persistent/autosave_v4 boolean false" | debconf-set-selections
echo "apt-cacher-ng iptables-persistent/autosave_v6 boolean false" | debconf-set-selections

# install required and nice-to-have packages
LOG "Ugrading and installing packages..."
apt-get update -y
apt-get dist-upgrade -y
apt-get install -y --no-install-recommends \
 sudo screen nano less bash-completion man-db dialog lua5.1 dnsutils \
 openssh-server unattended-upgrades \
 systemd-journal-remote iptables-persistent apt-cacher-ng fail2ban certbot \
 lxc dnsmasq-base lxc-templates debootstrap rsync \
 uidmap apparmor apparmor-utils dbus bridge-utils

# Also install a more recent kernel, systemd and btrfs-progs from backports
# apt-get install -y -t bullseye-backports systemd linux-image-amd64 btrfs-progs

if [ "${ENABLE_LIBVIRT}" = true ]; then
	# Also setup libvirt for QEMU based VMs
	apt-get install -y --no-install-recommends qemu-system-x86 qemu-kvm \
	 libvirt-daemon-system libvirt-clients netcat-openbsd qemu-utils \
	 virtinst di-netboot-assistant
	LOG "Configuring libvirtd..."

	# add user to libvirt group(allow using system libvirt)
	adduser "${USERNAME}" libvirt

	# modify the default libvirtd network to match the configuration
	LIBVIRT_BR_IP_ADDR="192.168.123.1"

	# generate network parameters based on the LIBVIRT_BR_IP_ADDR(use a /24 network)
	MASKED="$(echo "${LIBVIRT_BR_IP_ADDR}" | cut -d "." -f 1-3)"
	NETWORK="$(echo "${LIBVIRT_BR_IP_ADDR}" | cut -d "." -f 4)"
	DHCP_START="${MASKED}.$(( NETWORK+1 ))"
	DHCP_END="${MASKED}.254"

	# generate new default configuration
	# TODO: It would be nicer to just edit the config in-place using
	#  net-update, but that doesn't work, see below:
	cat << EOF > /tmp/default.xml
<network>
	<name>default</name>
	<forward mode='nat'>
		<nat>
			<port start='1024' end='65535'/>
		</nat>
	</forward>
	<bridge name='virbr0' stp='on' delay='0'/>
	<ip address='${LIBVIRT_BR_IP_ADDR}' netmask='255.255.255.0'>
		<dhcp>
			<range start='${DHCP_START}' end='${DHCP_END}'/>
		</dhcp>
	</ip>
</network>
EOF

	# change the default network configuration
	if virsh -c "${LIBVIRT_CONNECTION}" net-info default; then
		# delete existing default network, if any
		virsh -c "${LIBVIRT_CONNECTION}" net-destroy default || true
		virsh -c "${LIBVIRT_CONNECTION}" net-undefine default
	fi
	virsh -c "${LIBVIRT_CONNECTION}" net-define /tmp/default.xml
	rm /tmp/default.xml

	# TODO: This doesn't work for some reason :O
	#virsh -c "${LIBVIRT_CONNECTION}" net-update default modify ip \
	# "<ip address='${LIBVIRT_BR_IP_ADDR}' netmask='255.255.255.0'><dhcp><range start='${DHCP_START}' end='${DHCP_END}'/></dhcp></ip>" \
	# --live --config
	# This doesn't work either:
	#virsh -c "${LIBVIRT_CONNECTION}" net-update default modify ip \
	# "<ip address='${LIBVIRT_BR_IP_ADDR}' netmask='255.255.255.0' />" \
	# --live --config

	# auto-start libvirt network
	virsh --connect=qemu:///system net-autostart default

	# also start the network immediatly
	virsh --connect=qemu:///system net-start default
fi

LOG "Updating kernel cmdline..."

# set grub timeout to 2s(faster boots)
echo "GRUB_TIMEOUT=2" > /etc/default/grub.d/timeout.cfg

# enable apparmor
echo "GRUB_CMDLINE_LINUX_DEFAULT=\"\$GRUB_CMDLINE_LINUX_DEFAULT apparmor=1 security=apparmor\"" > /etc/default/grub.d/apparmor.cfg

if [ "${ENABLE_CGROUPV2}" = true ]; then
	# enable cgroupv2 via kernel parameter
	echo "GRUB_CMDLINE_LINUX_DEFAULT=\"\$GRUB_CMDLINE_LINUX_DEFAULT systemd.unified_cgroup_hierarchy=1\"" > /etc/default/grub.d/cgroupv2.cfg
else
	# explicitly disable for newer kernels
	echo "GRUB_CMDLINE_LINUX_DEFAULT=\"\$GRUB_CMDLINE_LINUX_DEFAULT systemd.unified_cgroup_hierarchy=0\"" > /etc/default/grub.d/cgroupv2.cfg
fi
update-grub


# enable LXC bridge
LOG "Enabling lxc-net..."
echo "USE_LXC_BRIDGE=\"true\"" > /etc/default/lxc-net
systemctl enable lxc-net
systemctl restart lxc-net


# create directory for shared(public) data
mkdir -p /data/shared

# allow default lxc-mapped user to accesss shared directory
chown 1001000:1001000 /data/shared/


# allow root to map itself to UID's >1M
LOG "Setting up subuid/subgid for root..."
echo "root:1000000:65536" >> /etc/subuid
echo "root:1000000:65536" >> /etc/subgid


# allow sudo without password(this user has password login disabled)
#echo "${USERNAME} ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/user_nopasswd
#chmod 0440 /etc/sudoers.d/user_nopasswd


if [ "${ENABLE_UNPRIVILEGED}" = true ]; then
	LOG "Setting up subuid/subgid for ${USERNAME}..."
	echo "${USERNAME}:2000000:65536" >> /etc/subuid
	echo "${USERNAME}:2000000:65536" >> /etc/subgid

	loginctl enable-linger "${USERNAME}"

	echo "${USERNAME} veth lxcbr0 50" >> /etc/lxc/lxc-usernet

	LOG "Setting up to enable unprivileged_userns_clone..."
	cat << EOF > /etc/sysctl.d/30-userns.conf
kernel.unprivileged_userns_clone=1
EOF
	sysctl -p

	LOG "Setting up default.conf for unprivileged user ${USERNAME}"
	mkdir -p "/home/${USERNAME}/.config/lxc"
	cat << EOF > "/home/${USERNAME}/.config/lxc/default.conf"
lxc.apparmor.profile = unconfined
lxc.idmap = u 0 2000000 65536
lxc.idmap = g 0 2000000 65536
lxc.mount.auto = proc:mixed sys:ro cgroup:mixed

# Network configuration
lxc.net.0.type = veth
lxc.net.0.link = lxcbr0
lxc.net.0.flags = up

EOF
	chown -R "${USERNAME}:${USERNAME}" "/home/${USERNAME}/.config"
fi

# setup LXC default container config
LOG "Setting up LXC default.conf ..."
cp /etc/lxc/default.conf /etc/lxc/default.conf.orig
cat << EOF > /etc/lxc/default.conf
lxc.apparmor.profile = generated

lxc.start.auto = 1
lxc.cap.keep = chown
lxc.cap.keep = dac_override
lxc.cap.keep = dac_read_search
lxc.cap.keep = fowner
lxc.cap.keep = kill
lxc.cap.keep = mknod
lxc.cap.keep = net_bind_service
lxc.cap.keep = sys_nice
lxc.cap.keep = setgid
lxc.cap.keep = setuid
lxc.cap.keep = sys_tty_config

lxc.idmap = u 0 1000000 65536
lxc.idmap = g 0 1000000 65536

lxc.mount.auto = proc:mixed sys:ro cgroup:mixed

# Network configuration
lxc.net.0.type = veth
lxc.net.0.link = lxcbr0
lxc.net.0.flags = up

# access to shared directory
lxc.mount.entry=/data/shared data/shared none bind,optional,create=dir 0 0

EOF

# TODO: cgroupv2 currently not working
if [ "${ENABLE_CGROUPV2}" = true ]; then
	cat << EOF >> /etc/lxc/default.conf
# disable cgroup v1
lxc.cgroup.devices.allow =
lxc.cgroup.devices.deny = a
# configure containers systemd to use cgroup v2
lxc.init.cmd = /lib/systemd/systemd systemd.unified_cgroup_hierarchy=1

EOF
fi




#setup fail2ban
LOG "Setting up fail2ban for SSH..."
rm -f /etc/fail2ban/jail.d/defaults-debian.conf
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
LOG "Setting up apt-cacher-ng..."
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

# switch apt to to local apt-cacher-ng
LOG "Switching APT to apt-cacher-ng..."
mv /etc/apt/sources.list.d/00_debian_cached.list.disabled /etc/apt/sources.list.d/00_debian_cached.list
mv /etc/apt/sources.list.d/01_debian_https.list /etc/apt/sources.list.d/01_debian_https.list.disabled
apt-get update -y


# setup SSH server
LOG "Configuring SSH server for key-based authentication..."
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
UsePAM yes
X11Forwarding yes
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server -f AUTHPRIV -l INFO
EOF
systemctl enable ssh
systemctl restart ssh



# setup remote logging for containers
LOG "Configuring journald..."
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
LOG "Configuring systemd-journal-remote to recive logs over HTTP on 10.0.3.1"
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


# make to finish iptables-restore before lxc-net starts
mkdir -p /etc/systemd/system/netfilter-persistent.service.d
cat << EOF > /etc/systemd/system/netfilter-persistent.service.d/override.conf
[Unit]
Before=network-pre.target shutdown.target lxc-net.service
EOF


# make sure apt-cacher-ng starts after the LXC network bridge interface is available
mkdir -p /etc/systemd/system/apt-cacher-ng.service.d
cat << EOF > /etc/systemd/system/apt-cacher-ng.service.d/override.conf
[Unit]
After=lxc-net.service
EOF


LOG
LOG "Host setup ok!"
LOG "Rebooting recommended!"
LOG
