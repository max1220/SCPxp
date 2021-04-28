#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Sets up a gitea instance.
# Use on Debian 10.

# TODO: pre-configure gitea for sqlite and don't require the web setup?

# install git and gnupg2
LOG "Installing git and gnupg2..."
apt-get -y update
apt-get -y upgrade
apt-get -y install git gnupg2

# download and verify gitea
LOG "Downloading gitea and verifying signature..."
wget https://dl.gitea.io/gitea/1.14.1/gitea-1.14.1-linux-amd64.asc
wget -O gitea https://dl.gitea.io/gitea/1.14.1/gitea-1.14.1-linux-amd64
gpg --keyserver keys.openpgp.org --recv 7C9E68152594688862D62AF62D9AE806EC1592E2
gpg --verify gitea-1.14.1-linux-amd64.asc gitea
chmod +x gitea

# add git user
LOG "Adding git user..."
adduser \
	--system \
	--shell /bin/bash \
	--gecos "" \
	--group \
	--disabled-password \
	--home /home/git \
	git

# create directory structure for gitea
LOG "Creating gitea directories..."
mkdir -p /var/lib/gitea/{custom,data,log}
chown -R git:git /var/lib/gitea/
chmod -R 750 /var/lib/gitea/
mkdir -p /etc/gitea
chown root:git /etc/gitea

# temporary for setup
chmod 770 /etc/gitea

# run the gitea server in background *without* locking the config for setup
LOG "running gitea temporary..."
su -c "GITEA_WORK_DIR=/var/lib/gitea/ ./gitea web -c /etc/gitea/app.ini" git > /dev/zero &

# show message regarding configuration
sleep 5
LOG "############################################################"
LOG "Gitea Web setup running on default port(3000)."
LOG "Configure via web interface now."
LOG "Press enter to lock configuration when ready."
LOG "############################################################"

read

# stop gitea
kill -15 $!
wait

# lock configuration
LOG "locking gitea configuration..."
chmod 750 /etc/gitea
chmod 640 /etc/gitea/app.ini

# install gitea to /usr/local/bin
LOG "installing gitea to /usr/local/bin..."
cp gitea /usr/local/bin/gitea

# create systemd service for gitea autostart
LOG "installing systemd service for gitea"
cat << EOF > /etc/systemd/system/gitea.service
[Unit]
Description=Gitea (Git with a cup of tea)
After=syslog.target
After=network.target

[Service]
# Modify these two values and uncomment them if you have
# repos with lots of files and get an HTTP error 500 because
# of that
###
#LimitMEMLOCK=infinity
#LimitNOFILE=65535
RestartSec=2s
Type=simple
User=git
Group=git
WorkingDirectory=/var/lib/gitea/
ExecStart=/usr/local/bin/gitea web --config /etc/gitea/app.ini
Restart=always
Environment=USER=git HOME=/home/git GITEA_WORK_DIR=/var/lib/gitea

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable gitea.service
systemctl restart gitea.service

LOG
LOG
LOG "gitea setup done!"
LOG
#LOG "(press enter to return)"
#read
