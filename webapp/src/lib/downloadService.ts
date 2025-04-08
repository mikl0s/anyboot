/**
 * Service for managing ISO downloads and metadata
 */

import { detectOSFromFilename } from './osDetection';

export interface IsoMetadata {
  url: string;
  hash?: string;
  hashType?: 'md5' | 'sha1' | 'sha256' | 'sha512';
  name: string;
  description?: string;
  tags?: string[];
  addedAt: string;
  lastChecked?: string;
  size?: number;
  status: 'pending' | 'downloading' | 'complete' | 'failed' | 'verified' | 'verification_failed';
  progress?: number;
  osType?: string;
  error?: string;
}

// In a real implementation, this would use IndexedDB or another persistence solution
let isoMetadataStore: IsoMetadata[] = [];

/**
 * Start a download from a URL with optional verification
 */
export const downloadIso = async (downloadInfo: {
  url: string;
  hash?: string;
  hashType?: 'md5' | 'sha1' | 'sha256' | 'sha512';
  name?: string;
  description?: string;
  tags?: string[];
}): Promise<IsoMetadata> => {
  // Extract filename from URL
  const url = new URL(downloadInfo.url);
  const filename = url.pathname.split('/').pop() || 'unknown.iso';
  
  // Auto-detect OS if possible
  const detectedOs = detectOSFromFilename(filename);
  
  // Create metadata record
  const metadata: IsoMetadata = {
    url: downloadInfo.url,
    hash: downloadInfo.hash,
    hashType: downloadInfo.hashType,
    name: downloadInfo.name || filename.replace(/\.[^/.]+$/, ''),
    description: downloadInfo.description,
    tags: downloadInfo.tags,
    addedAt: new Date().toISOString(),
    status: 'pending',
    progress: 0,
    osType: detectedOs?.name,
  };
  
  // In a real implementation, we would:
  // 1. Start an actual download (likely using backend API)
  // 2. Monitor progress
  // 3. Verify hash when complete
  // 4. Update status accordingly
  
  // For now, we'll simulate it
  // Store in our simple store
  isoMetadataStore.push(metadata);
  
  // Return the metadata object that would normally come from the backend
  return metadata;
};

/**
 * Get all ISO metadata entries
 */
export const getIsoMetadata = (): IsoMetadata[] => {
  return isoMetadataStore;
};

/**
 * Verify a downloaded ISO against its hash
 */
export const verifyIsoHash = async (metadataId: string): Promise<boolean> => {
  // In a real implementation, this would:
  // 1. Load the file from storage
  // 2. Calculate the hash
  // 3. Compare to stored hash
  // 4. Update status
  
  // For now just return true
  return true;
};

/**
 * Check for updates to ISO URL (newer version available)
 */
export const checkIsoUpdates = async (metadataId: string): Promise<{
  hasUpdate: boolean,
  newUrl?: string,
  newVersion?: string
}> => {
  // In a real implementation, this would:
  // 1. Check the original URL for a newer version
  // 2. Return update information if found
  
  // For now just return no updates
  return { hasUpdate: false };
};
