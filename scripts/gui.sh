#!/bin/bash
set -e

# Setup a basic XFCE4 GUI container using Xpra
# Use in a Debian 10 container.

### CONFIGURATION ###

# the user that runs the GUI applications

USERNAME=max

XPRA_LISTEN_PORT=10000

### END CONFIGURATION ###

# setup apt and install required packages
echo "Installing required software..."
apt-get update -y
apt-get install -y --no-install-recommends wget gnupg2 apt-transport-https ca-certificates
wget -q https://xpra.org/gpg.asc -O- | sudo apt-key add -
cat << EOF > /etc/apt/sources.list.d/xrpa.list
deb https://xpra.org/beta/ buster main
EOF
apt-get update -y
apt-get install -y --no-install-recommends \
 xpra git xdg-utils pulseaudio pavucontrol mesa-utils xauth uglifyjs \
 gtk2-engines-murrine gpicview greybird-gtk-theme \
 lxde-core mousepad lxterminal lxtask lxappearance \
 firefox-esr webext-ublock-origin-firefox


# install systemd service
echo "Installing systemd unit for xprasession..."
cat << EOF > /etc/systemd/system/xprasession@.service
[Unit]
Description=Xpra Desktop

[Service]
Type=simple
User=%i
Environment=$USERNAME=:100
WorkingDirectory=/home/$USERNAME
ExecStart=/usr/bin/xpra --no-daemon start-desktop \${%i} --start-child="startlxde" --exit-with-children --html=/usr/share/www/xpra --pulseaudio=on --speaker=on --bind-tcp=0.0.0.0:$XPRA_LISTEN_PORT
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable xprasession@$USERNAME
systemctl start xprasession@$USERNAME

#install html5 client
echo "Installing HTML5 client..."
cd /root
git clone https://github.com/Xpra-org/xpra-html5
cd xpra-html5
python3 ./setup.py install /usr/share/www/xpra

# desktop setup
echo "Desktop setup..."
"include \"/home/max/.gtkrc-2.0.mine\"" > /home/$USERNAME/.gtkrc-2.0
echo "gtk-theme-name=\"Greybird\"" > /home/$USERNAME/.gtkrc-2.0.mine
echo "gtk-font-name=\"Sans 11\"" >> /home/$USERNAME/.gtkrc-2.0.mine
chown $USERNAME:$USERNAME /home/$USERNAME/.gtkrc-2.0 /home/$USERNAME/.gtkrc-2.0.mine

cat << EOF > /home/$USERNAME/Desktop/lxterminal.desktop
[Desktop Entry]
Type=Link
Name=LXTerminal
Icon=lxterminal
URL=/usr/share/applications/lxterminal.desktop
EOF

cat << EOF > /home/$USERNAME/Desktop/firefox-esr.desktop
[Desktop Entry]
Type=Link
Name=Firefox ESR
Icon=firefox-esr
URL=/usr/share/applications/firefox-esr.desktop
EOF

echo
echo
echo "Container setup ok!"
echo
#echo "(press enter to return)"
#read
