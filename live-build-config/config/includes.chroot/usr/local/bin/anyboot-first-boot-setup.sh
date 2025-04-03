#!/bin/bash
set -e

LOG_FILE="/var/log/anyboot-first-boot.log"
MARKER_FILE="/etc/anyboot-persistence-configured"

echo "$(date): AnyBoot First Boot Setup Script Started." >> $LOG_FILE

# Check if persistence is already configured
if [ -f "$MARKER_FILE" ]; then
    echo "$(date): Persistence already configured. Exiting." >> $LOG_FILE
    exit 0
fi

echo "$(date): Persistence not configured. Running setup..." >> $LOG_FILE

# --- PLACEHOLDER --- 
# This is where the main logic will go:
# 1. Detect the USB drive device (e.g., find drive matching ISO volume ID or label)
#    - Example: TARGET_DEV=$(findfs LABEL=AnyBoot_Live | sed 's/[0-9]*$//')
#    - Needs robust checking!
# 2. Prompt user via GUI/TUI (if interactive) or use predefined config
# 3. Unmount existing partitions on the target USB drive
# 4. Wipe partition table (e.g., using wipefs, sgdisk)
# 5. Create partitions using parted/sgdisk:
#    - Partition 1 (ESP): FAT32, ~512MB, boot/esp flags
#    - Partition 2 (System): ext4, ~4GB, label=persistence-system
#    - Partition 3 (MongoDB): ext4, ~1GB, label=persistence-mongo
#    - Partition 4 (Data): exFAT, Remainder, label=persistence-data
# 6. Format partitions (mkfs.fat, mkfs.ext4, mkfs.exfat)
# 7. Mount the new System partition temporarily
# 8. Create persistence.conf file on the System partition:
#    - echo "/ union" > /mnt/temp-system/persistence.conf
# 9. Create directories for other persistence mount points on System partition
#    - mkdir -p /mnt/temp-system/mongodb /mnt/temp-system/data
# 10. Unmount temp System partition
# 11. Create marker file to prevent re-running
# 12. Trigger a reboot or inform user to reboot

echo "TODO: Implement USB detection and partitioning logic here." >> $LOG_FILE
sleep 5 # Simulate work

# --- END PLACEHOLDER ---

# Create marker file upon successful (simulated) completion
touch "$MARKER_FILE"
echo "$(date): (Simulated) Persistence setup complete. Marker file created." >> $LOG_FILE
echo "$(date): Please reboot for persistence to take effect." >> $LOG_FILE

# Optional: Trigger a reboot automatically after a delay
# ( sleep 10 && systemctl reboot ) &

exit 0
