# from libvirt/setup_libvirt.sh

# The connection URL for libvirtd
LIBVIRT_CONNECTION="qemu:///system"

# name of the prepared libvirt VM:
LIBVIRT_VM_NAME="debian_bullseye"

# name of the snapshot that is restored before the setup:
LIBVIRT_VM_SNAPSHOT="prepared"

# Dis space allocated to the VM
LIBVIRT_VM_DISK_GB="5"

# RAM allocated to the VM(defaults to 1/2 of total system RAM)
LIBVIRT_VM_MEM_MB="1024"

# Number of CPUs to allocate to the VM(defaults to all)
LIBVIRT_VM_NCPUS=""



# Configurtion file for running the host/setup_all.sh script in the libvirt VM
HOST_SETUP_CONFIG="host/config/libvirt.sh"



# The below configuration is for the install_debian_unattended.sh script.

# Default user username
DI_USERNAME="max"

# Default user initial password. !!! MUST CHANGE AFTER INSTALLATION !!!
# (When DI_SSH_PUB is present, the password is disabled)
DI_PASSWORD="changeme"

# SSH key to install for the default user
DI_SSH_PUB="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDKvYFrAT997455zvBcOgudHwp2ZvlNKq278ZsTDR+MQFH0xwKVywzQMnOH1MtzBocwO44VmDKm6YM92KXuMcxQ/8QeTzp+dj+PuOfPgCYXNNqCsPw75ruTFxADBVmtVUCA+SSlmj85RMqgcRVXKp55it3EukbvQJVeMoAhUwiLpi+lVQwFfB9Poh9gFACK/J6yZ7g2aUzDwOog/YhQwpuiD1Z2C9jezaBDm+Z/sDMWN0HKoCfLcOz95kgGTVU1C+KKQdGFO9KRc1t7bA5VUyFwWRf97JDtAdCq/QCQLZc1ZoFHYDsKv6THuLJR0D4paKqqTLFCyKZtv7qVpsNJwOBANA8W+2R3/eoWVbTJS2eNkNM3nsxoyJAwBsz4DmsJghkapHrGh9GElMqjlDVpfFNX+B3un6LiqvUDJxcUCvaBLdygxchwQ3oeDSpNGADw6L/PsRB+k4UN0uUhP1YAnyv7RtaK9X20V/EsPj1KlG+2yNsCsmtXyI+Kv/z3Y/TuXok= max@debian-fx"

# Debian installation mirror host
DI_MIRROR_HOST="10.0.3.1"

# Debian installation mirror directory
DI_MIRROR_DIR="/deb.debian.org/debian"
