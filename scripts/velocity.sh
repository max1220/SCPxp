#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Downloads and sets up a Velocity minecraft proxy server.
# Use on Debian 10.
# TODO: Install config files


### CONFIGURATION ###

# Which version of velocity to download?
VELOCITY_VERSION="3.1.1"

### END CONFIGURATION ###

apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends openjdk-11-jre-headless jq

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
pushd ${VELOCITY_DIR}

# I really wish they kept a simple latest-version download API.
# Now we need JSON parsing and 2 extra HTTP requests :/
VELOCITY_LATEST_BUILD="$(wget -O - "https://papermc.io/api/v2/projects/velocity/versions/${VELOCITY_VERSION}" | jq -r ".builds[-1]")"
VELOCITY_DOWNLOAD_NAME="$(wget -O - "https://papermc.io/api/v2/projects/velocity/versions/${VELOCITY_VERSION}/builds/${VELOCITY_LATEST_BUILD}" | jq -r ".downloads.application.name")"
VELOCITY_DOWNLOAD_URL="https://papermc.io/api/v2/projects/velocity/versions/${VELOCITY_VERSION}/builds/${LATEST_BUILD}/downloads/${VELOCITY_DOWNLOAD_NAME}"

# download velocity jar
wget -O ${VELOCITY_DOWNLOAD_NAME} ${VELOCITY_URL}

# create start script
cat << EOF > start.sh
#!/bin/bash
java -Xms512M -Xmx512M -XX:+UseG1GC -XX:G1HeapRegionSize=4M -XX:+UnlockExperimentalVMOptions -XX:+ParallelRefProcEnabled -XX:+AlwaysPreTouch -XX:MaxInlineLevel=15 -jar ${VELOCITY_JAR}
EOF
chmod u+x start.sh

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

chown -R minecraft:minecraft .
popd

LOG
LOG "	Velocity installed"
LOG
#echo "(press enter to return)"
#read
