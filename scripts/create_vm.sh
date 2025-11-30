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
if eval "$VBOXMANAGE showvminfo \"$VM_NAME\"" &> /dev/null; then
    error "VM '$VM_NAME' already exists"
    exit 1
fi

# Get default VirtualBox VM folder (safe on Windows)
log "Getting VirtualBox default machine folder..."
DEFAULT_VM_DIR_RAW=$(eval "$VBOXMANAGE list systemproperties" | grep -i "Default machine folder" | cut -d: -f2- | xargs | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# Check if we got a valid directory
if [ -z "$DEFAULT_VM_DIR_RAW" ]; then
    error "Could not determine VirtualBox default machine folder"
    exit 1
fi

# Normalize the path - convert backslashes to forward slashes for consistency
DEFAULT_VM_DIR_WIN=$(echo "$DEFAULT_VM_DIR_RAW" | sed 's|\\|/|g')

# Validate it's not just a drive letter
if [[ "$DEFAULT_VM_DIR_WIN" =~ ^[A-Z]:/?$ ]] || [ "$DEFAULT_VM_DIR_WIN" == "/" ] || [ "$DEFAULT_VM_DIR_WIN" == "/c" ]; then
    error "Invalid default VM folder: '$DEFAULT_VM_DIR_WIN'. VirtualBox default folder appears to be set incorrectly."
    error "Please check your VirtualBox settings: File > Preferences > General > Default Machine Folder"
    exit 1
fi

log "Default VM folder: $DEFAULT_VM_DIR_WIN"

# Create the VM with explicit base folder to ensure proper directory structure
log "Creating VirtualBox VM..."
# Use --basefolder to ensure VM is created in the correct location
# VBoxManage accepts Windows paths with backslashes or forward slashes
eval "$VBOXMANAGE createvm --name \"$VM_NAME\" --ostype \"$OS_TYPE_ID\" --basefolder \"$DEFAULT_VM_DIR_WIN\" --register" || {
    error "Failed to create VM"
    exit 1
}

# Set memory
log "Setting memory to ${RAM_MB}MB..."
eval "$VBOXMANAGE modifyvm \"$VM_NAME\" --memory \"$RAM_MB\"" || {
    error "Failed to set memory"
    eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
    exit 1
}

# Set CPU cores
log "Setting CPU cores to $CPU_CORES..."
eval "$VBOXMANAGE modifyvm \"$VM_NAME\" --cpus \"$CPU_CORES\"" || {
    error "Failed to set CPU cores"
    eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
    exit 1
}

# Create and attach storage
log "Creating virtual disk (${STORAGE_GB}GB)..."
# Get VM directory from VM info (now that VM is created)
# Get the full config file path - handle different output formats
CONFIG_LINE=$(eval "$VBOXMANAGE showvminfo \"$VM_NAME\"" | grep -i "Config file:" | head -1)
log "Config file line: $CONFIG_LINE"

# Extract the path - try different methods
if [ -n "$CONFIG_LINE" ]; then
    # Method 1: Split on colon and space, take everything after
    CONFIG_FILE_RAW=$(echo "$CONFIG_LINE" | sed 's/.*Config file:[[:space:]]*//' | xargs | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    # If that didn't work, try awk
    if [ -z "$CONFIG_FILE_RAW" ]; then
        CONFIG_FILE_RAW=$(echo "$CONFIG_LINE" | awk -F': ' '{for(i=2;i<=NF;i++) printf "%s%s", (i>2?" ":""), $i; print ""}' | xargs | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    fi
fi

if [ -n "$CONFIG_FILE_RAW" ]; then
    log "VM config file: $CONFIG_FILE_RAW"
    
    # Extract directory from config file path
    # Handle both Windows (C:\...) and Unix (/...) paths
    if [[ "$CONFIG_FILE_RAW" =~ ^[A-Z]: ]]; then
        # Windows path: C:\Users\...\VM_NAME.vbox
        # Remove the filename to get directory - handle both / and \ separators
        VM_DIR_WIN=$(echo "$CONFIG_FILE_RAW" | sed 's|[/\\][^/\\]*$||')
        # Convert backslashes to forward slashes for Git Bash compatibility
        VM_DIR_WIN=$(echo "$VM_DIR_WIN" | sed 's|\\|/|g')
    elif [[ "$CONFIG_FILE_RAW" =~ ^/ ]]; then
        # Unix-style path or Git Bash converted path (/c/Users/...)
        VM_DIR_WIN=$(dirname "$CONFIG_FILE_RAW")
    else
        # Unknown format, try dirname anyway
        VM_DIR_WIN=$(dirname "$CONFIG_FILE_RAW" 2>/dev/null || echo "")
    fi
    
    VM_DIR_WIN=$(echo "$VM_DIR_WIN" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    log "VM directory from config: $VM_DIR_WIN"
    
    # Validate the extracted directory - if invalid, use default folder
    if [[ -z "$VM_DIR_WIN" ]] || [[ "$VM_DIR_WIN" =~ ^[A-Z]:/?$ ]] || [ "$VM_DIR_WIN" == "/" ] || [ "$VM_DIR_WIN" == "/c" ]; then
        log "Extracted directory is invalid, using default folder instead"
        VM_DIR_WIN="$DEFAULT_VM_DIR_WIN/$VM_NAME"
        VM_DIR_WIN=$(echo "$VM_DIR_WIN" | sed 's|\\|/|g')
        log "Using default folder: $VM_DIR_WIN"
    fi
else
    # Fallback: construct from default folder
    log "Could not get config file, using default folder"
    VM_DIR_WIN="$DEFAULT_VM_DIR_WIN/$VM_NAME"
    # Normalize path separators
    VM_DIR_WIN=$(echo "$VM_DIR_WIN" | sed 's|\\|/|g')
    log "Using constructed VM directory: $VM_DIR_WIN"
fi

# Validate directory - check for common invalid values
if [ -z "$VM_DIR_WIN" ]; then
    error "VM directory is empty. Cannot create disk."
    error "Config file was: $CONFIG_FILE_RAW"
    error "Default VM folder was: $DEFAULT_VM_DIR_WIN"
    eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
    exit 1
fi

# Check for root directory patterns (Windows and Unix)
# Match patterns like: C:, C:\, /, /c, etc.
if [[ "$VM_DIR_WIN" =~ ^[A-Z]:/?$ ]] || [ "$VM_DIR_WIN" == "/" ] || [ "$VM_DIR_WIN" == "/c" ] || [ "$VM_DIR_WIN" == "C:" ] || [ "$VM_DIR_WIN" == "C:/" ] || [ "$VM_DIR_WIN" == "C:\\" ]; then
    error "Invalid VM directory: '$VM_DIR_WIN'. Cannot create disk in root directory."
    error "Default VM folder was: $DEFAULT_VM_DIR_WIN"
    error "Config file was: $CONFIG_FILE_RAW"
    error "Attempting to use default folder instead..."
    
    # Try to use default folder as fallback
    if [ -n "$DEFAULT_VM_DIR_WIN" ]; then
        VM_DIR_WIN="$DEFAULT_VM_DIR_WIN/$VM_NAME"
        VM_DIR_WIN=$(echo "$VM_DIR_WIN" | sed 's|\\|/|g')
        log "Using fallback VM directory: $VM_DIR_WIN"
        
        # Validate the fallback
        if [[ "$VM_DIR_WIN" =~ ^[A-Z]:/?$ ]] || [ "$VM_DIR_WIN" == "/" ] || [ "$VM_DIR_WIN" == "/c" ]; then
            error "Fallback directory is also invalid: $VM_DIR_WIN"
            eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
            exit 1
        fi
    else
        error "No valid VM directory available"
        eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
        exit 1
    fi
fi

# Convert to Windows format for VBoxManage (if needed)
# VBoxManage on Windows prefers backslashes, but accepts forward slashes
VM_DIR_WIN_FOR_VBOX=$(echo "$VM_DIR_WIN" | sed 's|/|\\|g')

# Ensure the directory exists (VirtualBox should have created it, but verify)
# Check using forward slashes for Git Bash
if [ ! -d "$VM_DIR_WIN" ]; then
    log "VM directory does not exist, creating it..."
    mkdir -p "$VM_DIR_WIN" || {
        error "Failed to create VM directory: $VM_DIR_WIN"
        eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
        exit 1
    }
fi

# Construct disk file path (use Windows format with backslashes for VBoxManage)
DISK_FILE_WIN="$VM_DIR_WIN_FOR_VBOX\\$VM_NAME.vdi"
log "Disk file will be created at: $DISK_FILE_WIN"

# Create disk using Windows path format (VBoxManage handles both formats)
eval "$VBOXMANAGE createhd --filename \"$DISK_FILE_WIN\" --size \"$STORAGE_GB\" --format VDI" || {
    error "Failed to create disk"
    error "Attempted path: $DISK_FILE_WIN"
    eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
    exit 1
}

log "Attaching storage controller..."
eval "$VBOXMANAGE storagectl \"$VM_NAME\" --name \"SATA Controller\" --add sata --controller IntelAHCI" || {
    error "Failed to add storage controller"
    eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
    exit 1
}

log "Attaching disk to VM..."
eval "$VBOXMANAGE storageattach \"$VM_NAME\" --storagectl \"SATA Controller\" --port 0 --device 0 --type hdd --medium \"$DISK_FILE_WIN\"" || {
    error "Failed to attach disk"
    eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
    exit 1
}

# Configure network (NAT by default)
log "Configuring network adapter..."
eval "$VBOXMANAGE modifyvm \"$VM_NAME\" --nic1 nat" || {
    error "Failed to configure network"
    eval "$VBOXMANAGE unregistervm \"$VM_NAME\" --delete"
    exit 1
}

# Enable audio (optional)
eval "$VBOXMANAGE modifyvm \"$VM_NAME\" --audio none"

# Set boot order (hard disk first)
eval "$VBOXMANAGE modifyvm \"$VM_NAME\" --boot1 disk --boot2 none --boot3 none --boot4 none"

log "VM '$VM_NAME' created successfully!"
log "Note: You need to install the OS manually or use an ISO image"
log "To start the VM: eval \"$VBOXMANAGE startvm \"$VM_NAME\" --type headless\""

exit 0

