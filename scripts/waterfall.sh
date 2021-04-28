#!/bin/bash
set -e

# Downloads and sets up a Waterfall server.
# Use on Debian 10.
# TODO: Install config files


### CONFIGURATION ###

WATERFALL_URL="https://papermc.io/api/v2/projects/waterfall/versions/1.16/builds/412/downloads/waterfall-1.16-412.jar"
WATERFALL_JAR="$(basename "${WATERFALL_URL}")"
WATERFALL_DIR="/home/minecraft/waterfall/"

### END CONFIGURATION ###

apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends openjdk-11-jre-headless

if getent passwd minecraft > /dev/null; then
	echo "Minecraft user already exists!"
else
	echo "Adding minecraft user"
	adduser \
		--system \
		--shell /bin/bash \
		--gecos "" \
		--group \
		--disabled-password \
		--home /home/minecraft \
		minecraft
fi


# create directory for waterfall server
mkdir -p ${WATERFALL_DIR}
cd ${WATERFALL_DIR}

# download waterfall server jar
wget -O ${WATERFALL_JAR} ${WATERFALL_URL}

# create start script
cat << EOF > start.sh
#!/bin/bash
# TODO
java -Xms512M -Xmx512M -jar ${WATERFALL_JAR}
EOF
chmod u+x start.sh

chown -R minecraft:minecraft ${WATERFALL_DIR}

# create systemd service for automatic start
cat << EOF > /etc/systemd/system/waterfall.service
[Unit]
Description=Waterfall Minecraft Server Proxy
After=syslog.target
After=network.target

[Service]
RestartSec=2s
Type=simple
User=minecraft
Group=minecraft
WorkingDirectory=${WATERFALL_DIR}
ExecStart=${WATERFALL_DIR}/start.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable waterfall.service
systemctl restart waterfall.service

echo
echo "	Waterfall installed"
echo
#echo "(press enter to return)"
#read
