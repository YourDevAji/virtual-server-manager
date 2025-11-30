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
    warning "VM '$VM_NAME' does not exist"
    exit 0
fi

log "Destroying VM: $VM_NAME"

# Get VM state
VM_STATE=$(eval "$VBOXMANAGE showvminfo \"$VM_NAME\" --machinereadable" | grep "VMState=" | cut -d'"' -f2)
log "Current VM state: $VM_STATE"

# Stop VM if it's running
if [ "$VM_STATE" == "running" ]; then
    log "Stopping VM..."
    eval "$VBOXMANAGE controlvm \"$VM_NAME\" acpipowerbutton" || {
        warning "Failed to gracefully stop VM, forcing power off..."
        eval "$VBOXMANAGE controlvm \"$VM_NAME\" poweroff" || {
            error "Failed to stop VM"
            exit 1
        }
    }
    
    # Wait for VM to stop (max 30 seconds)
    log "Waiting for VM to stop..."
    for i in {1..30}; do
        sleep 1
        CURRENT_STATE=$(eval "$VBOXMANAGE showvminfo \"$VM_NAME\" --machinereadable" | grep "VMState=" | cut -d'"' -f2)
        if [ "$CURRENT_STATE" != "running" ]; then
            log "VM stopped successfully"
            break
        fi
        if [ $i -eq 30 ]; then
            warning "VM did not stop within 30 seconds, forcing power off..."
            eval "$VBOXMANAGE controlvm \"$VM_NAME\" poweroff"
            sleep 2
        fi
    done
fi

# Get VM directory to delete disk files (before unregistering)
# Get the full config file path first
CONFIG_FILE=$(eval "$VBOXMANAGE showvminfo \"$VM_NAME\"" | grep "Config file:" | awk '{print $3}' | xargs | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

if [ -n "$CONFIG_FILE" ]; then
    # Extract directory from config file path
    VM_DIR_WIN=$(dirname "$CONFIG_FILE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    # Convert Windows path to Unix-style for Git Bash if needed
    if [[ "$VM_DIR_WIN" =~ ^[A-Z]: ]]; then
        VM_DIR=$(echo "$VM_DIR_WIN" | sed 's|\\|/|g' | sed 's|^\([A-Z]\):|/\1|' | tr '[:upper:]' '[:lower:]')
    else
        VM_DIR="$VM_DIR_WIN"
    fi
    
    log "VM directory: $VM_DIR_WIN"
    
    # Validate directory is not root
    if [ -n "$VM_DIR" ] && [ "$VM_DIR" != "/" ] && [ "$VM_DIR" != "C:" ] && [ "$VM_DIR" != "C:\\" ] && [ "$VM_DIR" != "/c" ]; then
        # Unregister and delete VM first (this removes the VM from VirtualBox)
        log "Unregistering VM..."
        eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete" || {
            error "Failed to unregister VM"
            exit 1
        }
        
        # Delete VM directory if it still exists (--delete should handle this, but we'll clean up just in case)
        if [ -d "$VM_DIR" ]; then
            log "Removing VM directory..."
            rm -rf "$VM_DIR" || {
                warning "Failed to remove VM directory: $VM_DIR"
                warning "You may need to remove it manually"
            }
        fi
    else
        # Invalid directory, but still try to unregister
        warning "Could not determine valid VM directory, proceeding with unregister only"
        log "Unregistering VM..."
        eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete" || {
            error "Failed to unregister VM"
            exit 1
        }
    fi
else
    # No config file found, just unregister
    warning "Could not find VM config file, proceeding with unregister only"
    log "Unregistering VM..."
    eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete" || {
        error "Failed to unregister VM"
        exit 1
    }
fi

log "VM '$VM_NAME' destroyed successfully!"
log "All associated files have been removed"

exit 0

