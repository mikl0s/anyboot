import React, { useState } from 'react';
import { FaDownload, FaLink, FaFingerprint, FaTags, FaInfoCircle } from 'react-icons/fa';

interface IsoDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (downloadInfo: IsoDownloadInfo) => void;
}

export interface IsoDownloadInfo {
  url: string;
  hash?: string;
  hashType?: 'md5' | 'sha1' | 'sha256' | 'sha512';
  name?: string;
  description?: string;
  tags?: string[];
}

const IsoDownloadModal: React.FC<IsoDownloadModalProps> = ({ isOpen, onClose, onDownload }) => {
  const [downloadInfo, setDownloadInfo] = useState<IsoDownloadInfo>({
    url: '',
    hash: '',
    hashType: 'sha256',
    name: '',
    description: '',
    tags: [],
  });
  
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Add a tag to the array
  const addTag = () => {
    if (!tagInput.trim()) return;
    
    setDownloadInfo(prev => ({
      ...prev,
      tags: [...(prev.tags || []), tagInput.trim()]
    }));
    setTagInput('');
  };

  // Remove a tag from the array
  const removeTag = (tagToRemove: string) => {
    setDownloadInfo(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  // Extract filename from URL
  const extractFilename = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || '';
      return filename.replace(/\.[^/.]+$/, '');
    } catch (e) {
      return '';
    }
  };

  // Handle URL input with auto-name detection
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setDownloadInfo(prev => {
      // Only auto-set the name if user hasn't manually entered one
      const autoName = prev.name ? prev.name : extractFilename(url);
      return { ...prev, url, name: autoName };
    });

    // Clear URL error if present
    if (errors.url) {
      setErrors(prev => ({ ...prev, url: '' }));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL
    const newErrors: {[key: string]: string} = {};
    if (!downloadInfo.url) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(downloadInfo.url);
      } catch (_) {
        newErrors.url = 'Invalid URL format';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onDownload({
      ...downloadInfo,
      name: downloadInfo.name || extractFilename(downloadInfo.url),
      // Only include hash if provided
      ...(downloadInfo.hash ? { hash: downloadInfo.hash, hashType: downloadInfo.hashType } : {})
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1b26] border border-[#293256] rounded-lg w-full max-w-xl mx-4 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="border-b border-[#293256] px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[#c0caf5] flex items-center gap-2">
            <FaDownload className="text-[#7aa2f7]" />
            <span>Download ISO Image</span>
          </h3>
          <button 
            onClick={onClose}
            className="text-[#a9b1d6] hover:text-white transition-colors"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-sm text-[#a9b1d6] flex items-center gap-1.5">
                <FaLink className="text-[#7aa2f7]" />
                <span>ISO URL</span>
                <span className="text-[#f7768e]">*</span>
              </label>
              <input
                type="text"
                value={downloadInfo.url}
                onChange={handleUrlChange}
                placeholder="https://example.com/path/to/linux-distro.iso"
                className={`w-full p-2.5 bg-[#24283b] border ${errors.url ? 'border-[#f7768e]' : 'border-[#293256]'} rounded-md text-[#c0caf5] focus:border-[#7aa2f7] focus:outline-none`}
              />
              {errors.url && (
                <p className="text-xs text-[#f7768e] mt-1">{errors.url}</p>
              )}
              <p className="text-xs text-[#a9b1d6]/70">Paste the direct URL to the ISO file you want to download</p>
            </div>

            {/* Verification Hash */}
            <div className="space-y-2">
              <label className="text-sm text-[#a9b1d6] flex items-center gap-1.5">
                <FaFingerprint className="text-[#bb9af7]" />
                <span>Verification Hash</span>
                <span className="text-xs text-[#a9b1d6]/70 ml-1">(optional)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={downloadInfo.hashType}
                  onChange={(e) => setDownloadInfo(prev => ({ ...prev, hashType: e.target.value as any }))}
                  className="p-2.5 bg-[#24283b] border border-[#293256] rounded-md text-[#c0caf5] focus:border-[#7aa2f7] focus:outline-none"
                >
                  <option value="md5">MD5</option>
                  <option value="sha1">SHA-1</option>
                  <option value="sha256">SHA-256</option>
                  <option value="sha512">SHA-512</option>
                </select>
                <input
                  type="text"
                  value={downloadInfo.hash}
                  onChange={(e) => setDownloadInfo(prev => ({ ...prev, hash: e.target.value }))}
                  placeholder="Enter hash to verify download integrity"
                  className="flex-1 p-2.5 bg-[#24283b] border border-[#293256] rounded-md text-[#c0caf5] focus:border-[#7aa2f7] focus:outline-none font-mono text-sm"
                />
              </div>
              <p className="text-xs text-[#a9b1d6]/70 flex items-center gap-1">
                <FaInfoCircle className="text-[#7aa2f7]" />
                <span>Hash verification helps ensure the downloaded ISO hasn't been corrupted or tampered with</span>
              </p>
            </div>

            <div className="border-t border-[#293256] my-2 pt-3">
              <h4 className="text-sm font-medium text-[#c0caf5] mb-2">Metadata</h4>
              <p className="text-xs text-[#a9b1d6]/70 mb-3">This information helps organize your ISO files and track updates</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm text-[#a9b1d6]">Name</label>
              <input
                type="text"
                value={downloadInfo.name}
                onChange={(e) => setDownloadInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Auto-detected from URL"
                className="w-full p-2.5 bg-[#24283b] border border-[#293256] rounded-md text-[#c0caf5] focus:border-[#7aa2f7] focus:outline-none"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm text-[#a9b1d6]">Description</label>
              <textarea
                value={downloadInfo.description}
                onChange={(e) => setDownloadInfo(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={2}
                className="w-full p-2.5 bg-[#24283b] border border-[#293256] rounded-md text-[#c0caf5] focus:border-[#7aa2f7] focus:outline-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm text-[#a9b1d6] flex items-center gap-1.5">
                <FaTags className="text-[#9ece6a]" />
                <span>Tags</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag and press Enter"
                  className="flex-1 p-2.5 bg-[#24283b] border border-[#293256] rounded-md text-[#c0caf5] focus:border-[#7aa2f7] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-[#24283b] hover:bg-[#292e42] border border-[#293256] text-[#7aa2f7] rounded-md transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {downloadInfo.tags?.map((tag, index) => (
                  <div 
                    key={index} 
                    className="bg-[#24283b] px-2 py-1 rounded-md text-sm text-[#7aa2f7] flex items-center gap-1"
                  >
                    <span>{tag}</span>
                    <button 
                      type="button" 
                      onClick={() => removeTag(tag)}
                      className="text-[#a9b1d6] hover:text-[#f7768e] transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
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
              Download
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IsoDownloadModal;
