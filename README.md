# lxc-scripts

This repository contains my scripts for my administrating Debian
servers, specifically the installation and management
of LXC containers and libvirtd VMs.

My goal is for this to completely automate my setup used for my hosting
my own website and services, including managing all the configuration
in a central place, so that I can easily spin up a copy in a VM for testing.

The test setup is fully automated, including the installation of Debian
in a libvirtd VM using PXE(no user interaction required).

Also included is a script for graphically managing containers,
a script for backing up a LXC container and a LXC template for restoring,
and a graphical configuration wizard for the host setup and container
setup.

Ideally, the entire setup can be done without having to manually run any
shell commands for configuration/setup.





# Features

Some important things these scripts do:

 * Setup a host system(`host/`)
   * (optional) btrfs setup(`host/setup_btrfs.sh`)
     * move rootfs to a new btrfs snapshot
     * bootable snapshots using grub-btrfs
   * network setup(`host/setup_network.sh`)
     * static IPv4 and IPv6 configuration
     * hostname
     * iptables
     * ndppd for containers
   * host setup(`host/setup_host.sh`)
     * LXC
     * libvirtd
     * unprivileged user
     * apt-cacher-ng
     * fail2ban
     * install ssh public key
     * systemd-journal-remote
     * cmdline with `apparmor=1 security=apparmor systemd.unified_cgroup_hierarchy=1`
 * manage LXC containers(`manage_containers.sh`)
   * start/stop container
   * create/destroy container
   * backup/restore container(`backups/`)
   * clone/rename container
   * edit container configuration
   * info about container
   * copy files to/from container
   * run a shell script in the container
   * root/user shell





# Documentation

**Documentation is currently work-in-progress**

This file serves as the main documentation for now.

All directories should have a `README.md` file describing the
content in that directory.





# libvirt setup guide

This setup guide will help you install a host system for the scripts
on your development machine in a libvirtd VM, intended for testing
these scripts and configuration.

(This is *not* about running libvirtd on such a host system, allthough
that is supported as well.)


## Preparations

You need any host that runs libvirtd. This example assumes Debian 11.

```
# TODO Figure out dependencies for running the dev VM on Debian 11
```


## Configuration

You also need to edit the libvirtd host configuration `host/config/libvirt.sh`.
While it *should* "just work" on Debian based systems, you still might
want to perform some customizations, and you'll likely want to change
the username and SSH public key.


## Installation

The installation is super easy and runs fully automatic, but might
take a while to complete depending on your hardware and network connection.

There are two steps to the installation in a libvirt VM:

The preparation phase which creates the VM with a temporary boot network,
sets up the PXE envirioment, and triggers the automatic Debian
installation. A snapshot of the running VM is taken when the preparation
completes.

And the installation phase, which just installs the scripts using SSH.
(described in more detail below).

```
./libvirt/prepare_libvirt.sh
```



# Host setup guide

This setup guide will help you setup the server for "production use".
If you just want to test a configuration, you should use the fully
automated libvirtd test setup(see ABOVE).


## Debian installation

On the server, perform a fresh install of Debian 11:

 1. *Do not* setup a password for the root user when asked
    (first user gets sudo group automatically)!
 2. Don't select any additional packages when asked

After logging into the newly installed server,
you should run `sudo apt-get update` and `sudo apt-get upgrade`
at least once, and probably `sudo apt-get install openssh-server`.

**Note that SSH password login will be disabled automatically during
the setup, and that fail2ban is setup to check SSH.**

The server is now ready to installed as a host system using my scripts.


## Configuration

To use my scripts to setup a host, you need a host configuration file.
This file contains all the information needed to setup the host system.

You can generate one interactively using the config wizard.
It will ask you a series of questions and write a commented
configuration file:

```
./host/config/config_wizard.sh
```


## Installation

When you have your configuration, you only need to copy this
configuration file to your server and run the host setup.

This can easily be done by using SCP to copy this entire directory:

```
# on local device
# assuming my_remote_server is reachable via ssh

scp -rp "${PWD}" my_remote_server
```

Then you can start the host setup process:

```
# on my_remote_server

cd lxc-scripts
./host/setup_all
```

Depending on the configuration, the server needs to reboot at least once,
up to two times.

Afterwards, the setup is completed. Enjoy your new server!




########################################################################


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
