#!/bin/bash
set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo ./testdisk.sh"
  exit 1
fi

command -v losetup >/dev/null 2>&1 || { echo >&2 "losetup is required but not installed. Aborting."; exit 1; }

IMG="testdisk.img"
SIZE="8G"

# Clean up any loop devices referencing deleted files
for loopdev in $(losetup | grep '(deleted)' | cut -d':' -f1); do
    echo "Detaching stale deleted loop device: $loopdev"
    losetup -d "$loopdev"
done

# 0. Unmount and detach any previous mount/loop for this image
LOOPDEV=$(losetup -j "$IMG" | awk -F: '{print $1}')
if [ -n "$LOOPDEV" ]; then
    # Try to unmount any partitions that might be mounted
    for part in $(ls ${LOOPDEV}* 2>/dev/null); do
        MNT=$(mount | grep "^$part " | awk '{print $3}')
        if [ -n "$MNT" ]; then
            echo "Unmounting $part from $MNT"
            umount "$part"
        fi
    done
    echo "Detaching $LOOPDEV"
    losetup -d "$LOOPDEV"
fi

# 1. Delete the image if it exists
if [ -f "$IMG" ]; then
    echo "Deleting old $IMG"
    rm -f "$IMG"
fi

# 2. Create the image
echo "Creating $SIZE disk image: $IMG"
fallocate -l $SIZE "$IMG"

# 3. Attach to a loop device
LOOPDEV=$(losetup --find --show "$IMG")
echo "Attached $IMG to $LOOPDEV"
echo "Raw test disk attached at $LOOPDEV (no partition table, no filesystem)."