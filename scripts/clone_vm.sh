#!/bin/bash

# Virtual Server Manager - Clone VM Script
# Usage: ./clone_vm.sh <source_name> <target_name>

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

find_vboxmanage() {
    if command -v VBoxManage &> /dev/null; then
        VBOXMANAGE=$(command -v VBoxManage)
        echo "$VBOXMANAGE"
        return 0
    fi

    if [ -f "/c/Program Files/Oracle/VirtualBox/VBoxManage.exe" ]; then
        echo "/c/Program Files/Oracle/VirtualBox/VBoxManage.exe"
        return 0
    fi
    if [ -f "/c/Program Files (x86)/Oracle/VirtualBox/VBoxManage.exe" ]; then
        echo "/c/Program Files (x86)/Oracle/VirtualBox/VBoxManage.exe"
        return 0
    fi

    if [ -f "/usr/bin/VBoxManage" ]; then
        echo "/usr/bin/VBoxManage"
        return 0
    fi
    if [ -f "/usr/local/bin/VBoxManage" ]; then
        echo "/usr/local/bin/VBoxManage"
        return 0
    fi

    return 1
}

VBOXMANAGE_PATH=$(find_vboxmanage)
if [ -z "$VBOXMANAGE_PATH" ]; then
    error "VBoxManage is not installed or not in PATH"
    exit 1
fi

VBOXMANAGE="\"$VBOXMANAGE_PATH\""

SRC_NAME="$1"
DEST_NAME="$2"

if [ -z "$SRC_NAME" ] || [ -z "$DEST_NAME" ]; then
    error "Usage: $0 <source_name> <target_name>"
    exit 1
fi

if ! eval "$VBOXMANAGE showvminfo \"$SRC_NAME\"" &> /dev/null; then
    error "Source VM '$SRC_NAME' does not exist"
    exit 1
fi

if eval "$VBOXMANAGE showvminfo \"$DEST_NAME\"" &> /dev/null; then
    error "Target VM '$DEST_NAME' already exists"
    exit 1
fi

log "Cloning VM '$SRC_NAME' to '$DEST_NAME'..."

# Clone including disks and configuration
# --mode all copies the VM and all snapshots; --register registers the new VM
if ! eval "$VBOXMANAGE clonevm \"$SRC_NAME\" --name \"$DEST_NAME\" --register --mode all"; then
    error "Failed to clone VM"
    exit 1
fi

log "VM cloned successfully"
exit 0
