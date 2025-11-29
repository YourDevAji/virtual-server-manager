#!/bin/bash

# Virtual Server Manager - Start VM Script
# This script starts a VirtualBox VM in headless mode
# Usage: ./start-vm.sh <name>

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

if [ "$VM_STATE" == "running" ]; then
    warning "VM '$VM_NAME' is already running"
    exit 0
fi

log "Starting VM: $VM_NAME"
log "Current state: $VM_STATE"

# Start VM in headless mode
log "Starting VM in headless mode..."
VBoxManage startvm "$VM_NAME" --type headless || {
    error "Failed to start VM"
    exit 1
}

log "VM '$VM_NAME' started successfully!"
log "Waiting for VM to fully boot..."

# Wait a bit for VM to initialize
sleep 3

log "VM is now running"

exit 0

