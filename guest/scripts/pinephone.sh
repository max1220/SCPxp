#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# This script is used to compile the
# u-boot+atf+crust, Mobian kernel, and Modem firmware
# for the pinephone.
# Use on Debian 11, preferably in a container or VM.
# This script should be run as a non-root user that has access to sudo

MAKE_PARALLEL="$(nproc)"
OR1K_TOOLCHAIN_URL="https://musl.cc/or1k-linux-musl-cross.tgz"
AARCH64_TOOLCHAIN_URL="https://musl.cc/aarch64-linux-musl-cross.tgz"
CRUST_META_GIT="https://github.com/crust-firmware/meta"
MOBIAN_KERNEL_GIT="https://gitlab.com/mobian1/devices/sunxi64-linux.git"
MOBIAN_KERNEL_BRANCH="mobian-5.15"
MOBIAN_KERNEL_DEFCONFIG="pine64_defconfig"
PINEPHONE_MODEM_SDK_GIT="https://github.com/Biktorgj/pinephone_modem_sdk"
DOWNLOAD_ONLY="false"
DO_MENUCONFIG="true"

# install common build utils
LOG "installing build tools..."
sudo dpkg --add-architecture arm64
sudo apt update -y
sudo apt-get install -y \
build-essential wget git bzip2 libgmp-dev libmpfr-dev libmpc-dev texinfo \
gawk wget git diffstat unzip texinfo gcc build-essential chrpath socat cpio \
python3 python3-pip python3-pexpect xz-utils debianutils iputils-ping \
python3-git python3-jinja2 libegl1-mesa libsdl1.2-dev pylint3 xterm \
python3-subunit mesa-common-dev zstd liblz4-tool \
device-tree-compiler swig bison flex python3-distutils \
libpython3.9-dev libssl-dev python3-setuptools \
g++-aarch64-linux-gnu crossbuild-essential-arm64 \
debootstrap u-boot-tools libncurses-dev \
libssl-dev rsync kmod bc git-buildpackage





LOG "downloading toolchains..."


# download or1k cross compiler
if [ ! -d or1k-linux-musl-cross ]; then
    wget "${OR1K_TOOLCHAIN_URL}" -O or1k-linux-musl-cross.tgz
    tar -xvzf or1k-linux-musl-cross.tgz
    rm or1k-linux-musl-cross.tgz
fi
# make sure toolchain is in PATH
if [[ ":${PATH}:" != *":${PWD}:"* ]]; then
    pushd or1k-linux-musl-cross/bin
    export PATH="${PATH}:${PWD}"
    echo -e "\n\n# or1k cross compiler for pinephone modem:\nexport PATH=\"${PATH}:${PWD}\"" >> ~/.bashrc
    popd
fi
LOG "or1k toolchain ok!"


# download aarch64 cross compiler
# Could also use system aarch64 compiler, but musl is default for crust makefile
if [ ! -d aarch64-linux-musl-cross ]; then
    wget  "${AARCH64_TOOLCHAIN_URL}" -O aarch64-linux-musl-cross.tgz
    tar -xvzf aarch64-linux-musl-cross.tgz
    rm aarch64-linux-musl-cross.tgz
fi
# make sure toolchain is in PATH
if [[ ":${PATH}:" != *":${PWD}:"* ]]; then
    pushd aarch64-linux-musl-cross/bin
    export PATH="${PATH}:${PWD}"
    echo -e "\n\n# aarch64 cross compiler for pinephone modem:\nexport PATH=\"${PATH}:${PWD}\"" >> ~/.bashrc
    popd
fi
LOG "aarch64 toolchain ok!"





# download crust firmware makefile
LOG "crust building..."
if [ ! -d crust ]; then
    git clone "${CRUST_META_GIT}" crust
fi
pushd crust

# download required repositories if not downloaded already
export HOME="${PWD}"
if [ ! -d arm-trusted-firmware ]; then
	BOARD="pinephone" make arm-trusted-firmware
fi
if [ ! -d crust ]; then
	BOARD="pinephone" make crust
fi
if [ ! -d u-boot ]; then
	BOARD="pinephone" make u-boot
fi

popd

# download debian kernel source
if [ ! -d kernel ]; then
    git clone -b "${MOBIAN_KERNEL_BRANCH}" "${MOBIAN_KERNEL_GIT}" kernel
fi

if [ "${DOWNLOAD_ONLY}" = "true" ]; then
	# No more downloading left
	LOG "All downloads completed!"
	exit 0
fi



# *TODO*, make custom changes here e.g. edit u-boot/configs/pinephone_defconfig to enable CONFIG_DRAM_CLK=624

pushd crust
# compile u-boot, crust, atf
if [ "${DO_MENUCONFIG}" = "true" ]; then
	BOARD="pinephone" make menuconfig || true
fi
BOARD="pinephone" make -j"${MAKE_PARALLEL}"

LOG "crust build ok!"
popd





# build mobian kernel
LOG "kernel building..."




pushd kernel

# needed for gbp to apply patches :/
git config --global user.email "${USER}@${HOSTNAME}"
git config --global user.name "${USER}"

# Import (Mobian/debian specific) patches
gbp pq import || true

# apply default configuration
ARCH="arm64" CROSS_COMPILE="aarch64-linux-gnu-" make -j"${MAKE_PARALLEL}" "${MOBIAN_KERNEL_DEFCONFIG}"

# *TODO*: Here you could apply custom config values
if [ "${DO_MENUCONFIG}" = "true" ]; then
	ARCH="arm64" CROSS_COMPILE="aarch64-linux-gnu-" make menuconfig || true
fi

# build kernel, create .deb packages
# uses the system aarch64 cross compiler
ARCH="arm64" CROSS_COMPILE="aarch64-linux-gnu-" make -j"${MAKE_PARALLEL}" bindeb-pkg KERNELRELEASE="5.15-sunxi64-custom" KDEB_PKGVERSION="1"
popd

LOG "kernel build ok!"





# build pinephone modem firmware
if [ ! -d crust ]; then
	git clone "${PINEPHONE_MODEM_SDK_GIT}" pinephone_modem_sdk
fi
pushd pinephone_modem_sdk
./init.sh
make everything
popd
LOG "modem firmware build ok!"





# collect build artifacts
mkdir -p artifacts
# TODO: Get all artifacts, add installer script?
cp *.deb artifacts/
cp curst/u-boot/u-boot-sunxi-with-spl.bin artifacts/
cp pinephone_modem_sdk/target/package.tar.gz artifacts/modem_firmware.tar


ARTIFACTS_TAR="artifacts-$(date --iso-8601=seconds).tar"
tar --force-local -vczf "${ARTIFACTS_TAR}" artifacts/





LOG
LOG "Setup ok! Artifacts saved as artifacts.tar"
LOG
#LOG "(press enter to return)"
#read
