# this is a generic container configuration file.


# Container setup configuration
# This part configures what scripts to run, and what files the
# container requires.

# associative array of scripts to run in the containers.
# key is the script to run in the container,
# value is the arguments passed to the script
declare -A CONTAINER_SCRIPTS
CONTAINER_SCRIPTS["scripts/onboard.sh"]="config/container_generic.sh"


# associative array of users the scripts are run as.
# If not specified, the script is run as root.
declare -A CONTAINER_SCRIPT_USER
# This is already the default:
#CONTAINER_SCRIPT_USER["scripts/onboard.sh"]="root"


# list of files/directories to copy to the container
declare -A CONTAINER_COPY
CONTAINER_COPY["."]="." # TODO: It's better to selectively copy needed files





# Containers script configuration
# This part configures the setup scripts above.
# See the documentation for the repspective scripts as well.


#from scripts/onboard.sh
# a new non-root user will be created, this is its username:
USERNAME=max

# the new user will have this list of keys in its ~/.ssh/authorized_keys
SSH_PUB="
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDKvYFrAT997455zvBcOgudHwp2ZvlNKq278ZsTDR+MQFH0xwKVywzQMnOH1MtzBocwO44VmDKm6YM92KXuMcxQ/8QeTzp+dj+PuOfPgCYXNNqCsPw75ruTFxADBVmtVUCA+SSlmj85RMqgcRVXKp55it3EukbvQJVeMoAhUwiLpi+lVQwFfB9Poh9gFACK/J6yZ7g2aUzDwOog/YhQwpuiD1Z2C9jezaBDm+Z/sDMWN0HKoCfLcOz95kgGTVU1C+KKQdGFO9KRc1t7bA5VUyFwWRf97JDtAdCq/QCQLZc1ZoFHYDsKv6THuLJR0D4paKqqTLFCyKZtv7qVpsNJwOBANA8W+2R3/eoWVbTJS2eNkNM3nsxoyJAwBsz4DmsJghkapHrGh9GElMqjlDVpfFNX+B3un6LiqvUDJxcUCvaBLdygxchwQ3oeDSpNGADw6L/PsRB+k4UN0uUhP1YAnyv7RtaK9X20V/EsPj1KlG+2yNsCsmtXyI+Kv/z3Y/TuXok= max@debian-fx
"

# should this system use the apt-cacher-ng on the host?
ENABEL_APT_CACHE=true

# the Domain as part of the FQDN
DOMAINNAME="example.com"
