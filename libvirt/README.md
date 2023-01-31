# libvirt automated setup scripts

There are two scripts in this, and shared configuration files.

The `unattended_debian_install.sh` script creates a new libvirtd VM,
then automatically and installs a Debian 11 VM unattended.

The `install_lxc_scripts.sh` script installs the lxc-scripts into
an existing libvirtd VM.

Together, they can be used to automatically create a hosting envirioment,
as the lxc-scripts expect it.
