# host setup files

These files are used to setup a LXC container hosting system on a
Debian 11 installation.


The `letsencrypt_{pre,post}.sh` scripts can be used if you're running the
web server in an LXC container, but want to manage certificates on the
host. I use this setup with bind-mounts so that the containers only
get the certificates they need, without having letsencrypt installed
or worry about renewing in the containers.


The `host/port_forwards.sh` script generates a simple iptables rule for
forwarding a port on the host to a container(on the default LXC 
network bridge).


`host/remote_install.sh` is used to setup setup a remote system for use
with these scripts via SSH.
For example, it is used to deploy the scripts on the
libvirt VM, and setup the VM remotely.


`setup_btrfs.sh` sets up btrfs, including support for bootable btrfs
snapshots. It is required to reboot after running this script, because
the default boot device changes, and otherwise your changes might be
"lost"(on a different btrfs subvol than the one you boot).


`setup_host.sh` performs most of the setup for the hosting system,
including setting up users, configuring LXC, installing packages etc.


`setup_network.sh` configures the network, including support for giving
containers IPv6 arbitary addresses, static IP config, and a simple
firewall. Script does not restart networking automatically!
Reboot after using it recommended!
