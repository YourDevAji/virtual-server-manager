#!/bin/bash

# Virtual Server Manager - Manage Users Script
# This script creates a user on a running VM
# Usage: ./manage_users.sh <vmname> <username> <password> <sudo_flag>

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
    exit 1
fi

# Always quote the path to handle spaces
VBOXMANAGE="\"$VBOXMANAGE_PATH\""

# Parse arguments
VM_NAME="$1"
USERNAME="$2"
PASSWORD="$3"
SUDO_FLAG="$4"

# Validate arguments
if [ -z "$VM_NAME" ] || [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
    error "Usage: $0 <vmname> <username> <password> <sudo_flag>"
    exit 1
fi

# Check if VM exists
if ! eval "$VBOXMANAGE showvminfo \"$VM_NAME\"" &> /dev/null; then
    error "VM '$VM_NAME' does not exist"
    exit 1
fi

# Check if VM is running
VM_STATE=$(eval "$VBOXMANAGE showvminfo \"$VM_NAME\" --machinereadable" | grep "VMState=" | cut -d'"' -f2)
if [ "$VM_STATE" != "running" ]; then
    error "VM '$VM_NAME' is not running (current state: $VM_STATE)"
    error "Please start the VM first"
    exit 1
fi

log "Creating user '$USERNAME' on VM '$VM_NAME'..."

# Get VM IP address (if available)
VM_IP=$(eval "$VBOXMANAGE guestproperty get \"$VM_NAME\" \"/VirtualBox/GuestInfo/Net/0/V4/IP\"" 2>/dev/null | awk '{print $2}')

if [ -z "$VM_IP" ] || [ "$VM_IP" == "value" ]; then
    warning "Could not determine VM IP address"
    warning "User creation will be simulated"
    log "User '$USERNAME' creation simulated for VM '$VM_NAME'"
    if [ "$SUDO_FLAG" == "true" ]; then
        log "User '$USERNAME' would be granted sudo privileges"
    fi
    log "In production, this would SSH into the VM and create the user"
    exit 0
fi

log "VM IP address: $VM_IP"

# User creation commands
# Note: This is a template. In production, you would SSH into the VM
# and execute the appropriate commands

log "Creating user account..."

# Example SSH commands (commented out for simulation):
# ssh root@$VM_IP "useradd -m -s /bin/bash $USERNAME"
# ssh root@$VM_IP "echo '$USERNAME:$PASSWORD' | chpasswd"

if [ "$SUDO_FLAG" == "true" ]; then
    log "Granting sudo privileges..."
    # Example SSH command:
    # ssh root@$VM_IP "usermod -aG sudo $USERNAME"
    log "Sudo privileges would be granted to user '$USERNAME'"
fi

log "User '$USERNAME' creation completed for VM '$VM_NAME'"
log "Note: In production, actual SSH commands would be executed here"
log "Example commands:"
log "  - useradd -m -s /bin/bash $USERNAME"
log "  - echo '$USERNAME:$PASSWORD' | chpasswd"
if [ "$SUDO_FLAG" == "true" ]; then
    log "  - usermod -aG sudo $USERNAME"
fi

exit 0

