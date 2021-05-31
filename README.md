# LXC

This repository contains my scripts for setting up and administrating
a Debian 10 server running LXC containers, mostly Debian 10.

They aren't meant as *just* a setup script;
It's expected that the user at least reads all scripts before running them.
While all options that *need* changing are usually at the top,
marked as `### CONFIGURATION ###`, you can(and should)
customize the installed configurations etc. further.

This is a *starting point* **not** a *complete setup*.



# Host setup guide

First, read this *entire* README.

On the server, perform a fresh install of Debian 10:

*Do not* setup a password for the root user when asked(uses sudo automatically if you leave it blank)!

You don't need any additional packages when asked,
uncheck *all* package options.

Login as regular user, perform `sudo apt-get update` and `sudo apt-get upgrade` manually at least once.

(optionally) install SSH server for easy access during setup `sudo apt install openssh-server`

(optionally) setup sudo so you don't need to enter a password.

Now you can use my scripts to perform the actual installation of the
host system.

First, download the current version of my scripts on the server.
Git has the advantage that you can easily update the scripts
(git to be installed: `sudo apt install git`):

```
git clone https://github.com/max1220/lxc-scripts
```

Alternatively:

```
wget https://github.com/max1220/lxc-scripts/archive/refs/heads/main.zip
unzip main.zip && rm main.zip
```

After obtaining the scripts(via git, wget, etc.),
`cd` into the directory, and run `sudo ./host_setup.sh`.

This should install a some base packages, and setup some services(see below for details).


Now run `sudo ./host_network.sh <host network config.sh>` to install the new networking configuration.
An example network configuration for running as libvirtd guest is provided.
(It's commented, also see your provider documentation)

If the scripts ran successfully you should reboot now.
The reboot is required because we changed the grub configuration to
enable apparmor support in our kernel.

You're now completely setup.
See below for the "features" of your new server.



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



## onboard.sh

This script is the default container onboarding script.
Check the configuration parameters USERNAME and SSH_PUB in the first few lines.
It's sets up a Debian container nicely:
 * setup apt to use apt-cacher-ng (use http://10.0.3.1:3142/)
 * Installs the following packages:
   - `apt-transport-https ca-certificates apt-utils iputils-ping ca-certificates wget screen less bash-completion sudo \
   nano openssh-server systemd-journal-remote unattended-upgrades`
 * Sets up journald remote logging(use http://10.0.3.1:19532)
 * Adds an non-root administrator user
   - sudo without password
   - copy SSH public key to ~/.ssh/authorized_keys



## host_setup.sh

This script should be used on a clean install of Debian 10 to setup the LXC host.
It requires that you already have a working internet connection,
and that you have copied your SSH key to the host already(disables password login)
 * install a lot of packages
 * setup sub*id mapping
 * install libvirt and allow default user access
 * install and configure apt-cacher-ng for containers
 * enable apparmor in grub config
 * sets up default LXC container config
 * setup fail2ban for SSH
 * Configure SSH securely(no password login!)
 * setup journal-remote to listen using HTTP on bridge IP
 * more. (see `host_setup.sh`)



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
The prepared VM snapshot needs to be a fresh install of Debian 10.
This is used for testing the setup, but can also be useful simply
host a VM with some LXC containers.



## scripts/*

This directory contains scripts to be run in containers.
These scripts setup the specific applications or perform specific
tasks, see their respective documentation/comments.



# TODO
  - container backup
  - unprivileged containers
  - monitoring
  - host backup?
  - wireguard
  - move container backup logic from manage_containers.lua to scripts/backup.sh
  - setup scripts for
    * mail
	  - iredmail(SOGO) + jsxc
    * jabber
  - port manage_containers.lua to bash?
  - Figure out why ACL is only needed on btrfs?
