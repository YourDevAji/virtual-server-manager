#!/bin/bash

# Virtual Server Manager - Destroy VM Script
# This script stops and completely removes a VirtualBox VM
# Usage: ./destroy_vm.sh <name>

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

# Check if VBoxManage is available
if ! command -v VBoxManage &> /dev/null; then
    error "VBoxManage is not installed or not in PATH"
    error "Please install VirtualBox first"
    exit 1
fi

# Parse arguments
VM_NAME="$1"

# Validate arguments
if [ -z "$VM_NAME" ]; then
    error "Usage: $0 <name>"
    exit 1
fi

# Check if VM exists
if ! VBoxManage showvminfo "$VM_NAME" &> /dev/null; then
    warning "VM '$VM_NAME' does not exist"
    exit 0
fi

log "Destroying VM: $VM_NAME"

# Get VM state
VM_STATE=$(VBoxManage showvminfo "$VM_NAME" --machinereadable | grep "VMState=" | cut -d'"' -f2)
log "Current VM state: $VM_STATE"

# Stop VM if it's running
if [ "$VM_STATE" == "running" ]; then
    log "Stopping VM..."
    VBoxManage controlvm "$VM_NAME" acpipowerbutton || {
        warning "Failed to gracefully stop VM, forcing power off..."
        VBoxManage controlvm "$VM_NAME" poweroff || {
            error "Failed to stop VM"
            exit 1
        }
    }
    
    # Wait for VM to stop (max 30 seconds)
    log "Waiting for VM to stop..."
    for i in {1..30}; do
        sleep 1
        CURRENT_STATE=$(VBoxManage showvminfo "$VM_NAME" --machinereadable | grep "VMState=" | cut -d'"' -f2)
        if [ "$CURRENT_STATE" != "running" ]; then
            log "VM stopped successfully"
            break
        fi
        if [ $i -eq 30 ]; then
            warning "VM did not stop within 30 seconds, forcing power off..."
            VBoxManage controlvm "$VM_NAME" poweroff
            sleep 2
        fi
    done
fi

# Get VM directory to delete disk files
VM_DIR=$(VBoxManage showvminfo "$VM_NAME" | grep "Config file:" | awk '{print $3}' | xargs dirname)
log "VM directory: $VM_DIR"

# Unregister and delete VM
log "Unregistering VM..."
VBoxManage unregistervm "$VM_NAME" --delete || {
    error "Failed to unregister VM"
    exit 1
}

# Delete VM directory if it still exists
if [ -d "$VM_DIR" ]; then
    log "Removing VM directory..."
    rm -rf "$VM_DIR" || {
        warning "Failed to remove VM directory: $VM_DIR"
        warning "You may need to remove it manually"
    }
fi

log "VM '$VM_NAME' destroyed successfully!"
log "All associated files have been removed"

exit 0

