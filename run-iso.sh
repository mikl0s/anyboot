#!/bin/bash

# Script to run the latest built ISO with QEMU and bridged networking

ISO_PATH="live-build-config/live-image-amd64.hybrid.iso"
MEMORY=4096

# Name of the TAP interface to use for bridging
TAP_IF="tap0"
BRIDGE_IF="br0"

# Check if the ISO exists
if [ ! -f "$ISO_PATH" ]; then
  echo "ISO not found: $ISO_PATH"
  exit 1
fi

# Ensure the bridge exists (user may need to set this up beforehand)
if ! ip link show "$BRIDGE_IF" &>/dev/null; then
  echo "Bridge interface $BRIDGE_IF does not exist. Please create it before running this script."
  exit 1
fi

# Create a tap device if it does not exist
if ! ip link show "$TAP_IF" &>/dev/null; then
  sudo ip tuntap add dev "$TAP_IF" mode tap
  sudo ip link set "$TAP_IF" master "$BRIDGE_IF"
  sudo ip link set "$TAP_IF" up
fi

# Run QEMU with bridged networking
sudo qemu-system-x86_64 \
  -cdrom "$ISO_PATH" \
  -m $MEMORY \
  -boot d \
  -enable-kvm \
  -vga std \
  -netdev tap,id=net0,ifname=$TAP_IF,script=no,downscript=no \
  -device e1000,netdev=net0

# Optionally, bring down the tap device after exit
# sudo ip link set "$TAP_IF" down
# sudo ip tuntap del dev "$TAP_IF" mode tap
