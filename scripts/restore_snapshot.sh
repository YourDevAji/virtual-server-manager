#!/bin/bash

# Virtual Server Manager - Restore Snapshot Script
# Usage: ./restore_snapshot.sh <vm_name> <snapshot_name>

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

VM_NAME="$1"
SNAP_NAME="$2"

if [ -z "$VM_NAME" ] || [ -z "$SNAP_NAME" ]; then
    error "Usage: $0 <vm_name> <snapshot_name>"
    exit 1
fi

if ! eval "$VBOXMANAGE showvminfo \"$VM_NAME\"" &> /dev/null; then
    error "VM '$VM_NAME' does not exist"
    exit 1
fi

log "Restoring snapshot '$SNAP_NAME' for VM '$VM_NAME'..."

if ! eval "$VBOXMANAGE snapshot \"$VM_NAME\" restore \"$SNAP_NAME\""; then
    error "Failed to restore snapshot"
    exit 1
fi

log "Snapshot restored successfully"
exit 0
