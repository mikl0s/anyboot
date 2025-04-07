// src/lib/diskUtils.ts

// --- Interfaces ---

// Information potentially retrieved from blkid
export interface BlkidInfo {
  TYPE?: string;    // Filesystem type (e.g., ext4, ntfs, swap, LDM, linux_raid_member)
  LABEL?: string;   // Filesystem label
  UUID?: string;    // Filesystem UUID
  PARTLABEL?: string; // GPT partition label
  PARTUUID?: string; // GPT partition UUID
}

export interface Partition {
  id: string;        // Device name (e.g., sda1)
  name: string;      // Full path (e.g., /dev/sda1)
  type: string;      // Device type from lsblk (e.g., 'part')
  fsType: string | null; // Filesystem/Partition type determined primarily from blkid
  label: string | null; // Filesystem label or Partition label
  uuid: string | null; // Filesystem UUID or Partition UUID
  size: string;      // Formatted size string (e.g., 100 GB)
  sizeBytes: number; // Original size in bytes
  mountPoint?: string; // Mount point if mounted
}

export interface Disk {
  id: string;        // Device name (e.g., sda)
  name: string;      // Full path (e.g., /dev/sda)
  model: string;
  vendor: string;
  tran: string;      // Transport type (e.g., nvme, sata, usb)
  size: string;      // Formatted size string
  sizeBytes: number; // Original size in bytes
  type: 'SSD' | 'HDD' | 'NVMe' | 'Unknown'; // Inferred or default
  partitions: Partition[];
}

export interface PartitionBlock extends Partition {
  isAllocated: boolean;
  originalId: string | null;
}

// Type for the raw blockdevice object from lsblk JSON output
// Now including the potentially added blkidInfo
interface LsblkDevice {
  name: string;
  size: number | null;
  type: string; // disk, part, loop, etc.
  mountpoint: string | null;
  model: string | null;
  vendor: string | null;
  tran: string | null;
  // fstype from lsblk is no longer primary, we rely on blkidInfo
  children?: LsblkDevice[];
  blkidInfo?: BlkidInfo; // <-- Blkid info is added here by the API
}

// Type for the top-level lsblk JSON structure
export interface LsblkOutput {
  blockdevices: LsblkDevice[];
}

// --- Helper Functions ---

// Helper to format bytes into KB, MB, GB, TB
export const formatBytes = (bytes: number | null, decimals = 2): string => {
  if (bytes === null || bytes === undefined || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.max(0, Math.floor(Math.log(bytes) / Math.log(k)));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Function to transform combined lsblk/blkid output to our Disk[] structure
export const transformLsblkData = (data: LsblkOutput): Disk[] => {
  if (!data || !data.blockdevices) {
    console.warn('Invalid lsblk data received for transformation');
    return [];
  }
  return data.blockdevices
    .filter(device => device.type === 'disk')
    .map(diskDevice => {
      const sizeBytes = diskDevice.size ?? 0;
      let inferredType: Disk['type'] = 'Unknown';
      if (diskDevice.tran === 'nvme') inferredType = 'NVMe';
      else if (diskDevice.tran === 'sata' || diskDevice.tran === 'ata') inferredType = 'SSD';
      else if (diskDevice.tran === 'usb') inferredType = 'Unknown';

      const partitions = (diskDevice.children ?? [])
        .filter(partDevice => partDevice.type === 'part')
        .map(partDevice => {
          const partSizeBytes = partDevice.size ?? 0;
          const blkid = partDevice.blkidInfo; // Get the blkid info added by the API

          // Determine the best type, label, and UUID from blkid or fallback
          const fsType = blkid?.TYPE || null; // Prioritize blkid TYPE
          const label = blkid?.LABEL || blkid?.PARTLABEL || null;
          const uuid = blkid?.UUID || blkid?.PARTUUID || null;

          return {
            id: partDevice.name,
            name: `/dev/${partDevice.name}`,
            type: partDevice.type, // Keep this as the lsblk device type ('part')
            fsType: fsType,       // Use the determined filesystem/partition type
            label: label,         // Use the determined label
            uuid: uuid,           // Use the determined UUID
            size: formatBytes(partSizeBytes),
            sizeBytes: partSizeBytes,
            mountPoint: partDevice.mountpoint ?? undefined,
          };
        });

      return {
        id: diskDevice.name,
        name: `/dev/${diskDevice.name}`,
        model: diskDevice.model ?? 'N/A',
        vendor: diskDevice.vendor ?? 'N/A',
        tran: diskDevice.tran ?? 'N/A',
        size: formatBytes(sizeBytes),
        sizeBytes: sizeBytes,
        type: inferredType,
        partitions: partitions,
      };
    });
};

// Helper to calculate partition blocks including unallocated space
export const calculateBlocks = (partitions: Partition[], diskSizeBytes: number): PartitionBlock[] => {
  const blocks: PartitionBlock[] = [];
  
  // Sort partitions by device number to maintain order
  const sortedPartitions = [...partitions].sort((a, b) => {
    const aNum = parseInt(a.id.replace(/^\D+/, '')) || 0;
    const bNum = parseInt(b.id.replace(/^\D+/, '')) || 0;
    return aNum - bNum;
  });
  
  // Sum up actual partition sizes to check against disk size
  const totalPartitionBytes = sortedPartitions.reduce((sum, part) => sum + part.sizeBytes, 0);
  
  // If total partition size exceeds disk size, scale all partitions to fit
  let scaleFactor = 1;
  if (totalPartitionBytes > diskSizeBytes) {
    scaleFactor = diskSizeBytes / totalPartitionBytes;
    console.warn(`Total partition size (${formatBytes(totalPartitionBytes)}) exceeds disk size (${formatBytes(diskSizeBytes)}). Scaling by ${scaleFactor.toFixed(2)}`);
  }
  
  // Process each partition in order
  let usedBytes = 0;
  
  // If we have any partitions, add them with accurate sizes
  for (const partition of sortedPartitions) {
    // Apply scaling if necessary
    const scaledSize = Math.floor(partition.sizeBytes * scaleFactor);
    
    // Add the partition with scaled size if needed
    blocks.push({
      ...partition,
      sizeBytes: scaledSize, // Apply scaling if needed
      size: formatBytes(scaledSize), // Update the formatted size
      isAllocated: true,
      originalId: partition.id
    });
    
    usedBytes += scaledSize;
  }
  
  // Only add unallocated space at the end if there's a significant amount
  const remainingBytes = diskSizeBytes - usedBytes;
  if (remainingBytes > 1024 * 1024) { // Only show if more than 1MB
    blocks.push({
      id: `unallocated-end-${Date.now()}`,
      name: 'Unallocated',
      type: 'free',
      fsType: null,
      label: null,
      uuid: null,
      size: formatBytes(remainingBytes),
      sizeBytes: remainingBytes,
      isAllocated: false,
      originalId: null
    });
  }
  
  return blocks;
};
