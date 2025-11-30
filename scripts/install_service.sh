#!/bin/bash

# Virtual Server Manager - Install Service Script
# This script installs a service on a running VM
# Usage: ./install_service.sh <vmname> <service>

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
SERVICE="$2"

# Validate arguments
if [ -z "$VM_NAME" ] || [ -z "$SERVICE" ]; then
    error "Usage: $0 <vmname> <service>"
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

log "Installing service '$SERVICE' on VM '$VM_NAME'..."

# Get VM IP address (if available)
# Note: This is a simplified approach. In production, you might need to
# use port forwarding or a more sophisticated method to access the VM
VM_IP=$(eval "$VBOXMANAGE guestproperty get \"$VM_NAME\" \"/VirtualBox/GuestInfo/Net/0/V4/IP\"" 2>/dev/null | awk '{print $2}')

if [ -z "$VM_IP" ] || [ "$VM_IP" == "value" ]; then
    warning "Could not determine VM IP address"
    warning "Service installation will be simulated"
    log "Service '$SERVICE' installation simulated for VM '$VM_NAME'"
    log "In production, this would SSH into the VM and install the service"
    exit 0
fi

log "VM IP address: $VM_IP"

# Service installation commands
# Note: This is a template. In production, you would SSH into the VM
# and execute the appropriate installation commands based on the OS

case "$SERVICE" in
    Nginx)
        log "Installing Nginx..."
        # Example: ssh user@$VM_IP "sudo apt-get update && sudo apt-get install -y nginx && sudo systemctl enable nginx && sudo systemctl start nginx"
        log "Nginx installation simulated"
        ;;
    MySQL)
        log "Installing MySQL..."
        # Example: ssh user@$VM_IP "sudo apt-get update && sudo apt-get install -y mysql-server && sudo systemctl enable mysql && sudo systemctl start mysql"
        log "MySQL installation simulated"
        ;;
    Docker)
        log "Installing Docker..."
        # Example: ssh user@$VM_IP "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo systemctl enable docker && sudo systemctl start docker"
        log "Docker installation simulated"
        ;;
    Apache)
        log "Installing Apache..."
        # Example: ssh user@$VM_IP "sudo apt-get update && sudo apt-get install -y apache2 && sudo systemctl enable apache2 && sudo systemctl start apache2"
        log "Apache installation simulated"
        ;;
    PostgreSQL)
        log "Installing PostgreSQL..."
        # Example: ssh user@$VM_IP "sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib && sudo systemctl enable postgresql && sudo systemctl start postgresql"
        log "PostgreSQL installation simulated"
        ;;
    *)
        error "Unknown service: $SERVICE"
        error "Supported services: Nginx, MySQL, Docker, Apache, PostgreSQL"
        exit 1
        ;;
esac

log "Service '$SERVICE' installation completed for VM '$VM_NAME'"
log "Note: In production, actual SSH commands would be executed here"

exit 0

