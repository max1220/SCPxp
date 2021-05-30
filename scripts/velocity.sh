#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Downloads and sets up a Velocity minecraft proxy server.
# Use on Debian 10.
# TODO: Install config files


### CONFIGURATION ###

VELOCITY_URL="https://versions.velocitypowered.com/download/1.1.5.jar"
VELOCITY_JAR="velocity_$(basename "${VELOCITY_URL}")"
VELOCITY_DIR="/home/minecraft/velocity/"

### END CONFIGURATION ###

apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends openjdk-11-jre-headless

if getent passwd minecraft > /dev/null; then
	LOG "Minecraft user already exists!"
else
	LOG "Adding minecraft user"
	adduser \
		--system \
		--shell /bin/bash \
		--gecos "" \
		--group \
		--disabled-password \
		--home /home/minecraft \
		minecraft
fi


# create directory for velocity server
mkdir -p ${VELOCITY_DIR}
cd ${VELOCITY_DIR}

# download velocity server jar
wget -O ${VELOCITY_JAR} ${VELOCITY_URL}

# create start script
cat << EOF > start.sh
#!/bin/bash
java -Xms1G -Xmx1G -XX:+UseG1GC -XX:G1HeapRegionSize=4M -XX:+UnlockExperimentalVMOptions -XX:+ParallelRefProcEnabled -XX:+AlwaysPreTouch -XX:MaxInlineLevel=15 -jar ${VELOCITY_JAR}
EOF
chmod u+x start.sh

chown -R minecraft:minecraft ${VELOCITY_DIR}

# create systemd service for automatic start
cat << EOF > /etc/systemd/system/velocity.service
[Unit]
Description=Velocity Minecraft Server Proxy
After=syslog.target
After=network.target

[Service]
RestartSec=2s
Type=simple
User=minecraft
Group=minecraft
WorkingDirectory=${VELOCITY_DIR}
ExecStart=${VELOCITY_DIR}/start.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable velocity.service
systemctl restart velocity.service

LOG
LOG "	Velocity installed"
LOG
#echo "(press enter to return)"
#read
