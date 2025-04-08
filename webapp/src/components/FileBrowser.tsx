import React, { useState, useEffect } from 'react';
import { FaFolder, FaFile, FaFileAlt, FaFileImage, FaFilePdf, FaFileCode, FaFileArchive, FaEllipsisV, FaDownload, FaTrashAlt, FaCopy, FaUpload, FaSync, FaLink, FaPaste } from 'react-icons/fa';
import OsIcon from './OsIcon';
import { detectOSFromFilename } from '@/lib/osDetection';
import IsoDownloadModal, { IsoDownloadInfo } from './IsoDownloadModal';
import { downloadIso } from '@/lib/downloadService';

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: string;
  modified?: string;
  extension?: string;
}

interface FileBrowserProps {
  title?: string;
  files: FileItem[];
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onFileAction?: (action: string, file: FileItem) => void;
  isLoading?: boolean;
}

// Helper function to get file icon based on extension
const getFileIcon = (file: FileItem) => {
  if (file.type === 'folder') return <FaFolder className="text-[#e0af68]" />;
  
  const extension = file.extension?.toLowerCase() || '';
  
  // For ISO files, use OS detection
  if (extension === 'iso') {
    return <OsIcon filename={file.name} />;
  }
  
  if (extension === 'img') return <FaFileImage className="text-[#9ece6a]" />;
  if (extension === 'pdf') return <FaFilePdf className="text-[#f7768e]" />;
  if (['txt', 'md', 'log'].includes(extension)) return <FaFileAlt className="text-[#7aa2f7]" />;
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(extension)) return <FaFileArchive className="text-[#bb9af7]" />;
  if (['js', 'ts', 'py', 'c', 'cpp', 'java', 'html', 'css'].includes(extension)) return <FaFileCode className="text-[#73daca]" />;
  
  return <FaFile className="text-[#7aa2f7]" />;
};

// Get OS description for ISO files
const getOsDescription = (file: FileItem): string | null => {
  if (file.extension?.toLowerCase() === 'iso') {
    const osInfo = detectOSFromFilename(file.name);
    return osInfo?.name || null;
  }
  return null;
};

const FileBrowser: React.FC<FileBrowserProps> = ({
  title = 'ISO Storage',
  files,
  currentPath = '/',
  onNavigate,
  onFileAction,
  isLoading = false
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState<string | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{isDownloading: boolean, progress: number, name?: string}>({ 
    isDownloading: false, 
    progress: 0 
  });
  
  // Mock files if none provided for demo/testing
  const displayFiles = files.length > 0 ? files : [
    { id: '1', name: 'Linux Mint 21.3.iso', type: 'file', size: '2.4 GB', modified: '2025-03-01', extension: 'iso' },
    { id: '2', name: 'Ubuntu 24.04 LTS.iso', type: 'file', size: '3.1 GB', modified: '2025-03-15', extension: 'iso' },
    { id: '3', name: 'Windows 11.iso', type: 'file', size: '5.6 GB', modified: '2025-02-12', extension: 'iso' },
    { id: '4', name: 'Pop OS 24.04.iso', type: 'file', size: '2.8 GB', modified: '2025-03-20', extension: 'iso' },
    { id: '5', name: 'Fedora Workstation 39.iso', type: 'file', size: '2.2 GB', modified: '2025-03-10', extension: 'iso' },
    { id: '6', name: 'Debian 12.4.0.iso', type: 'file', size: '3.8 GB', modified: '2025-02-25', extension: 'iso' },
    { id: '7', name: 'ISOs', type: 'folder', modified: '2025-03-25' },
  ];
  
  // Handle file click
  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder' && onNavigate) {
      onNavigate(`${currentPath}${file.name}/`);
    } else {
      setSelectedFile(selectedFile === file.id ? null : file.id);
    }
  };
  
  // Handle file action
  const handleAction = (action: string, file: FileItem) => {
    if (onFileAction) {
      onFileAction(action, file);
    }
    setSelectedFile(null);
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="bg-[#1f2335] rounded-xl border border-[#292e42] p-6 animate-pulse">
        <div className="h-7 w-1/3 bg-[#292e42] rounded mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-[#292e42] rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  // Path breadcrumb parts
  const pathParts = currentPath.split('/').filter(Boolean);
  
  return (
    <div className="bg-[#1f2335] rounded-xl border border-[#292e42] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#293256] flex justify-between items-center">
        <h2 className="text-xl font-semibold text-[#c0caf5]">{title}</h2>
        
        <div className="flex items-center gap-3">
          {/* Download from URL button */}
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7aa2f7]/20 hover:bg-[#7aa2f7]/30 text-[#7aa2f7] rounded-md transition-all"
            onClick={() => setIsDownloadModalOpen(true)}
            title="Download ISO from URL"
          >
            <FaLink size={14} /> <span className="text-sm">Add from URL</span>
          </button>
          
          {/* Upload button */}
          <button className="p-2 rounded-md bg-[#24283b] hover:bg-[#292e42] text-[#7aa2f7] transition-colors" title="Upload ISO file">
            <FaUpload size={14} />
          </button>
          
          {/* Refresh button */}
          <button className="p-2 rounded-md bg-[#24283b] hover:bg-[#292e42] text-[#9ece6a] transition-colors" title="Refresh file list">
            <FaSync size={14} />
          </button>
          
          {/* Path navigation */}
          <div className="text-sm text-[#a9b1d6] flex items-center overflow-x-auto whitespace-nowrap bg-[#24283b] px-3 py-1 rounded-md">
            <span 
              className="hover:text-[#7aa2f7] cursor-pointer" 
              onClick={() => onNavigate && onNavigate('/')}
            >
              Root
            </span>
            
            {pathParts.map((part, index) => (
              <React.Fragment key={index}>
                <span className="mx-1">/</span>
                <span 
                  className="hover:text-[#7aa2f7] cursor-pointer" 
                  onClick={() => onNavigate && onNavigate(`/${pathParts.slice(0, index + 1).join('/')}/`)}
                >
                  {part}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {/* File list header */}
      <div className="grid grid-cols-12 bg-[#24283b] text-[#a9b1d6] text-sm py-2 px-4">
        <div className="col-span-6">Name</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-3">Modified</div>
        <div className="col-span-1">Actions</div>
      </div>
      
      {/* File list */}
      <div className="max-h-64 overflow-y-auto">
        {displayFiles.length === 0 ? (
          <div className="p-6 text-center text-[#a9b1d6]">
            No files found in this directory
          </div>
        ) : (
          displayFiles.map((file) => {
            const osDescription = getOsDescription(file);
            
            return (
              <div 
                key={file.id}
                className={`grid grid-cols-12 py-2 px-4 items-center border-t border-[#292e42] hover:bg-[#292e42]/50 cursor-pointer ${selectedFile === file.id ? 'bg-[#3d59a1]/20' : ''}`}
                onClick={() => handleFileClick(file)}
                onMouseEnter={() => setIsHovering(file.id)}
                onMouseLeave={() => setIsHovering(null)}
              >
                <div className="col-span-6 flex items-center gap-3">
                  <div className="w-6 flex items-center justify-center">
                    {getFileIcon(file)}
                  </div>
                  <div>
                    <span className="text-[#c0caf5] truncate block">{file.name}</span>
                    {osDescription && (
                      <span className="text-xs text-[#a9b1d6]">{osDescription}</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-[#a9b1d6] text-sm">
                  {file.size || (file.type === 'folder' ? '--' : '0 B')}
                </div>
                <div className="col-span-3 text-[#a9b1d6] text-sm">
                  {file.modified || '--'}
                </div>
                <div className="col-span-1 text-right flex justify-end relative">
                  {(isHovering === file.id || selectedFile === file.id) && (
                    <div className="flex">
                      {file.extension === 'iso' && (
                        <button
                          className="text-[#9ece6a] hover:text-[#73ba25] p-1.5 rounded-md hover:bg-[#9ece6a]/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('boot', file);
                          }}
                          title="Boot from this ISO"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0 2c-6.075 0-11-4.925-11-11S5.925 1 12 1s11 4.925 11 11-4.925 11-11 11zm-3-8V9l6 3-6 3z" />
                          </svg>
                        </button>
                      )}
                      <button
                        className="text-[#7aa2f7] hover:text-[#3d59a1] p-1.5 rounded-md hover:bg-[#7aa2f7]/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction('download', file);
                        }}
                        title="Download"
                      >
                        <FaDownload size={16} />
                      </button>
                      <button
                        className="text-[#f7768e] hover:text-[#e63c5e] p-1.5 rounded-md hover:bg-[#f7768e]/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction('delete', file);
                        }}
                        title="Delete"
                      >
                        <FaTrashAlt size={16} />
                      </button>
                    </div>
                  )}

                  {isHovering !== file.id && selectedFile !== file.id && (
                    <button
                      className="text-[#7aa2f7] hover:text-[#3d59a1] p-1.5 rounded-md hover:bg-[#7aa2f7]/10 transition-colors opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(selectedFile === file.id ? null : file.id);
                      }}
                    >
                      <FaEllipsisV size={14} />
                    </button>
                  )}
                  
                  {/* Action dropdown */}
                  {selectedFile === file.id && (
                    <div className="absolute right-0 top-8 z-10 w-40 bg-[#1a1b26] border border-[#292e42] rounded-md shadow-lg py-1 text-left">
                      {file.extension === 'iso' && (
                        <button
                          className="w-full px-4 py-2 text-sm text-left text-[#c0caf5] hover:bg-[#292e42] flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('boot', file);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="text-[#9ece6a]">
                            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0 2c-6.075 0-11-4.925-11-11S5.925 1 12 1s11 4.925 11 11-4.925 11-11 11zm-3-8V9l6 3-6 3z" />
                          </svg>
                          <span>Boot from ISO</span>
                        </button>
                      )}
                      <button
                        className="w-full px-4 py-2 text-sm text-left text-[#c0caf5] hover:bg-[#292e42] flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction('download', file);
                        }}
                      >
                        <FaDownload size={14} className="text-[#7aa2f7]" />
                        <span>Download</span>
                      </button>
                      <button
                        className="w-full px-4 py-2 text-sm text-left text-[#c0caf5] hover:bg-[#292e42] flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction('copy', file);
                        }}
                      >
                        <FaCopy size={14} className="text-[#bb9af7]" />
                        <span>Copy</span>
                      </button>
                      <button
                        className="w-full px-4 py-2 text-sm text-left text-[#c0caf5] hover:bg-[#292e42] flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction('delete', file);
                        }}
                      >
                        <FaTrashAlt size={14} className="text-[#f7768e]" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Upload area */}
      <div className="p-4 border-t border-[#293256] bg-[#24283b]/50 flex flex-col items-center justify-center">
        {downloadStatus.isDownloading ? (
          <div className="w-full px-6 py-8 border-2 border-[#3d59a1] rounded-lg flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-2">
              <FaDownload className="text-[#7aa2f7] animate-pulse" size={20} />
              <span className="text-[#c0caf5]">
                Downloading {downloadStatus.name || 'ISO file'}
              </span>
            </div>
            <div className="w-full bg-[#1a1b26] h-2 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-[#7aa2f7] to-[#bb9af7]" 
                style={{ width: `${downloadStatus.progress}%` }}
              ></div>
            </div>
            <div className="text-sm text-[#a9b1d6]">{downloadStatus.progress}% complete</div>
          </div>
        ) : (
          <div className="w-full px-6 py-8 border-2 border-dashed border-[#3d59a1] rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#1f2335]/50 transition-colors">
            <FaUpload className="text-[#7aa2f7] mb-2" size={24} />
            <p className="text-[#a9b1d6] mb-1">Drag and drop ISO files here</p>
            <p className="text-xs text-[#a9b1d6]/70">or click to select files</p>
            
            <div className="mt-4 pt-4 border-t border-[#293256] w-full flex justify-center">
              <button 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7aa2f7]/20 hover:bg-[#7aa2f7]/30 text-[#7aa2f7] rounded-md transition-all text-sm"
                onClick={() => setIsDownloadModalOpen(true)}
              >
                <FaPaste size={14} /> Paste download URL
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Download from URL Modal */}
      <IsoDownloadModal 
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownload={(downloadInfo: IsoDownloadInfo) => {
          setIsDownloadModalOpen(false);
          setDownloadStatus({
            isDownloading: true,
            progress: 0,
            name: downloadInfo.name || 'ISO file'
          });
          
          // Simulate download progress
          const interval = setInterval(() => {
            setDownloadStatus(prev => {
              const newProgress = Math.min(prev.progress + 10, 100);
              
              if (newProgress === 100) {
                clearInterval(interval);
                
                // Reset after 1 second of showing 100%
                setTimeout(() => {
                  setDownloadStatus({ isDownloading: false, progress: 0 });
                  
                  // In a real implementation, we would update the file list
                  // after download completes
                }, 1000);
              }
              
              return {
                ...prev,
                progress: newProgress
              };
            });
          }, 500);
          
          // Call the download service function
          downloadIso(downloadInfo).then(metadata => {
            console.log('Download started:', metadata);
          }).catch(err => {
            console.error('Download failed:', err);
            clearInterval(interval);
            setDownloadStatus({ isDownloading: false, progress: 0 });
          });
        }}
      />
    </div>
  );
};

export default FileBrowser;
