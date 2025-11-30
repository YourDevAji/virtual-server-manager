#!/bin/bash

# Virtual Server Manager - Stop VM Script
# This script stops a running VirtualBox VM gracefully
# Usage: ./stop-vm.sh <name>

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Find VBoxManage - handle paths with spaces
find_vboxmanage() {
    # First try command -v (works if in PATH)
    if command -v VBoxManage &> /dev/null; then
        VBOXMANAGE=$(command -v VBoxManage)
        echo "$VBOXMANAGE"
        return 0
    fi
    
    # Check common Windows paths (when running in Git Bash on Windows)
    if [ -f "/c/Program Files/Oracle/VirtualBox/VBoxManage.exe" ]; then
        echo "/c/Program Files/Oracle/VirtualBox/VBoxManage.exe"
        return 0
    fi
    if [ -f "/c/Program Files (x86)/Oracle/VirtualBox/VBoxManage.exe" ]; then
        echo "/c/Program Files (x86)/Oracle/VirtualBox/VBoxManage.exe"
        return 0
    fi
    
    # Check Unix paths
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

# Find and set VBoxManage path
VBOXMANAGE_PATH=$(find_vboxmanage)
if [ -z "$VBOXMANAGE_PATH" ]; then
    error "VBoxManage is not installed or not in PATH"
    error "Please install VirtualBox first"
    exit 1
fi

# Always quote the path to handle spaces
VBOXMANAGE="\"$VBOXMANAGE_PATH\""

# Parse arguments
VM_NAME="$1"

# Validate arguments
if [ -z "$VM_NAME" ]; then
    error "Usage: $0 <name>"
    exit 1
fi

# Check if VM exists
if ! eval "$VBOXMANAGE showvminfo \"$VM_NAME\"" &> /dev/null; then
    error "VM '$VM_NAME' does not exist"
    exit 1
fi

# Get VM state
VM_STATE=$(eval "$VBOXMANAGE showvminfo \"$VM_NAME\" --machinereadable" | grep "VMState=" | cut -d'"' -f2)

if [ "$VM_STATE" != "running" ]; then
    warning "VM '$VM_NAME' is not running (current state: $VM_STATE)"
    exit 0
fi

log "Stopping VM: $VM_NAME"
log "Current state: $VM_STATE"

# Stop VM gracefully using ACPI power button
log "Sending ACPI power button signal..."
eval "$VBOXMANAGE controlvm \"$VM_NAME\" acpipowerbutton" || {
    warning "Failed to send ACPI signal, forcing power off..."
    eval "$VBOXMANAGE controlvm \"$VM_NAME\" poweroff" || {
        error "Failed to stop VM"
        exit 1
    }
}

# Wait for VM to stop (max 30 seconds)
log "Waiting for VM to stop gracefully..."
for i in {1..30}; do
    sleep 1
    CURRENT_STATE=$(eval "$VBOXMANAGE showvminfo \"$VM_NAME\" --machinereadable" | grep "VMState=" | cut -d'"' -f2)
    if [ "$CURRENT_STATE" != "running" ]; then
        log "VM stopped successfully"
        exit 0
    fi
done

# If still running after 30 seconds, force power off
warning "VM did not stop within 30 seconds, forcing power off..."
eval "$VBOXMANAGE controlvm \"$VM_NAME\" poweroff"
sleep 2

log "VM '$VM_NAME' stopped successfully!"

exit 0

