/**
 * Utility for OS detection from ISO filenames and mapping to devicon icons
 */

// Base URL for devicon SVGs
export const DEVICON_BASE_URL = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons';

// OS icon mapping - maps OS names to their devicon paths
export interface OSIconMapping {
  name: string;
  pattern: RegExp;
  iconPath: string;
  color: string;
  description?: string;
}

// OS detection patterns and their corresponding devicon paths
export const OS_MAPPINGS: OSIconMapping[] = [
  // Linux distributions
  { 
    name: 'Ubuntu', 
    pattern: /ubuntu|xubuntu|kubuntu|lubuntu/i, 
    iconPath: 'ubuntu/ubuntu-original.svg',
    color: '#E95420'
  },
  { 
    name: 'Debian', 
    pattern: /debian/i, 
    iconPath: 'debian/debian-original.svg',
    color: '#A81D33'
  },
  { 
    name: 'Arch Linux', 
    pattern: /arch|manjaro/i, 
    iconPath: 'archlinux/archlinux-original.svg',
    color: '#1793D1'
  },
  { 
    name: 'Fedora', 
    pattern: /fedora/i, 
    iconPath: 'fedora/fedora-original.svg',
    color: '#294172'
  },
  { 
    name: 'CentOS', 
    pattern: /centos/i, 
    iconPath: 'centos/centos-original.svg',
    color: '#262577'
  },
  { 
    name: 'openSUSE', 
    pattern: /opensuse|suse/i, 
    iconPath: 'opensuse/opensuse-original.svg',
    color: '#73BA25'
  },
  { 
    name: 'Linux Mint', 
    pattern: /mint/i, 
    iconPath: 'linux/linux-original.svg', // No specific Mint icon, using Linux
    color: '#87CF3E'
  },
  { 
    name: 'Elementary OS', 
    pattern: /elementary/i, 
    iconPath: 'linux/linux-original.svg', // No specific Elementary icon
    color: '#64BAFF'
  },
  { 
    name: 'Pop!_OS', 
    pattern: /pop[_\s]?os/i, 
    iconPath: 'linux/linux-original.svg', // No specific Pop OS icon
    color: '#48B9C7'
  },
  { 
    name: 'Kali Linux', 
    pattern: /kali/i, 
    iconPath: 'linux/linux-original.svg', // No specific Kali icon
    color: '#367BF0'
  },
  
  // Windows
  { 
    name: 'Windows 11', 
    pattern: /windows\s*11|win\s*11/i, 
    iconPath: 'windows8/windows8-original.svg',
    color: '#0078D4'
  },
  { 
    name: 'Windows 10', 
    pattern: /windows\s*10|win\s*10/i, 
    iconPath: 'windows8/windows8-original.svg',
    color: '#0078D4'
  },
  { 
    name: 'Windows', 
    pattern: /windows|win/i, 
    iconPath: 'windows8/windows8-original.svg',
    color: '#0078D4'
  },
  
  // Mac OS
  { 
    name: 'macOS', 
    pattern: /mac\s*os|macos|osx|mac\s*os\s*x/i, 
    iconPath: 'apple/apple-original.svg',
    color: '#999999'
  },
  
  // BSD variants
  { 
    name: 'FreeBSD', 
    pattern: /freebsd/i, 
    iconPath: 'freebsd/freebsd-original.svg',
    color: '#AB2B28'
  },
  
  // Default - generic Linux
  { 
    name: 'Linux', 
    pattern: /linux/i, 
    iconPath: 'linux/linux-original.svg',
    color: '#FCC624'
  },
];

/**
 * Detect OS from filename
 * @param filename ISO filename
 * @returns Detected OS mapping or null if not recognized
 */
export function detectOSFromFilename(filename: string): OSIconMapping | null {
  for (const mapping of OS_MAPPINGS) {
    if (mapping.pattern.test(filename)) {
      return mapping;
    }
  }
  return null;
}

/**
 * Get the full URL for an OS icon
 * @param osType OS type mapping
 * @returns Full URL to the icon
 */
export function getIconUrl(osType: OSIconMapping): string {
  return `${DEVICON_BASE_URL}/${osType.iconPath}`;
}

/**
 * Gets a corresponding icon for a filename
 * @param filename ISO filename
 * @returns Icon URL or null if not recognized
 */
export function getIconForFile(filename: string): string | null {
  const osType = detectOSFromFilename(filename);
  if (!osType) return null;
  return getIconUrl(osType);
}

/**
 * Gets or creates cache folder for storing icons
 * @returns Path to the icons cache folder
 */
export function getIconsCacheFolder(): string {
  // In a real app, use fs to create directory if it doesn't exist
  // Since this is a browser app, we'll use local storage or IndexedDB in actual implementation
  return '/icons-cache';
}

/**
 * Fetch and store icon based on filename
 * @param filename ISO filename 
 * @returns Local path to cached icon or null if couldn't fetch
 */
export async function fetchAndStoreIcon(filename: string): Promise<string | null> {
  const osType = detectOSFromFilename(filename);
  if (!osType) return null;
  
  const iconUrl = getIconUrl(osType);
  const cacheFolder = getIconsCacheFolder();
  const localPath = `${cacheFolder}/${osType.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
  
  try {
    // In a real implementation, we would:
    // 1. Fetch the SVG from the URL using fetch()
    // 2. Store it locally using file system or IndexedDB
    // 3. Return the local path
    // For now we'll just return the URL directly
    return iconUrl;
  } catch (error) {
    console.error('Failed to fetch icon:', error);
    return null;
  }
}
