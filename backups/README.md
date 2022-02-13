# Backups

The backup format used by the manage_containers is really simple:
It's simply a tarbal of the LXC config directory of the specified container,
with the `rootfs/` directory replaced with a tarbal containing it's rootfs.
(The created backup usually contains just two files: `./config` and `./rootfs.tar`)



# Backup method

*See create_container_backup.sh*

To create a backup, the script first runs tar using lxc-execute on a stopped container:

```
lxc-execute -n container_name -- tar --exclude=/rootfs.tar --one-file-system --ignore-failed-read -cvpf /rootfs.tar /
```

This creates the rootfs backup.
Simply tar'ing `/var/lib/lxc/container_name/rootfs` would work for
directory-backed rootfs as well, but not for other rootfs types, like loop or nbd.

Then we copy the rootfs.tar from the container using cat instead of cp for the same reason:

```
lxc-execute -n container_name -- cat /rootfs.tar > /var/lib/lxc/container_name/rootfs.tar
```

Finally, we make a tarbal with the content of `/var/lib/lxc/container_name`,
but excluding the `rootfs/` directory(rootfs is contained in the rootfs.tar).

This script intentionally creates what's known as "tar bombs", be warned.
The temporary `rootfs.tar` in the container and on the host are deleted as well.



# Restoring

Restoring is performed using the LXC template
`backups/restore_lxc_template.sh`, to support different rootfs backing
types. Besides argument parsing, the script basically just does:

```
# first, extract the LXC_PATH backup, containing the config file and rootfs.tar
tar --numeric-owner -xvpf "${LXC_ARCHIVE}" -C "${LXC_PATH}"

# then extract the rootfs to the target rootfs(possibly mounted)
tar --numeric-owner -xvpf "${LXC_PATH}/rootfs.tar" -C "${LXC_ROOTFS}"

# perform cleanup by removing the temporary rootfs.tar
rm -vf "${LXC_PATH}/rootfs.tar"
```

You can call it to re-create a container from a backup:

```
lxc-create -n restored_name -t backups/restore_lxc_template.sh -- -a backup_archive.tar.gz
```
