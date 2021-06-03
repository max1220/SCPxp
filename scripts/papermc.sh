#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Downloads and sets up a PaperMC server.
# Use on Debian 10.
# TODO: Install config files
# TODO: Install plugins

### CONFIGURATION ###

# URL to download the PaperMC server from
# you need to have read & accepted the server EULA beforehand!
PAPERMC_URL="https://papermc.io/api/v2/projects/paper/versions/1.16.5/builds/629/downloads/paper-1.16.5-629.jar"

# install papermc to this directory
PAPERMC_DIR="/home/minecraft/papermc/"

### END CONFIGURATION ###

# install jre
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends openjdk-11-jre-headless

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
cd ${PAPERMC_DIR}

# download papermc server jar
PAPERMC_JAR="$(basename "${PAPERMC_URL}")"
wget -O ${PAPERMC_JAR} ${PAPERMC_URL}

# create start script using aikars flags
cat << EOF > start.sh
#!/bin/bash
# TODO
java -Xms2G -Xmx2G -XX:+UseG1GC -XX:+ParallelRefProcEnabled \
-XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions \
-XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 \
-XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 \
-XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 \
-XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 \
-XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 \
-XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 \
-Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true \
-jar ${PAPERMC_JAR} nogui
EOF
chmod u+x start.sh

# you need to have read & accepted the EULA beforehand!
echo "eula=true" > eula.txt

mkdir -p plugins
cd plugins
wget "https://github.com/webbukkit/dynmap/releases/download/v3.1-beta-7/Dynmap-3.1-beta7-spigot.jar"
wget "https://ci.enginehub.org/repository/download/bt10/17754:id/worldedit-bukkit-7.3.0-SNAPSHOT-dist.jar?branch=master&guest=1"
wget "https://ci.codemc.io/view/Author/job/pop4959/job/Chunky/lastStableBuild/artifact/bukkit/build/libs/Chunky-Bukkit-1.2.78.jar"
cd ..

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
white-list=false
broadcast-console-to-ops=true
spawn-npcs=true
spawn-animals=true
snooper-enabled=true
function-permission-level=2
text-filtering-config=
spawn-monsters=true
enforce-whitelist=false
resource-pack-sha1=
spawn-protection=16
EOF

chown -R minecraft:minecraft ${PAPERMC_DIR}

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
StandardInputText=op max1220
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable papermc.service
systemctl restart papermc.service


LOG
LOG "	PaperMC installed"
LOG
#echo "(press enter to return)"
#read
