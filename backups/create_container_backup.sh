#!/bin/bash
set -eu

# This script creates a backup of a stopped LXC container.
# The first argument is the container name, the second optional argument
# is the name/path of the created backup
# (Defaults to "${LXC_PATH}/${CONTAINER}_$(date --iso-8601=seconds).tar.gz").

# Parse arguments and get required envirioment variables
CONTAINER="${1}"
LXC_PATH="$(lxc-config lxc.lxcpath)"
CONTAINER_PATH="${LXC_PATH}/${CONTAINER}"
DEFAULT_BACKUP_PATH="${CONTAINER}_$(date --iso-8601=seconds).tar.gz"
BACKUP_PATH="${DEFAULT_BACKUP_PATH}"



if [ "${CONTAINER}" = "" ]; then
	echo "Must specify container name!"
	exit 1
fi
if ! [ "${2}" = "" ]; then
	BACKUP_PATH="${2}"
fi
if ! [ -d "${CONTAINER_PATH}" ]; then
	echo "Container not found!"
	exit 1
fi



pushd "${CONTAINER_PATH}"

# create rootfs backup as tarbal, in running container
lxc-execute -n "${CONTAINER}" -- tar --exclude=/rootfs.tar --force-local --one-file-system --ignore-failed-read --numeric-owner -cvpf /rootfs.tar / || true

# copy rootfs backup from container to host
lxc-execute -n "${CONTAINER}" -- cat /rootfs.tar > rootfs.tar

# delete rootfs.tar from container rootfs
lxc-execute -n "${CONTAINER}" -- rm -v /rootfs.tar

# create backup containing the rootfs backup tar, but not the rootfs.
tar --exclude=./rootfs --force-local --one-file-system --ignore-failed-read --numeric-owner -cvzpf "${BACKUP_PATH}" . || true

# delete rootfs.tar from host
rm rootfs.tar

popd

