import React, { useState, useEffect } from 'react';
import { PartitionBlock } from '@/lib/diskUtils';

interface PartitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PartitionFormData) => void;
  block?: PartitionBlock; // If provided, we're editing; otherwise, creating
  maxSizeBytes: number; // Maximum available size (the entire unallocated block size)
}

export interface PartitionFormData {
  sizeBytes: number;
  fsType: string;
  label: string;
  purpose: string;
}

const FILESYSTEM_TYPES = [
  { id: 'ext4', name: 'ext4', description: 'Linux filesystem', color: 'bg-[#9ece6a]' },
  { id: 'ntfs', name: 'NTFS', description: 'Windows filesystem', color: 'bg-[#7aa2f7]' },
  { id: 'fat32', name: 'FAT32', description: 'Universal compatibility', color: 'bg-[#bb9af7]' },
  { id: 'exfat', name: 'exFAT', description: 'Enhanced FAT', color: 'bg-[#f7768e]' },
  { id: 'swap', name: 'swap', description: 'Linux swap space', color: 'bg-[#e0af68]' },
];

const OS_PURPOSES = [
  { id: 'linux', name: 'Linux OS', description: 'For Linux installations' },
  { id: 'windows', name: 'Windows OS', description: 'For Windows installations' },
  { id: 'macos', name: 'macOS', description: 'For macOS installations' },
  { id: 'data', name: 'Data', description: 'For general data storage' },
  { id: 'iso_storage', name: 'ISO Storage', description: 'For storing bootable ISO images' },
  { id: 'boot', name: 'Boot', description: 'Boot partition (ESP)' },
  { id: 'recovery', name: 'Recovery', description: 'Recovery partition' },
];

// Format bytes to human-readable size
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const PartitionModal: React.FC<PartitionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  block,
  maxSizeBytes
}) => {
  // Initialize form with default values or block values if editing
  const [formData, setFormData] = useState<PartitionFormData>({
    sizeBytes: block?.sizeBytes || maxSizeBytes,
    fsType: block?.fsType || 'ext4',
    label: block?.label || 'New Partition',
    purpose: 'data',
  });

  // Reset form when modal opens/closes or block changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        sizeBytes: block?.sizeBytes || maxSizeBytes,
        fsType: block?.fsType || 'ext4',
        label: block?.label || 'New Partition',
        purpose: 'data',
      });
    }
  }, [isOpen, block, maxSizeBytes]);

  // Calculate percentage of total size
  const sizePercentage = (formData.sizeBytes / maxSizeBytes) * 100;

  // Handle size change via percentage slider
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value);
    const newSizeBytes = Math.floor((percentage / 100) * maxSizeBytes);
    setFormData({ ...formData, sizeBytes: newSizeBytes });
  };

  // Handle filesystem type selection
  const handleFsTypeChange = (fsType: string) => {
    // Auto-suggest purpose based on filesystem
    let suggestedPurpose = formData.purpose;
    if (fsType === 'ext4') suggestedPurpose = 'linux';
    else if (fsType === 'ntfs') suggestedPurpose = 'windows';
    else if (fsType === 'fat32') suggestedPurpose = 'boot';
    else if (fsType === 'exfat') suggestedPurpose = 'iso_storage';
    
    setFormData({ ...formData, fsType, purpose: suggestedPurpose });
  };

  // Handle purpose selection
  const handlePurposeChange = (purpose: string) => {
    // Auto-suggest filesystem based on purpose
    let suggestedFsType = formData.fsType;
    if (purpose === 'linux') suggestedFsType = 'ext4';
    else if (purpose === 'windows') suggestedFsType = 'ntfs';
    else if (purpose === 'boot') suggestedFsType = 'fat32';
    else if (purpose === 'iso_storage') suggestedFsType = 'exfat';
    
    setFormData({ ...formData, purpose, fsType: suggestedFsType });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1b26] border border-[#293256] rounded-lg w-full max-w-xl mx-4 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="border-b border-[#293256] px-6 py-4">
          <h3 className="text-lg font-semibold text-[#c0caf5]">
            {block ? 'Edit Partition' : 'Create New Partition'}
          </h3>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="px-6 py-4 space-y-5">
            {/* Size selector */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-[#a9b1d6]">Size</label>
                <span className="text-sm font-mono text-[#7aa2f7]">
                  {formatBytes(formData.sizeBytes)} ({sizePercentage.toFixed(1)}%)
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={sizePercentage}
                onChange={handleSizeChange}
                className="w-full h-2 bg-[#24283b] rounded-lg appearance-none cursor-pointer accent-[#7aa2f7]"
              />
              <div className="flex justify-between text-xs text-[#565a6e]">
                <span>10%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Filesystem selector */}
            <div className="space-y-2">
              <label className="text-sm text-[#a9b1d6]">Filesystem Type</label>
              <div className="grid grid-cols-2 gap-2">
                {FILESYSTEM_TYPES.map((fs) => (
                  <div
                    key={fs.id}
                    className={`flex items-center p-3 rounded-md border cursor-pointer transition-all ${formData.fsType === fs.id ? 'border-[#7aa2f7] bg-[#3d59a1]/20' : 'border-[#293256] hover:border-[#3d59a1]'}`}
                    onClick={() => handleFsTypeChange(fs.id)}
                  >
                    <div className={`w-3 h-10 rounded mr-3 ${fs.color}`}></div>
                    <div>
                      <div className="font-medium text-[#c0caf5]">{fs.name}</div>
                      <div className="text-xs text-[#a9b1d6]">{fs.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Partition purpose */}
            <div className="space-y-2">
              <label className="text-sm text-[#a9b1d6]">Partition Purpose</label>
              <div className="grid grid-cols-2 gap-2">
                {OS_PURPOSES.map((purpose) => (
                  <div
                    key={purpose.id}
                    className={`p-3 rounded-md border cursor-pointer transition-all ${formData.purpose === purpose.id ? 'border-[#7aa2f7] bg-[#3d59a1]/20' : 'border-[#293256] hover:border-[#3d59a1]'}`}
                    onClick={() => handlePurposeChange(purpose.id)}
                  >
                    <div className="font-medium text-[#c0caf5]">{purpose.name}</div>
                    <div className="text-xs text-[#a9b1d6]">{purpose.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Partition label */}
            <div className="space-y-2">
              <label className="text-sm text-[#a9b1d6]">Partition Label</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full p-2.5 bg-[#24283b] border border-[#293256] rounded-md text-[#c0caf5] focus:border-[#7aa2f7] focus:outline-none"
                placeholder="Enter partition label"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#293256] px-6 py-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1f2335] text-[#a9b1d6] hover:bg-[#292e42] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#7aa2f7] text-white hover:bg-[#3d59a1] rounded-md transition-colors"
            >
              {block ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartitionModal;
