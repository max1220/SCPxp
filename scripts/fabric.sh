#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Downloads and sets up a Minecraft modded server(fabric).
# Use on Debian 10.
# TODO: Install config files
# TODO: Install plugins

### CONFIGURATION ###

# URL to download the fabric server from
# you need to have read & accepted the server EULA beforehand!
FABRIC_URL="https://maven.fabricmc.net/net/fabricmc/fabric-installer/0.7.3/fabric-installer-0.7.3.jar"

# install fabric to this directory
FABRIC_DIR="/home/minecraft/fabric/"

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

# create directory for fabric server
mkdir -p "${FABRIC_DIR}"
cd "${FABRIC_DIR}"

# download fabric installer jar
FABRIC_INST_JAR="$(basename "${FABRIC_URL}")"
wget -O "${FABRIC_INST_JAR}" "${FABRIC_URL}"

# run the fabric installer
java -jar "${FABRIC_INST_JAR}" server -downloadMinecraft -mcversion 1.16.5

FABRIC_JAR="fabric-server-launch.jar"

# create start script using aikars flags
# memory might need adjustment for larger modpacks or more than a few players
cat << EOF > start.sh
#!/bin/bash
# TODO
java -Xms4G -Xmx4G -XX:+UseG1GC -XX:+ParallelRefProcEnabled \
-XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions \
-XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 \
-XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 \
-XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 \
-XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 \
-XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 \
-XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 \
-Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true \
-jar ${FABRIC_JAR} nogui
EOF
chmod u+x start.sh

# you need to have read & accepted the EULA beforehand!
echo "eula=true" > eula.txt

# install mods
mkdir -p mods
cd mods
wget "https://github.com/FabricMC/fabric/releases/download/0.34.2%2B1.16/fabric-api-0.34.2+1.16.jar"
wget "https://github.com/Zundrel/cc-tweaked-fabric/releases/download/v1.19.2/cc-tweaked-fabric-1.16.2-1.91.2.jar"
wget "https://github.com/CaffeineMC/phosphor-fabric/releases/download/mc1.16.2-v0.7.2/phosphor-fabric-mc1.16.3-0.7.2+build.12.jar"
wget "https://github.com/CaffeineMC/lithium-fabric/releases/download/mc1.16.5-0.6.4/lithium-fabric-mc1.16.5-0.6.4.jar"
wget "https://github.com/WearBlackAllDay/DimensionalThreading/releases/download/v1.2.3/DimThread-1.2.3.jar"
wget "https://github.com/webbukkit/dynmap/releases/download/v3.1-beta-7/Dynmap-3.1-beta7-fabric-1.16.4.jar"
wget "https://ci.enginehub.org/repository/download/bt10/17754:id/worldedit-fabric-mc1.16.4-7.3.0-SNAPSHOT-dist.jar?branch=master&guest=1" -O worldedit.jar
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
server-port=25566
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

mkdir config
cat << EOF > config/computercraft.json5
{
	"general": {
		"computer_space_limit": 1000000,
		"floppy_space_limit": 125000,
		"maximum_open_files": 128,
		"disable_lua51_features": false,
		"default_computer_settings": "",
		"debug_enabled": false,
		"log_computer_errors": false
	},
	"execution": {
		"computer_threads": 1,
		"max_main_global_time": 10,
		"max_main_computer_time": 5
	},
	"http": {
		"enabled": true,
		"websocket_enabled": true,
		"whitelist": [
			"*.pastebin.com"
			"*.max1220.de"
			"max1220.de"
		],
		"blacklist": [
			"127.0.0.0/8",
			"10.0.0.0/8",
			"172.16.0.0/12",
			"192.168.0.0/16",
			"fd00::/8"
		],
		"timeout": 30000,
		"max_requests": 16,
		"max_download": 16777216,
		"max_upload": 4194304,
		"max_websockets": 4,
		"max_websocket_message": 1073741824
	},
	"peripheral": {
		"command_block_enabled": false,
		"modem_range": 256,
		"modem_high_altitude_range": 1024,
		"modem_range_during_storm": 256,
		"modem_high_altitude_range_during_storm": 1024,
		"max_notes_per_tick": 8
	},
	"turtle": {
		"need_fuel": true,
		"normal_fuel_limit": 20000,
		"advanced_fuel_limit": 100000,
		"obey_block_protection": true,
		"can_push": true,
		"disabled_actions": []
	}
}

EOF

# fix permissions of the fabric dir
chown -R minecraft:minecraft ${FABRIC_DIR}

# create systemd service for automatic start
cat << EOF > /etc/systemd/system/fabric.service
[Unit]
Description=fabric Minecraft Server
After=syslog.target
After=network.target

[Service]
RestartSec=2s
Type=simple
User=minecraft
Group=minecraft
WorkingDirectory=${FABRIC_DIR}
ExecStart=${FABRIC_DIR}/start.sh
StandardInputText=op max1220
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable fabric.service
systemctl restart fabric.service


LOG
LOG "	Fabric installed"
LOG
#echo "(press enter to return)"
#read
