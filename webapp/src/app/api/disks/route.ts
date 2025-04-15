import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import { LsblkOutput } from '@/lib/diskUtils';

// Load environment variables
const DEV_MODE = process.env.DEV_MODE === 'true';
console.log('DEV_MODE (server):', DEV_MODE);

// Promisify the exec function to use async/await
const execPromise = util.promisify(exec);

interface BlkidInfo {
  TYPE?: string;
  LABEL?: string;
  UUID?: string;
  PARTLABEL?: string;
  // Add other fields from blkid if needed
}

// Helper to parse blkid -o export output
const parseBlkidExport = (output: string): Map<string, BlkidInfo> => {
  const map = new Map<string, BlkidInfo>();
  let currentDevice: BlkidInfo | null = null;
  let currentDevName: string | null = null;

  output.split('\n').forEach(line => {
    line = line.trim();
    if (!line) {
      // End of a device block
      if (currentDevName && currentDevice) {
        map.set(currentDevName, currentDevice);
      }
      currentDevName = null;
      currentDevice = null;
      return;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) return; // Skip invalid lines

    const key = line.substring(0, separatorIndex);
    const value = line.substring(separatorIndex + 1);

    if (key === 'DEVNAME') {
        // If we encounter a new DEVNAME, save the previous one if any
        if (currentDevName && currentDevice) {
            map.set(currentDevName, currentDevice);
        }
        // Start new device
        currentDevName = value;
        currentDevice = {};
    } else if (currentDevice && ['TYPE', 'LABEL', 'UUID', 'PARTLABEL'].includes(key)) {
        currentDevice[key as keyof BlkidInfo] = value;
    }
  });

  // Add the last device if it exists
  if (currentDevName && currentDevice) {
    map.set(currentDevName, currentDevice);
  }

  return map;
};

// Helper to parse parted output
const parsePartedOutput = (output: string, deviceName: string) => {
  // Initialize with default values
  const result = {
    name: deviceName,
    model: 'Unknown',
    size: 0,
    sizeUnit: 'MiB',
    partitionTable: 'unknown',
    children: [] as any[]
  };
  
  const lines = output.split('\n').filter(line => line.trim().length > 0);
  
  // Parse disk information
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Model:')) {
      // Extract model name - Format: "Model: ATA Samsung SSD 980 PRO 1TB (nvme)"
      const modelMatch = line.match(/Model:\s*(.+?)\s*(?:\(|$)/);
      result.model = modelMatch ? modelMatch[1].trim() : 'Unknown';
    }
    else if (line.startsWith('Disk /dev/')) {
      // Extract disk size - Format: "Disk /dev/nvme0n1: 953870MiB"
      const sizeMatch = line.match(/Disk \/dev\/.*?:\s*(\d+(?:\.\d+)?)\s*(\w+)/);
      if (sizeMatch) {
        result.size = parseFloat(sizeMatch[1]);
        result.sizeUnit = sizeMatch[2];
      }
    }
    else if (line.startsWith('Partition Table:')) {
      // Extract partition table type - Format: "Partition Table: gpt"
      const tableMatch = line.match(/Partition Table:\s*(\w+)/);
      result.partitionTable = tableMatch ? tableMatch[1] : 'unknown';
    }
    else if (line.includes('Number') && line.includes('Start') && line.includes('End') && line.includes('Size')) {
      // This is the partition table header - the next lines will be partitions
      const partitionLines = [];
      i++; // Move to the first partition line
      
      // Collect all partition lines
      while (i < lines.length && lines[i].trim().length > 0) {
        // Check if this line starts with a number (partition number)
        if (/^\s*\d+\s/.test(lines[i])) {
          partitionLines.push(lines[i]);
        }
        i++;
      }
      
      // Parse each partition line
      result.children = partitionLines.map(partLine => {
        // Format: " 1      1,00MiB  101MiB    100MiB     fat32           EFI system partition          boot, esp"
        // [Number] [Start] [End] [Size] [Filesystem] [Name] [Flags]
        const parts = partLine.trim().split(/\s+/);
        
        // Handle case where some fields might be empty
        let number = parseInt(parts[0]);
        let start = parts[1].replace(',', '.'); // Convert comma to period for decimal
        let end = parts[2].replace(',', '.'); // Convert comma to period for decimal
        let size = parts[3].replace(',', '.'); // Convert comma to period for decimal
        
        // Get the filesystem and name portions which might contain spaces
        let filesystem = '';
        let name = '';
        let flags = '';
        
        // The filesystem can be empty or have a name, need to detect position
        let position = 4;
        if (position < parts.length && !parts[position].includes('partition') && 
            !parts[position].includes('reserved')) {
          filesystem = parts[position];
          position++;
        }
        
        // Collect the name - might be multiple words
        let nameStart = position;
        while (position < parts.length && 
               !['boot', 'esp', 'msftdata', 'msftres', 'hidden', 'raid', 'lvm', 'swap', 'diag'].includes(parts[position])) {
          position++;
        }
        if (position > nameStart) {
          name = parts.slice(nameStart, position).join(' ');
        }
        
        // The remaining parts are flags
        if (position < parts.length) {
          flags = parts.slice(position).join(' ');
        }
        
        // Extract the size number and unit - handle both formats: "100MiB" and "16.0MiB"
        const sizeMatch = size.match(/(\d+(?:\.\d+)?)(\w+)/);
        let sizeNumber = sizeMatch ? parseFloat(sizeMatch[1]) : 0;
        const sizeUnit = sizeMatch ? sizeMatch[2] : 'MiB';
        
        // If size is zero but we have start/end values, calculate the size
        if (sizeNumber === 0) {
          const startMatch = start.match(/(\d+(?:\.\d+)?)(\w+)/);
          const endMatch = end.match(/(\d+(?:\.\d+)?)(\w+)/);
          
          if (startMatch && endMatch && startMatch[2] === endMatch[2]) {
            const startVal = parseFloat(startMatch[1]);
            const endVal = parseFloat(endMatch[1]);
            sizeNumber = endVal - startVal;
          }
        }
        
        // Convert to a common unit (bytes)
        const sizeBytes = convertToBytes(sizeNumber, sizeUnit);
        
        // Format for our application
        return {
          number,
          name: `${deviceName}${number}`, // e.g., nvme0n1p1
          partitionLabel: name,
          start,
          end,
          size,
          sizeBytes,
          filesystem,
          flags
        };
      });
    }
  }
  
  return result;
};

// Helper to convert size units to bytes
const convertToBytes = (size: number, unit: string): number => {
  const units: Record<string, number> = {
    'B': 1,
    'KiB': 1024,
    'MiB': 1024 * 1024,
    'GiB': 1024 * 1024 * 1024,
    'TiB': 1024 * 1024 * 1024 * 1024,
    'KB': 1000,
    'MB': 1000 * 1000,
    'GB': 1000 * 1000 * 1000,
    'TB': 1000 * 1000 * 1000 * 1000
  };
  
  // Make sure to match units case-insensitively
  const normalizedUnit = Object.keys(units).find(u => 
    u.toLowerCase() === unit.toLowerCase()
  ) || 'MiB';
  
  return size * units[normalizedUnit];
};

/**
 * Handles GET requests to fetch disk information using parted and blkid
 */
export async function GET() {
  try {
    // 1. Get list of disk devices using lsblk (just for the list of devices)
    const { stdout: lsblkStdout } = await execPromise('lsblk -d -o NAME -n');
    const diskDevices = lsblkStdout.split('\n')
      .filter(line => line.trim())
      .map(line => line.trim())
      // Only filter out loop devices if not in dev mode
      .filter(name => DEV_MODE ? true : !name.startsWith('loop'));
    
    // 2. Run parted on each device to get detailed information
    const disksData = await Promise.all(diskDevices.map(async (device) => {
      try {
        const { stdout } = await execPromise(`sudo parted -s /dev/${device} unit MiB print`);
        return parsePartedOutput(stdout, device);
      } catch (error: unknown) {
        // If the error is 'unrecognised disk label', treat as empty new disk
        if (typeof error === 'object' && error !== null && 'stderr' in error && typeof (error as any).stderr === 'string' && (error as any).stderr.includes('unrecognised disk label')) {
          // Dynamically get the disk size using lsblk
          try {
            const { stdout: sizeStdout } = await execPromise(`lsblk -b -dn -o SIZE /dev/${device}`);
            const sizeBytes = parseInt(sizeStdout.trim(), 10);
            return {
              name: device,
              model: 'Unknown',
              size: sizeBytes,
              sizeUnit: 'B',
              partitionTable: 'unknown',
              children: []
            };
          } catch (lsblkError) {
            console.warn(`Could not get size for /dev/${device}:`, lsblkError);
            // Fallback: show device with unknown size
            return {
              name: device,
              model: 'Unknown',
              size: 0,
              sizeUnit: 'B',
              partitionTable: 'unknown',
              children: []
            };
          }
        }
        console.warn(`Error running parted on /dev/${device}:`, error);
        return null;
      }
    }));
    
    // Filter out any null results from failed parted commands
    const validDisksData = disksData.filter(disk => disk !== null);
    
    // 3. Get filesystem information from blkid
    let blkidOutput = '';
    try {
      // Try with sudo first as it's more likely to succeed
      const { stdout } = await execPromise('sudo blkid -o export');
      blkidOutput = stdout;
    } catch (error) {
      console.warn('Error running blkid with sudo:', error);
      try {
        // Fallback to regular blkid
        const { stdout } = await execPromise('blkid -o export');
        blkidOutput = stdout;
      } catch (error) {
        console.warn('Error running blkid without sudo:', error);
      }
    }
    
    const blkidMap = parseBlkidExport(blkidOutput);
    
    // 4. Merge blkid info into parted data
    validDisksData.forEach(disk => {
      if (!disk) return;
      
      disk.children.forEach(partition => {
        const devName = `/dev/${partition.name}`;
        const blkidInfo = blkidMap.get(devName);
        
        if (blkidInfo) {
          partition.blkidInfo = blkidInfo;
          // If filesystem is not detected by parted but is by blkid
          if (!partition.filesystem && blkidInfo.TYPE) {
            partition.filesystem = blkidInfo.TYPE;
          }
          // If name is not detected but LABEL is available
          if (!partition.partitionLabel && blkidInfo.LABEL) {
            partition.partitionLabel = blkidInfo.LABEL;
          }
        }
      });
    });
    
    // 5. Convert to standard format for our application
    const blockdevices = validDisksData.map(disk => {
      if (!disk) return null;
      
      // Convert MiB to bytes for disk size
      const diskSizeBytes = convertToBytes(disk.size, disk.sizeUnit);
      
      return {
        name: disk.name,
        size: diskSizeBytes,
        type: 'disk',
        mountpoint: null,
        model: disk.model,
        vendor: 'Unknown',
        tran: disk.name.startsWith('nvme') ? 'nvme' : 'sata',
        children: disk.children.map(part => ({
          name: part.name,
          size: part.sizeBytes,
          type: 'part',
          mountpoint: null,
          model: null,
          vendor: null,
          tran: null,
          blkidInfo: part.blkidInfo || {},
          filesystem: part.filesystem,
          partitionLabel: part.partitionLabel,
          startMiB: part.start,
          endMiB: part.end,
          number: part.number,
          flags: part.flags
        }))
      };
    }).filter(Boolean);

    // Add debug info to help troubleshoot
    const debugInfo = {
      blkidAvailable: blkidOutput.length > 0,
      disksFound: blockdevices.length,
      timestamp: new Date().toISOString()
    };
    
    // Return the merged data with debug info
    return NextResponse.json({
      blockdevices,
      _debug: debugInfo
    });

  } catch (error: unknown) {
    console.error('Error fetching or processing disk data:', error);

    let errorMessage = 'Internal Server Error fetching disk data.';
    let statusCode = 500;

    if (typeof error === 'object' && error !== null) {
      if ('stderr' in error && typeof (error as any).stderr === 'string') {
        if ((error as any).stderr.includes('command not found')) {
          errorMessage = 'parted or lsblk command not found. Please ensure they are installed and available in the system PATH.';
          statusCode = 501;
        } else if ((error as any).stderr.includes('permission denied') || (error as any).stderr.includes('Operation not permitted')) {
          errorMessage = 'Permission denied executing commands. The backend process needs sudo permissions to read disk information.';
          statusCode = 403; // Forbidden
        }
      } 
      if (!errorMessage.startsWith('Permission denied') && error instanceof Error) {
        errorMessage = error.message; // Use generic error if not permission/not found
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
