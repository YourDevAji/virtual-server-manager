#!/bin/bash

# Virtual Server Manager - Create VM Script
# This script creates a new VirtualBox VM using VBoxManage
# Usage: ./create_vm.sh <name> <os> <cpu> <ram> <storage>

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
OS_TYPE="$2"
CPU_CORES="$3"
RAM_GB="$4"
STORAGE_GB="$5"

# Validate arguments
if [ -z "$VM_NAME" ] || [ -z "$OS_TYPE" ] || [ -z "$CPU_CORES" ] || [ -z "$RAM_GB" ] || [ -z "$STORAGE_GB" ]; then
    error "Usage: $0 <name> <os> <cpu> <ram> <storage>"
    exit 1
fi

# Validate OS type
case "$OS_TYPE" in
    Ubuntu|Debian|CentOS)
        log "OS type validated: $OS_TYPE"
        ;;
    *)
        error "Unsupported OS type: $OS_TYPE"
        error "Supported OS: Ubuntu, Debian, CentOS"
        exit 1
        ;;
esac

# Convert RAM from GB to MB
RAM_MB=$((RAM_GB * 1024))

# Set OS type ID for VirtualBox
case "$OS_TYPE" in
    Ubuntu)
        OS_TYPE_ID="Ubuntu_64"
        ;;
    Debian)
        OS_TYPE_ID="Debian_64"
        ;;
    CentOS)
        OS_TYPE_ID="RedHat_64"
        ;;
esac

log "Creating VM: $VM_NAME"
log "OS: $OS_TYPE ($OS_TYPE_ID)"
log "CPU: $CPU_CORES cores"
log "RAM: $RAM_GB GB ($RAM_MB MB)"
log "Storage: $STORAGE_GB GB"

# Check if VM already exists
if VBoxManage showvminfo "$VM_NAME" &> /dev/null; then
    error "VM '$VM_NAME' already exists"
    exit 1
fi

# Create the VM
log "Creating VirtualBox VM..."
VBoxManage createvm --name "$VM_NAME" --ostype "$OS_TYPE_ID" --register || {
    error "Failed to create VM"
    exit 1
}

# Set memory
log "Setting memory to ${RAM_MB}MB..."
VBoxManage modifyvm "$VM_NAME" --memory "$RAM_MB" || {
    error "Failed to set memory"
    VBoxManage unregistervm "$VM_NAME" --delete
    exit 1
}

# Set CPU cores
log "Setting CPU cores to $CPU_CORES..."
VBoxManage modifyvm "$VM_NAME" --cpus "$CPU_CORES" || {
    error "Failed to set CPU cores"
    VBoxManage unregistervm "$VM_NAME" --delete
    exit 1
}

# Create and attach storage
log "Creating virtual disk (${STORAGE_GB}GB)..."
VM_DIR=$(VBoxManage showvminfo "$VM_NAME" | grep "Config file:" | awk '{print $3}' | xargs dirname)
DISK_FILE="$VM_DIR/${VM_NAME}.vdi"

VBoxManage createhd --filename "$DISK_FILE" --size "$STORAGE_GB" --format VDI || {
    error "Failed to create disk"
    VBoxManage unregistervm "$VM_NAME" --delete
    exit 1
}

log "Attaching storage controller..."
VBoxManage storagectl "$VM_NAME" --name "SATA Controller" --add sata --controller IntelAHCI || {
    error "Failed to add storage controller"
    VBoxManage unregistervm "$VM_NAME" --delete
    exit 1
}

log "Attaching disk to VM..."
VBoxManage storageattach "$VM_NAME" --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium "$DISK_FILE" || {
    error "Failed to attach disk"
    VBoxManage unregistervm "$VM_NAME" --delete
    exit 1
}

# Configure network (NAT by default)
log "Configuring network adapter..."
VBoxManage modifyvm "$VM_NAME" --nic1 nat || {
    error "Failed to configure network"
    VBoxManage unregistervm "$VM_NAME" --delete
    exit 1
}

# Enable audio (optional)
VBoxManage modifyvm "$VM_NAME" --audio none

# Set boot order (hard disk first)
VBoxManage modifyvm "$VM_NAME" --boot1 disk --boot2 none --boot3 none --boot4 none

log "VM '$VM_NAME' created successfully!"
log "Note: You need to install the OS manually or use an ISO image"
log "To start the VM: VBoxManage startvm '$VM_NAME' --type headless"

exit 0

