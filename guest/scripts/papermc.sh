#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Downloads and sets up a Minecraft 1.18 PaperMC server.
# Use on Debian 11.

### CONFIGURATION ###

# This script downloads the latest build of the specified PaperMC version.
PAPERMC_VERSION="1.18.1"

# install papermc to this directory
PAPERMC_DIR="/home/minecraft/papermc/"

# URL to download the whitelist from on startup
WHITELIST_URL="https://mc.max1220.de/whitelist.json"

# Size of the Java-allocated RAM for this minecraft server
# 2GB+ are recommended
JAVA_RAM="2G"

# Minecraft username of the primary op.
# This user is /op'ed at every server start.
OP_NAME="max1220"

# List of plugins to download into the plugins/ directory
PLUGINS=(
	"https://github.com/webbukkit/dynmap/releases/download/v3.3-beta-2/Dynmap-3.3-beta-2-spigot.jar" \
	"https://ci.enginehub.org/repository/download/bt10/19476:id/worldedit-bukkit-7.2.9-SNAPSHOT-dist.jar?branch=version/7.2.x&guest=1" \
	#"https://ci.codemc.io/view/Author/job/pop4959/job/Chunky/lastStableBuild/artifact/bukkit/build/libs/Chunky-Bukkit-1.2.173.jar"
)

### END CONFIGURATION ###

# install jre
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends openjdk-17-jre jq

# add minecraft user if it doesn't exist
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

# create directory for papermc server
mkdir -p ${PAPERMC_DIR}
pushd ${PAPERMC_DIR}



# I really wish they kept a simple latest-version download API.
# Now we need JSON parsing and 2 extra HTTP requests :/
PAPERMC_LATEST_BUILD="$(wget -O - "https://papermc.io/api/v2/projects/paper/versions/${PAPERMC_VERSION}" | jq -r ".builds[-1]")"
PAPERMC_DOWNLOAD_NAME="$(wget -O - "https://papermc.io/api/v2/projects/paper/versions/${PAPERMC_VERSION}/builds/${PAPERMC_LATEST_BUILD}" | jq -r ".downloads.application.name")"
PAPERMC_DOWNLOAD_URL="https://papermc.io/api/v2/projects/paper/versions/${PAPERMC_VERSION}/builds/${PAPERMC_LATEST_BUILD}/downloads/${PAPERMC_DOWNLOAD_NAME}"

# download papermc jar
wget -O ${PAPERMC_DOWNLOAD_NAME} ${PAPERMC_DOWNLOAD_URL}

# create start script using aikars flags
# Also updates the whitelist.json from the web server on every start
cat << EOF > start.sh
#!/bin/bash
wget -O whitelist.json "${WHITELIST_URL}"
java -Xms${JAVA_RAM} -Xmx${JAVA_RAM} -XX:+UseG1GC -XX:+ParallelRefProcEnabled \
-XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions \
-XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 \
-XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 \
-XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 \
-XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 \
-XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 \
-XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 \
-Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true \
-jar ${PAPERMC_DOWNLOAD_NAME} nogui
EOF
chmod u+x start.sh

# you need to have read & accepted the EULA beforehand!
echo "eula=true" > eula.txt

# download plugins
mkdir -p plugins
pushd plugins
for url in ${PLUGINS[@]}; do
	wget "${url}"
done
popd

# Install a sensible server configuration
cat << EOF > server.properties
# game settings
motd=A Minecraft Server
max-players=20
gamemode=survival
pvp=true
difficulty=hard
online-mode=true
view-distance=10

# level settings
level-name=world
level-seed=
level-type=default
generator-settings=
generate-structures=true
max-world-size=10000

# network settings
server-port=25565
network-compression-threshold=-1
enable-rcon=false
rcon.port=25575
rcon.password=
enable-query=false
query.port=25565

# misc
enable-jmx-monitoring=false
enable-command-block=false
max-tick-time=60000
use-native-transport=true
enable-status=true
allow-flight=false
broadcast-rcon-to-ops=true
max-build-height=256
server-ip=
allow-nether=true
sync-chunk-writes=true
op-permission-level=4
prevent-proxy-connections=false
resource-pack=
entity-broadcast-range-percentage=100
player-idle-timeout=0
force-gamemode=false
rate-limit=0
hardcore=false
white-list=true
broadcast-console-to-ops=true
spawn-npcs=true
spawn-animals=true
snooper-enabled=true
function-permission-level=2
text-filtering-config=
spawn-monsters=true
enforce-whitelist=true
resource-pack-sha1=
spawn-protection=16
EOF

# create systemd service for automatic start
cat << EOF > /etc/systemd/system/papermc.service
[Unit]
Description=PaperMC Minecraft Server
After=syslog.target
After=network.target

[Service]
RestartSec=2s
Type=simple
User=minecraft
Group=minecraft
WorkingDirectory=${PAPERMC_DIR}
ExecStart=${PAPERMC_DIR}/start.sh
StandardInputText=op ${OP_NAME}
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable papermc.service
systemctl restart papermc.service

chown -R minecraft:minecraft .
popd

LOG
LOG "	PaperMC installed"
LOG
LOG "You can now login as ${OP_NAME}(admin)"
LOG
#echo "(press enter to return)"
#read
