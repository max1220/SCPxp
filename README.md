# LXC

This repository contains my scripts for my Debian-based
LXC container hosting.

My goal is for this to completely automate my setup used for my hosting,
to the point that I just need to create a Debian 11 server in a VM or on a
shared hoster that is reachable via SSH, and have the rest of the setup done
automatically.

There are three sets of scripts:
 * Scripts for setting up the host system are in the `host/` directory.
 * Scripts for setting up a container are in the `scripts/` directory.
 * Scripts for backing up and restoring containers in the `backups/` directory.
 * Scripts for setting up a VM(not a container)
   as a host are in the `libvirt/` directory.

Together, these scripts are used to host my own website and other services.

A dialog-based terminal tool for managing LXC containers interactively is also
provided(just requires a workign LXC setup).


# Host setup guide

First, read this *entire* README.

On the server, perform a fresh install of Debian 11:

*Do not* setup a password for the root user when asked
(uses sudo automatically if you leave it blank)!

You don't need any additional packages when asked,
uncheck *all* package options.

Login as regular user, perform `sudo apt-get update` and `sudo apt-get upgrade`
manually at least once.

(optionally) install SSH server for easy access during setup.
Note that during the setup fail2ban is installed and configured to watch SSH,
and that password login will be disabled!
`sudo apt install openssh-server`

(optionally) setup sudo so you don't need to enter a password.

Now you can use my scripts to perform the actual installation of the
host system.

First, download the current version of my scripts on the server.
Git has the advantage that you can easily update the scripts
(git has to be installed: `sudo apt install git`):

```
git clone https://github.com/max1220/lxc-scripts
cd lxc-scripts/
```

Alternatively:

```
wget https://github.com/max1220/lxc-scripts/archive/refs/heads/main.zip
unzip main.zip && rm main.zip
cd lxc-scripts/
```

## host/setup_btrfs.sh

If you have setup Debian on btrfs and wish to automatically setup
bootable btrfs snapshots, modify and run the `host/setup_btrfs.sh` script first.
```
# configure disk etc.
editor ./host/setup_btrfs.sh

# run to create a current snapshot, and prepare for bootable snapshots,
# enable btrfsmaintenance services etc.
./host/setup_btrfs.sh
```

After running the script it is highly recommended to reboot!
The default btrfs subvolume has changed to allow for bootable snapshots,
if you don't reboot your changes will be lost!


## host/setup_host.sh

To start the setup of the host system first review and modify the
`host/setup_host.sh` script:
```
# configure username etc.
editor ./host/setup_host.sh

# run to install packages and configure system:
./host/setup_host.sh
```

This will setup all the required packages for using the host system with
LXC containers, and configure the system.

Some of the things this script does:
* install a lot of packages
* setup sub*id mapping
* install libvirt and allow default user access
* install and configure apt-cacher-ng for container updates
* enable apparmor in grub config
* sets up default LXC container config
* setup fail2ban for SSH
* Configure SSH securely(no password login!)
* setup journal-remote to listen using HTTP on bridge IP

After running the script it is recommended to reboot, since we've modified the
default cmdline(to enable apparmor support, and to set
`systemd.unified_cgroup_hierarchy` to an appropriate value).
Without a reboot you're likely not able to use containers!

Before rebooting you can however run the network setup script:
`host/setup_network.sh`.

```
# copy example config file
cp ./host/network_config_libvirt.sh my_network_config.sh

# configure network interface, IP address, hostname etc.
editor my_network_config.sh

# install networking-related packages and apply network configuration
./host/setup_network.sh my_network_config.sh
```

You should run this script *after* the `setup_host.sh` script!

It will configure the specified interface with a static IP address,
setup firewall rules for containers and the host, sets up `sysctl` for
containers, sets the system hostname, etc.
See `host/network_config_libvirt.sh` as an example
(configuration for libvirt VM with the IP 192.168.100.254 on
the default libvirt bridge)

You should reboot now. Afterwards the setup is complete.

You have now setup a Debian 11 server for containers using my scripts.
See below for the features of your new server.


## Libvirt setup guide

The scripts in the `libvirt/` directory are used to launch a pre-setup libvirt
VM snapshot, and set it up as a host system using these scripts in an automated
fashion.

This snapshot needs to be prepared in advance, and some config files altered
beforehand.

To create the snapshot, simply prepare the system as described above,typically:
 * Install Debian
 * `sudo apt-get update -y && sudo apt-get upgrade -y`
 * `sudo apt install openssh-server`
 * copy SSH public key to server
 * Edit the `host/network_config_libvirt.sh` config if needed
 * Create a snapshot of the running system called `prepared`

Edit the libvirt/setup_host_



## manage_containers.sh

This file provides a simple menu for managing LXC containers
by calling the associated lxc-* programms.
It uses the dialog util to provide interactive input.

Currently, it supports:
 * create/start/stop/restart/delete/clone/rename containers
 * list running/stopped containers
 * copy files from/to containers
 * run scripts in containers
 * show info/statistics about container
 * open editor for container/host config files



## scripts/onboard.sh

This script is the default container onboarding script.
Check the configuration parameters USERNAME and SSH_PUB in the first few lines.
It sets up a Debian 11 container nicely:
 * setup apt to use apt-cacher-ng (use http://10.0.3.1:3142/)
 * Installs the following packages:
   - `apt-transport-https ca-certificates apt-utils iputils-ping ca-certificates wget screen less bash-completion sudo \
   nano openssh-server systemd-journal-remote unattended-upgrades`
 * Sets up journald remote logging(use http://10.0.3.1:19532)
 * Adds an non-root administrator user
   - sudo without password
   - copy SSH public key to ~/.ssh/authorized_keys






## host_network.sh

This script sets up the networking for the host.
Configure the values at the top marked CONFIGURATION,
then read the script carefully.
Requires lxc-net to be already installed!

 * hostname
 * /etc/network/interfaces
 * sysctls
 * lxc-net
 * /etc/iptables/rules.v4
 * optionally IPv6(using ndppd for containers)



## port_forwards.sh

This script aides in creating iptables NAT rules for "port forwards".
It reads a list of port forwards from the container to the host
network from STDIN, and outputs iptables rules to stdout.
The first parameter is passed along to iptables, after the port specification.
The format for the port forwards is `host_port:container_name:container_port`

For example `echo 8080:web:80 "-i ens3" | ./port_forwards ens3` would generate a
rule for forwarding requests to the *host* on port `8080` to the
*container* named `web` on port `80`:

`iptables -t nat -A PREROUTING -p tcp --dport 80 -i ens3 -j DNAT --to 10.0.3.248:80`
(assuming that 10.0.3.248 is the IP of the container named web)



## Using letsencrypt

You can easily distribute letsencrypt keys to a container.

On the host system, you can create new letsencrypt certificates using:

```
sudo letsencrypt certonly \
--standalone \
--pre-hook /path/to/lxc-scripts/letsencrypt_pre.sh \
--post-hook /path/to/lxc-scripts/letsencrypt_post.sh \
-d example.com \
-d www.example.com
```

You could then add a bind mount to the container to forward this single certificate obtained for the VM:

```
lxc.mount.entry=/etc/letsencrypt/live/example.com etc/letsencrypt/live/example.com none ro,bind,create=dir 0 0
lxc.mount.entry=/etc/letsencrypt/archive/example.com etc/letsencrypt/archive/example.com none ro,bind,create=dir 0 0
```

You need to add both mounts, as the certificates in the live/ directory are
just symlinks to the corresponding certificates in the archive/ directory.

## letsencrypt_pre.sh

This script uses iptables to temporarily allow connection to port 80
on the host system, and temporarily circumvent port forwards for
containers on that port.

## letsencrypt_post.sh

This script removes the temporary iptables rules, and restarts
containers that depend on the certificates.
It also uses setfacl to allow the uid mapped users root(uid=1000000) and www-data(1000033) access to the certificates.



## libvirt.sh

This script runs the `host_setup.sh` and `host_network.sh` script
in a prepared libvirt VM.
The prepared VM snapshot needs to be a fresh install of Debian 11.
This is used for testing the setup, but can also be useful simply
host a VM with some LXC containers.



## scripts/*

This directory contains scripts to be run in containers.
These scripts setup the specific applications or perform specific
tasks, see their respective documentation/comments.



# TODO
  - Complete config_wizard.sh
  - Re-check all information in this README
    - Separate out the information in this README to the various sub-READMEs
  - unprivileged containers(Almost working now!)
  - monitoring
  - host backup?
  - wireguard
  - Figure out why ACL is only needed on btrfs?
