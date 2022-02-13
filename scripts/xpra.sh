#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Setup a basic Xpra session
# Use on Debian 11.

### CONFIGURATION ###

# the user that runs the GUI applications

USERNAME=max

XPRA_LISTEN_PORT=10000

### END CONFIGURATION ###

# setup apt and install required packages
LOG "Installing required software..."
apt-get update -y
apt-get install -y --no-install-recommends wget gnupg2 apt-transport-https ca-certificates
wget -q https://xpra.org/gpg.asc -O- | apt-key add -
cat << EOF > /etc/apt/sources.list.d/xrpa.list
deb https://xpra.org/beta/ bullseye main
EOF
apt-get update -y
apt-get install -y --no-install-recommends \
 man-db git x11-utils xdg-utils xdg-user-dirs mesa-utils xauth uglifyjs xpra \
 gstreamer1.0-tools gstreamer1.0-pulseaudio gstreamer1.0-plugins-base \
 gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly \
 python3-pyinotify python3-netifaces python3-xdg python3-paramiko python3-gst-1.0 \
 python3-setproctitle pulseaudio pavucontrol \
 lxde-core lxsession-default-apps gtk2-engines mousepad xarchiver p7zip-full lxterminal \
 lxtask lxappearance obconf gpicview dbus-x11 lxpolkit lxsession-edit \
 firefox-esr webext-ublock-origin-firefox


# install systemd service
LOG "Configuring Xpra session for user ${USERNAME}..."
cat << EOF > /etc/systemd/system/xprasession@.service
[Unit]
Description=Xpra Desktop

[Service]
Type=simple
User=%i
Environment=${USERNAME}=:100
WorkingDirectory=/home/${USERNAME}
#ExecStart=/usr/bin/xpra --no-daemon start-desktop \${%i} --start-child="lxsession" --exit-with-children --html=/usr/share/www/xpra --open-files=on --pulseaudio=on --speaker=on --bind-tcp=0.0.0.0:${XPRA_LISTEN_PORT}
ExecStart=/usr/bin/xpra --no-daemon start \${%i} --html=/usr/share/www/xpra --mdns=no --webcam=no --speaker=on --open-files=off --bind-tcp=0.0.0.0:${XPRA_LISTEN_PORT}
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# create symlink for xpra application menu
ln -s /etc/xdg/menus/lxde-applications.menu /etc/xdg/menus/debian-menu.menu

systemctl daemon-reload
systemctl enable xprasession@${USERNAME}
systemctl start xprasession@${USERNAME}

#install html5 client
LOG "Installing HTML5 client..."
git clone https://github.com/Xpra-org/xpra-html5
cd xpra-html5
python3 ./setup.py install /usr/share/www/xpra

# set default config
cat << EOF > /usr/share/www/xpra/default-settings.txt
port = 10000
keyboard_layout = de
sharing = yes
autohide = yes
EOF

LOG
LOG "Xpra setup ok!"
LOG
#echo "(press enter to return)"
#read
