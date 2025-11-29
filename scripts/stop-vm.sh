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
    error "VM '$VM_NAME' does not exist"
    exit 1
fi

# Get VM state
VM_STATE=$(VBoxManage showvminfo "$VM_NAME" --machinereadable | grep "VMState=" | cut -d'"' -f2)

if [ "$VM_STATE" != "running" ]; then
    warning "VM '$VM_NAME' is not running (current state: $VM_STATE)"
    exit 0
fi

log "Stopping VM: $VM_NAME"
log "Current state: $VM_STATE"

# Stop VM gracefully using ACPI power button
log "Sending ACPI power button signal..."
VBoxManage controlvm "$VM_NAME" acpipowerbutton || {
    warning "Failed to send ACPI signal, forcing power off..."
    VBoxManage controlvm "$VM_NAME" poweroff || {
        error "Failed to stop VM"
        exit 1
    }
}

# Wait for VM to stop (max 30 seconds)
log "Waiting for VM to stop gracefully..."
for i in {1..30}; do
    sleep 1
    CURRENT_STATE=$(VBoxManage showvminfo "$VM_NAME" --machinereadable | grep "VMState=" | cut -d'"' -f2)
    if [ "$CURRENT_STATE" != "running" ]; then
        log "VM stopped successfully"
        exit 0
    fi
done

# If still running after 30 seconds, force power off
warning "VM did not stop within 30 seconds, forcing power off..."
VBoxManage controlvm "$VM_NAME" poweroff
sleep 2

log "VM '$VM_NAME' stopped successfully!"

exit 0

