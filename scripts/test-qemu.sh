#!/bin/bash
set -euo pipefail

ISO_PATH="${1:-live-build-config/anyboot.iso}"
TEST_IMAGE_NAME="anyboot-test.img"
TEST_IMAGE_SIZE="16G"
OVMF_CODE="/usr/share/ovmf/OVMF.fd" # Common path on Debian/Ubuntu
CPU_CORES="2"
MEMORY="4G"

# Check if ISO exists
if [ ! -f "$ISO_PATH" ]; then
    echo "Error: ISO file not found at '$ISO_PATH'" >&2
    echo "Please run 'make build' first." >&2
    exit 1
fi

# Check if OVMF exists
if [ ! -f "$OVMF_CODE" ]; then
    echo "Warning: OVMF firmware not found at '$OVMF_CODE'." >&2
    echo "UEFI boot might fail. Please install the 'ovmf' package." >&2
    # Attempt to continue without BIOS flag, QEMU might find it elsewhere or use legacy
    OVMF_PARAM=""
else
    OVMF_PARAM="-bios $OVMF_CODE"
fi

# Create the virtual USB disk image if it doesn't exist
if [ ! -f "$TEST_IMAGE_NAME" ]; then
    echo "Creating virtual USB disk image: $TEST_IMAGE_NAME ($TEST_IMAGE_SIZE)..."
    qemu-img create -f raw "$TEST_IMAGE_NAME" "$TEST_IMAGE_SIZE"
else
    echo "Using existing virtual USB disk image: $TEST_IMAGE_NAME"
fi


echo "Starting QEMU..."
echo "  ISO: $ISO_PATH"
echo "  USB Disk: $TEST_IMAGE_NAME"
echo "  Memory: $MEMORY"
echo "  CPU Cores: $CPU_CORES"

qemu-system-x86_64 \
    -enable-kvm \
    -m $MEMORY \
    -smp $CPU_CORES \
    -cpu host \
    -boot d \
    -cdrom "$ISO_PATH" \
    -drive if=none,id=usbstick,format=raw,file="$TEST_IMAGE_NAME" \
    -device usb-storage,drive=usbstick \
    -vga std \
    -display default \
    -usb \
    -device usb-tablet \
    -netdev bridge,id=net0,br=br0 \
    -device virtio-net-pci,netdev=net0 \
    -serial stdio \
    -d int,cpu_reset \
    $OVMF_PARAM

echo "QEMU instance finished."
