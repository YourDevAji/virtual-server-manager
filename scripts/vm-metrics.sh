#!/bin/bash

# Virtual Server Manager - VM Metrics Script
# Usage: ./vm-metrics.sh <name>

# Do not exit on error; always try to return some metrics.
set +e

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
    warning "VBoxManage is not installed or not in PATH; returning zero metrics"
    echo '{"cpu": 0.0, "ram_used": 0, "ram_total": 0}'
    exit 0
fi

VM_NAME="$1"

if [ -z "$VM_NAME" ]; then
    warning "No VM name provided; returning zero metrics"
    echo '{"cpu": 0.0, "ram_used": 0, "ram_total": 0}'
    exit 0
fi

if ! "$VBOXMANAGE_PATH" showvminfo "$VM_NAME" &> /dev/null; then
    warning "VM '$VM_NAME' does not exist; returning zero metrics"
    echo '{"cpu": 0.0, "ram_used": 0, "ram_total": 0}'
    exit 0
fi

# Get total RAM from VM definition (in MB)
TOTAL_RAM_MB=$("$VBOXMANAGE_PATH" showvminfo "$VM_NAME" --machinereadable | grep -i '^memory=' | cut -d'=' -f2 | tr -d '"')
if [ -z "$TOTAL_RAM_MB" ]; then
    TOTAL_RAM_MB=0
fi

# Query VBoxManage metrics for CPU and RAM usage.
# This requires that metrics be enabled in VirtualBox; if not, we just return zeros.
CPU_USER=0
CPU_KERNEL=0
RAM_USED_MB=0

METRICS_OUTPUT=$("$VBOXMANAGE_PATH" metrics query "$VM_NAME" CPU/Load/User,CPU/Load/Kernel,RAM/Usage/Used 2>/dev/null || true)

if [ -n "$METRICS_OUTPUT" ]; then
    # Example line format can vary; we try to extract numeric fields from the last line
    LAST_LINE=$(echo "$METRICS_OUTPUT" | tail -n 1)

    # Extract numbers (naively: grab all numbers and assume order: user kernel ramUsed)
    VALUES=($(echo "$LAST_LINE" | grep -Eo '[0-9]+(\.[0-9]+)?'))

    if [ ${#VALUES[@]} -ge 3 ]; then
        CPU_USER=${VALUES[0]}
        CPU_KERNEL=${VALUES[1]}
        RAM_USED_MB=${VALUES[2]}
    else
        warning "Could not parse metrics output: $LAST_LINE"
    fi
else
    warning "VBoxManage metrics not available; returning zero usage"
fi

CPU_TOTAL=$(python - <<EOF
user=$CPU_USER
kernel=$CPU_KERNEL
print(round(user + kernel, 1))
EOF
)

# Output JSON on stdout
printf '{"cpu": %.1f, "ram_used": %d, "ram_total": %d}\n' "$CPU_TOTAL" "$RAM_USED_MB" "$TOTAL_RAM_MB"

exit 0
