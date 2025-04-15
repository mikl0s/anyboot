#!/bin/bash
set -e

IMG="testdisk.img"
LOOPDEV=""
MOUNTPOINT="/mnt/testdisk"
SIZE="8G"

# 1. Create the image if it doesn't exist
if [ ! -f "$IMG" ]; then
    echo "Creating $SIZE disk image: $IMG"
    fallocate -l $SIZE "$IMG"
fi

# 2. Attach to a loop device if not already attached
LOOPDEV=$(losetup -j "$IMG" | awk -F: '{print $1}')
if [ -z "$LOOPDEV" ]; then
    LOOPDEV=$(sudo losetup --find --show "$IMG")
    echo "Attached $IMG to $LOOPDEV"
else
    echo "$IMG already attached to $LOOPDEV"
fi

# 3. Create a partition table and partition if none exists
if ! sudo fdisk -l "$LOOPDEV" | grep -q '^/dev/loop'; then
    echo "Creating a single partition on $LOOPDEV"
    echo -e "o\nn\np\n1\n\n\nw" | sudo fdisk "$LOOPDEV"
    sudo partprobe "$LOOPDEV"
fi

# 4. Find the partition device (e.g., /dev/loop0p1 or /dev/mapper/loop0p1)
PARTDEV=""
if [ -b "${LOOPDEV}p1" ]; then
    PARTDEV="${LOOPDEV}p1"
else
    # Try kpartx mapping
    sudo kpartx -av "$LOOPDEV" >/dev/null
    PARTDEV="/dev/mapper/$(basename $LOOPDEV)p1"
fi

# 5. Format the partition if not already formatted
if ! sudo blkid "$PARTDEV" >/dev/null 2>&1; then
    echo "Formatting $PARTDEV as ext4"
    sudo mkfs.ext4 "$PARTDEV"
fi

# 6. Create mount point if needed and mount
sudo mkdir -p "$MOUNTPOINT"
sudo mount "$PARTDEV" "$MOUNTPOINT"
echo "Mounted $PARTDEV at $MOUNTPOINT"

# 7. Show result
df -h "$MOUNTPOINT"
