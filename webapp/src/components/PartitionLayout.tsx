'use client';

import React, { useEffect, useState, useRef } from 'react';
import { produce } from 'immer';
import {
  FaDatabase,
  FaPlus,
  FaTrashAlt,
  FaEdit,
  FaSpinner,
  FaExclamationTriangle,
  FaTools,
  FaInfoCircle,
  FaCompress,
  FaUndo,
  FaRedo,
  FaQuestionCircle,
  FaObjectGroup,
  FaHdd
} from 'react-icons/fa';
import { SiIos } from 'react-icons/si';
import { Disk, PartitionBlock, formatBytes } from '@/lib/diskUtils';
import { 
  usePartitionEditorActions,
  usePartitionEditorState,
  partitionEditorStore 
} from '@/store/usePartitionEditorStore';
import PartitionModal, { PartitionFormData } from './PartitionModal';

interface PartitionLayoutProps {
  diskId: string | null;
}

const PartitionLayout: React.FC<PartitionLayoutProps> = ({ diskId }) => {
  // Get values from our stable hooks
  const { selectedDisk, blocks, isLoading: storeIsLoading, error } = usePartitionEditorState();
  const partitionActions = usePartitionEditorActions();
  
  // Local component state
  const [isComponentLoading, setIsComponentLoading] = useState(false);
  const processingDiskIdRef = useRef<string | null>(null);
  const effectRunCount = useRef(0);

  // State for partition modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [unallocatedSize, setUnallocatedSize] = useState(0);

  // Effect for loading disk data
  useEffect(() => {
    // Guard against infinite loops
    effectRunCount.current += 1;
    if (effectRunCount.current > 10) {
      console.error('Effect run limit exceeded');
      return;
    }

    let isCancelled = false;
    
    const loadDiskData = async (id: string) => {
      try {
        const response = await fetch('/api/disks');
        const apiResponse = await response.json();
        
        // Extract blockdevices array from the API response format
        const blockdevices = apiResponse.blockdevices || [];
        
        if (!isCancelled) {
          // Find the target disk by name
          const targetDisk = blockdevices.find((d: any) => d.name === id);
          
          if (targetDisk) {
            // Transform the disk into our application's format
            const formattedDisk: Disk = {
              id: targetDisk.name,
              name: `/dev/${targetDisk.name}`,
              model: targetDisk.model || 'Unknown Device',
              vendor: targetDisk.vendor || 'Unknown',
              tran: targetDisk.tran || 'Unknown',
              type: determineDiskType(targetDisk), // Helper function to determine disk type
              size: formatBytes(targetDisk.size),
              sizeBytes: Number(targetDisk.size),
              partitions: (targetDisk.children || []).map((child: any) => {
                // Get filesystem type - prioritize filesystem field over blkidInfo.TYPE
                const fsType = child.filesystem || child.blkidInfo?.TYPE || null;
                
                return {
                  id: child.name,
                  name: `/dev/${child.name}`,
                  type: child.type,
                  fsType: fsType,
                  label: child.blkidInfo?.LABEL || child.partitionLabel || null,
                  uuid: child.blkidInfo?.UUID || null,
                  size: formatBytes(child.size),
                  sizeBytes: Number(child.size),
                  mountPoint: child.mountpoint || undefined
                };
              })
            };
            
            partitionActions.initializeState(formattedDisk);
          } else {
            // If disk not found, reset state using the proper store action instead of setState
            partitionActions.resetState();
            console.error(`Disk ${id} not found`);
          }
          setIsComponentLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error loading disk data:', err);
          // Handle error by using the proper store action
          partitionActions.resetState();
          setIsComponentLoading(false);
        }
      }
    };

    const currentStoreState = partitionEditorStore.getState();

    if (diskId) {
      const storeDiskId = currentStoreState.selectedDisk?.id;
      const shouldLoadDisk = !storeDiskId || storeDiskId !== diskId || processingDiskIdRef.current !== diskId;
      
      if (shouldLoadDisk) {
        setIsComponentLoading(true);
        processingDiskIdRef.current = diskId;
        // Use partial state update instead of full state replacement with 'true'
        partitionEditorStore.setState({ 
          isLoading: true, 
          error: null
        });
        loadDiskData(diskId);
      }
    } else {
      // Reset if no disk ID provided
      if (currentStoreState.selectedDisk !== null) {
        partitionActions.resetState();
      }
    }
    
    return () => {
      isCancelled = true;
    };
  }, [diskId]);

  // Function to check if there are adjacent unallocated blocks that could be merged
  const hasMergeableUnallocated = () => {
    if (!blocks) return false;
    
    let unallocatedCount = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (!blocks[i].isAllocated) {
        unallocatedCount++;
        // If there's more than one unallocated block, they can potentially be merged
        if (unallocatedCount > 1) return true;
      }
    }
    return false;
  };

  // Define color scheme based on partition types
  const getPartitionColor = (block: PartitionBlock, index: number) => {
    if (!block.isAllocated) return 'bg-[#1f2335] border-[#293256]';
    
    // Map filesystem types to specific colors for consistency with matte finish
    const fsTypeColorMap: Record<string, string> = {
      'vfat': 'bg-[#a48bd8]/80', // matte purple for FAT partitions
      'fat32': 'bg-[#a48bd8]/80', // matte purple for FAT partitions
      'ext4': 'bg-[#6b8fe0]/80', // matte blue for ext4 partitions 
      'ntfs': 'bg-[#70b8e5]/80', // matte light blue for NTFS
      'swap': 'bg-[#c5985d]/80', // matte orange for swap
      'linux-swap': 'bg-[#c5985d]/80', // matte orange for swap
      'linux-swap(v1)': 'bg-[#c5985d]/80', // matte orange for swap
      'xfs': 'bg-[#89b860]/80', // matte green for XFS
      'btrfs': 'bg-[#3a9099]/80', // matte teal for btrfs
      'exfat': 'bg-[#b16bc4]/80', // matte pink-purple for exFAT
      'f2fs': 'bg-[#4ea0ab]/80' // matte cyan for F2FS
    };
    
    if (block.fsType && fsTypeColorMap[block.fsType.toLowerCase()]) {
      return fsTypeColorMap[block.fsType.toLowerCase()];
    }
    
    // Fallback colors for unknown types
    const fallbackColors = [
      'bg-[#d86377]/80', // matte pink
      'bg-[#e88f5c]/80', // matte orange-red
      'bg-[#c5985d]/80', // matte orange
      'bg-[#89b860]/80', // matte green
      'bg-[#65c3b4]/80', // matte mint
      'bg-[#a1dee0]/80', // matte cyan
    ];
    
    return fallbackColors[index % fallbackColors.length];
  };

  // Custom tooltip component that renders at document body level
  const Tooltip = ({ content, children }: { content: React.ReactNode, children: React.ReactNode }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (showTooltip && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top - 5, // Position above the icon
          left: rect.left - 200 + rect.width / 2, // Center horizontally
        });
      }
    }, [showTooltip]);
    
    return (
      <div className="inline-block">
        <div 
          ref={triggerRef}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {children}
        </div>
        
        {showTooltip && (
          <div
            className="fixed bg-slate-900 border border-slate-600 text-white text-xs rounded shadow-lg p-2 w-48 z-[9999] transition-opacity duration-150"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: 'translateY(-100%)',
            }}
          >
            {content}
          </div>
        )}
      </div>
    );
  };

  // Function to handle opening the add partition modal
  const handleAddPartition = () => {
    // Find the first unallocated block
    const unallocatedBlock = blocks.find(b => !b.isAllocated);
    if (!unallocatedBlock) return;
    
    setUnallocatedSize(unallocatedBlock.sizeBytes);
    setSelectedBlockId(unallocatedBlock.id);
    setIsModalOpen(true);
  };
  
  // Function to handle opening the edit partition modal
  const handleEditPartition = (blockId: string) => {
    setSelectedBlockId(blockId);
    setUnallocatedSize(blocks.find(b => b.id === blockId)?.sizeBytes || 0);
    setIsModalOpen(true);
  };
  
  // Handle saving the partition form data
  const handleSavePartition = (formData: PartitionFormData) => {
    const blockToModify = blocks.find(b => b.id === selectedBlockId);
    if (!blockToModify) return;
    
    if (blockToModify.isAllocated) {
      // We're editing an existing partition
      partitionEditorStore.setState(produce((draft: any) => {
        const blockIndex = draft.blocks.findIndex((b: any) => b.id === selectedBlockId);
        if (blockIndex === -1) return;
        
        draft.blocks[blockIndex] = {
          ...draft.blocks[blockIndex],
          fsType: formData.fsType,
          label: formData.label,
          // Size can't be changed when editing existing partition for simplicity
        };
        
        draft.history.push([...draft.blocks]);
      }), true);
    } else {
      // We're creating a new partition from unallocated space
      partitionEditorStore.setState(produce((draft: any) => {
        const blockIndex = draft.blocks.findIndex((b: any) => b.id === selectedBlockId);
        if (blockIndex === -1) return;
        
        const unallocatedBlock = draft.blocks[blockIndex];
        const newPartitionSizeBytes = formData.sizeBytes;
        
        // Create the new partition
        const newPartition: PartitionBlock = {
          id: `partition-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: formData.label,
          type: 'part',
          isAllocated: true,
          sizeBytes: newPartitionSizeBytes,
          size: formatBytes(newPartitionSizeBytes),
          fsType: formData.fsType,
          label: formData.label,
          uuid: null,
          originalId: null,
        };
        
        // If we're not using all the space, we need to create a new unallocated block
        if (newPartitionSizeBytes < unallocatedBlock.sizeBytes) {
          const remainingSize = unallocatedBlock.sizeBytes - newPartitionSizeBytes;
          const newUnallocated: PartitionBlock = {
            id: `unallocated-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: 'Unallocated',
            type: 'free',
            isAllocated: false,
            sizeBytes: remainingSize,
            size: formatBytes(remainingSize),
            fsType: null,
            label: null,
            uuid: null,
            originalId: null,
          };
          
          // Replace the unallocated block with the new partition and the remaining space
          draft.blocks.splice(blockIndex, 1, newPartition, newUnallocated);
        } else {
          // We're using all the space, just replace the unallocated block
          draft.blocks.splice(blockIndex, 1, newPartition);
        }
        
        draft.history.push([...draft.blocks]);
      }), true);
    }
    
    setIsModalOpen(false);
  };

  // Render loading state
  if (isComponentLoading || storeIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#1a1b26] text-white rounded-lg shadow-lg">
        <div className="flex items-center gap-3">
          <FaSpinner className="animate-spin text-[#7aa2f7] text-2xl" />
          <span className="text-lg font-medium text-[#c0caf5]">Loading partition data...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#1a1b26] text-white rounded-lg shadow-lg border border-[#f7768e]">
        <div className="flex items-center gap-3 text-[#f7768e] mb-4">
          <FaExclamationTriangle className="text-2xl" />
          <span className="text-lg font-medium">Error Loading Partition Data</span>
        </div>
        <p className="text-[#a9b1d6]">{error}</p>
      </div>
    );
  }

  // Render empty state - no disk selected
  if (!selectedDisk) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#1a1b26] text-white rounded-lg shadow-lg">
        <div className="flex items-center gap-3 text-[#a9b1d6]">
          <FaDatabase className="text-2xl" />
          <span className="text-lg font-medium">No disk selected</span>
        </div>
        <p className="text-[#a9b1d6] mt-2">Select a disk to view partition layout</p>
      </div>
    );
  }

  // Calculate total used percentage
  const totalAllocated = blocks.reduce((sum, block) => sum + (block.isAllocated ? block.sizeBytes : 0), 0);
  const usedPercentage = (totalAllocated / selectedDisk.sizeBytes) * 100;

  // Render partition layout
  return (
    <div className="bg-[#1a1b26] rounded-lg shadow-lg p-6 text-white">
      {/* Disk header with info and add button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 text-[#c0caf5]">
            <FaDatabase className="text-[#7aa2f7]" />
            <span>
              {selectedDisk.model || selectedDisk.name} ({selectedDisk.size})
            </span>
          </h2>
          <p className="text-xs text-[#a9b1d6]">
            {selectedDisk.id}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            className="bg-[#9ece6a] hover:bg-[#9ece6a]/80 text-white px-3 py-2 rounded flex items-center gap-1 text-sm transition-colors"
            onClick={() => handleAddPartition()}
          >
            <FaPlus size={14} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Partition blocks visualization */}
      <div className="mb-20 relative mt-4">
        {/* Partition blocks */}
        <div className="flex w-full h-12 rounded-lg overflow-hidden bg-[#1f2335] border border-[#293256]">
          {(() => {
            const MIN_DISPLAY_WIDTH = 6; // Minimum % width to display a label
            
            // Check if there's a dominant partition (>60%)
            const dominantPartition = blocks.find(block => {
              const widthPercent = (block.sizeBytes / selectedDisk.sizeBytes) * 100;
              return widthPercent > 60;
            });
            
            // If we have a dominant partition, create a custom layout
            if (dominantPartition) {
              // Calculate position of dominant partition as percentage of disk
              const dominantIndex = blocks.indexOf(dominantPartition);
              const dominantWidthPercent = (dominantPartition.sizeBytes / selectedDisk.sizeBytes) * 100;
              
              // Create three groups: before, dominant, and after
              const beforePartitions = blocks.slice(0, dominantIndex);
              const afterPartitions = blocks.slice(dominantIndex + 1);
              
              // Calculate minimum display space needed for all small partitions
              const totalSmallPartitions = beforePartitions.length + afterPartitions.length;
              const minSmallPartitionsSpace = totalSmallPartitions * MIN_DISPLAY_WIDTH;
              
              // Fixed width for dominant partition
              const dominantDisplayWidth = 20;
              
              // Available space to distribute proportionally after accounting for minimum widths
              const remainingSpace = Math.max(0, 80 - minSmallPartitionsSpace);
              
              // Calculate the remaining sizes excluding minimums
              const beforeTotalSize = beforePartitions.reduce((sum, b) => sum + b.sizeBytes, 0);
              const afterTotalSize = afterPartitions.reduce((sum, b) => sum + b.sizeBytes, 0);
              const nonDominantTotalSize = beforeTotalSize + afterTotalSize;
              
              // Calculate how to distribute the remaining space proportionally
              const getPartitionWidth = (block: PartitionBlock, totalGroupSize: number): number => {
                if (totalGroupSize === 0) return 0;
                // Minimum width plus proportional share of remaining space
                return MIN_DISPLAY_WIDTH + (block.sizeBytes / nonDominantTotalSize) * remainingSpace;
              };
              
              return (
                <>
                  {/* Render "before" partitions with minimum width */}
                  {beforePartitions.map((block, index) => {
                    const displayWidth = getPartitionWidth(block, beforeTotalSize);
                    const bgColor = getPartitionColor(block, index);
                    const originalWidthPercent = (block.sizeBytes / selectedDisk.sizeBytes) * 100;
                    
                    return (
                      <div 
                        key={block.id}
                        className={`${bgColor} relative hover:brightness-110 transition-all ${!block.isAllocated ? 'border border-[#3d59a1]' : ''}`}
                        style={{ width: `${displayWidth}%` }}
                        title={`${block.name} (${block.size}), ${originalWidthPercent.toFixed(1)}% of disk`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white">
                          {block.size}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Render the dominant partition with compression indicators */}
                  <div 
                    className={`${getPartitionColor(dominantPartition, dominantIndex)} relative hover:brightness-110 transition-all ${!dominantPartition.isAllocated ? 'border border-[#3d59a1]' : ''}`}
                    style={{ width: `${dominantDisplayWidth}%` }}
                    title={`${dominantPartition.name} (${dominantPartition.size}), ${dominantWidthPercent.toFixed(1)}% of disk`}
                  >
                    {/* Left compression indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 flex flex-col justify-center items-center">
                      <div className="w-full h-5 bg-white/30 flex justify-center items-center">
                        <div className="w-0 h-0 border-y-[4px] border-y-transparent border-r-[6px] border-r-white" />
                      </div>
                    </div>
                    
                    {/* Size label with red background and info icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-red-600/80 px-3 py-1 rounded-md flex items-center gap-1.5 text-xs font-mono text-white relative">
                        <span>{dominantPartition.size}</span>
                        <Tooltip 
                          content={
                            <>
                              This partition takes up {dominantWidthPercent.toFixed(1)}% of the disk but is shown compressed to 20% of the display width to make other partitions more visible. The arrows indicate compression.
                            </>
                          }
                        >
                          <FaInfoCircle size={12} className="text-white cursor-help" />
                        </Tooltip>
                      </div>
                    </div>
                    
                    {/* Right compression indicator */}
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 flex flex-col justify-center items-center">
                      <div className="w-full h-5 bg-white/30 flex justify-center items-center">
                        <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-white" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Render "after" partitions with minimum width */}
                  {afterPartitions.map((block, index) => {
                    const displayWidth = getPartitionWidth(block, afterTotalSize);
                    const bgColor = getPartitionColor(block, dominantIndex + 1 + index);
                    const originalWidthPercent = (block.sizeBytes / selectedDisk.sizeBytes) * 100;
                    
                    return (
                      <div 
                        key={block.id}
                        className={`${bgColor} relative hover:brightness-110 transition-all ${!block.isAllocated ? 'border border-[#3d59a1]' : ''}`}
                        style={{ width: `${displayWidth}%` }}
                        title={`${block.name} (${block.size}), ${originalWidthPercent.toFixed(1)}% of disk`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white">
                          {block.size}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            }
            
            // For non-dominant layouts, ensure minimum width for all partitions
            // First calculate how much space we need for minimums
            const minTotalSpace = blocks.length * MIN_DISPLAY_WIDTH;
            
            // If total minimum exceeds 100%, scale everything proportionally
            const scaleFactor = minTotalSpace > 100 ? 100 / minTotalSpace : 1;
            
            // Calculate remaining space after accounting for minimums
            const remainingSpace = Math.max(0, 100 - (minTotalSpace * scaleFactor));
            const totalSize = blocks.reduce((sum, b) => sum + b.sizeBytes, 0);
            
            return blocks.map((block, index) => {
              const widthPercent = (block.sizeBytes / selectedDisk.sizeBytes) * 100;
              
              // Calculate display width: minimum plus proportional share of remaining space
              let displayWidth;
              if (scaleFactor < 1) {
                // If we're scaling down minimums, just scale proportionally
                displayWidth = Math.max(0.5, widthPercent);
              } else {
                // Otherwise, use minimum width plus proportional share of remaining space
                displayWidth = (MIN_DISPLAY_WIDTH * scaleFactor) + 
                  ((block.sizeBytes / totalSize) * remainingSpace);
              }
              
              const bgColor = getPartitionColor(block, index);
              
              return (
                <div 
                  key={block.id}
                  className={`${bgColor} relative hover:brightness-110 transition-all ${!block.isAllocated ? 'border border-[#3d59a1]' : ''}`}
                  style={{ width: `${displayWidth}%` }}
                  title={`${block.name} (${block.size})`}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white">
                    {block.size}
                  </div>
                </div>
              );
            });
          })()}
        </div>
        
        {/* Partitions list */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[#c0caf5]">Partitions</h3>
            <div className="text-sm text-[#a9b1d6]">
              <span className="mr-2">Type</span>
              <span className="mr-2">Size</span>
              <span>Actions</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {blocks.map((block, index) => (
              <div key={block.id} className="p-3 rounded border border-[#293256] bg-[#24283b] flex flex-col h-full">
                {/* Partition color indicator and name */}
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-12 mr-3 rounded ${getPartitionColor(block, index)}`}></div>
                  <div className="flex-grow">
                    <div className="font-medium text-[#c0caf5]">
                      {block.isAllocated ? block.name : 'Unallocated'}
                    </div>
                    <div className="text-xs text-[#a9b1d6]">
                      {block.isAllocated ? (
                        <>
                          <span className="bg-[#1a1b26] px-2 py-0.5 rounded-md">
                            {block.fsType ? block.fsType.toLowerCase() : 'unknown'}
                          </span>
                          {block.label && (
                            <span className="ml-2 text-[#7aa2f7]">
                              {block.label}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[#565a6e]">unallocated</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[#a9b1d6] text-sm font-mono">
                    {block.size}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-end gap-1 mt-auto pt-2 border-t border-[#293256]">
                  {block.isAllocated ? (
                    <>
                      <button 
                        className="p-1.5 text-[#7aa2f7] hover:bg-[#3d59a1]/30 rounded-md transition-colors"
                        onClick={() => handleEditPartition(block.id)}
                        title="Change partition filesystem type"
                      >
                        <FaEdit size={16} />
                      </button>
                      <button 
                        className="p-1.5 text-[#f7768e] hover:bg-[#f7768e]/20 rounded-md transition-colors"
                        onClick={() => partitionActions.deletePartition(block.id)}
                        title="Delete partition"
                      >
                        <FaTrashAlt size={16} />
                      </button>
                    </>
                  ) : (
                    <button 
                      className="p-1.5 text-[#9ece6a] hover:bg-[#9ece6a]/20 rounded-md transition-colors"
                      onClick={() => handleAddPartition()}
                      title="Create partition in unallocated space"
                    >
                      <FaPlus size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Partition management actions */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-[#c0caf5]">Partitions</h3>
        <div className="flex gap-2">
          {hasMergeableUnallocated() && (
            <button
              onClick={() => partitionActions.mergeUnallocated()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3d59a1]/30 hover:bg-[#3d59a1]/50 text-[#7aa2f7] rounded-md transition-all"
              title="Merge adjacent unallocated partitions"
            >
              <FaCompress size={14} /> <span className="text-sm">Merge Free Space</span>
            </button>
          )}
          <button
            onClick={() => handleAddPartition()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9ece6a]/20 hover:bg-[#9ece6a]/30 text-[#9ece6a] rounded-md transition-all"
            disabled={!blocks.some(b => !b.isAllocated)}
            title="Create a new partition in unallocated space"
          >
            <FaPlus size={14} /> <span className="text-sm">New Partition</span>
          </button>

          {/* Auto Create ISO Storage Partition button */}
          <button
            onClick={() => partitionActions.createISOStoragePartition()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f7768e]/20 hover:bg-[#f7768e]/30 text-[#f7768e] rounded-md transition-all"
            disabled={!blocks.some(b => !b.isAllocated)}
            title="Auto-create ISO storage partition using all available space (exFAT)"
          >
            <SiIos size={14} /> <span className="text-sm">Create ISO Storage</span>
          </button>
        </div>
      </div>
      
      {/* Partition Modal */}
      <PartitionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePartition}
        block={selectedBlockId ? blocks.find(b => b.id === selectedBlockId) : undefined}
        maxSizeBytes={unallocatedSize}
      />
    </div>
  );
};

// Helper function to determine disk type
const determineDiskType = (disk: any): 'SSD' | 'HDD' | 'NVMe' | 'Unknown' => {
  if (!disk) return 'Unknown';
  
  // Check for NVMe first based on transport or name pattern
  if ((disk.tran && disk.tran.toLowerCase() === 'nvme') || 
      (disk.name && disk.name.startsWith('nvme'))) {
    return 'NVMe';
  }
  
  // Check for SSD based on rotation rate (0 typically means SSD)
  if (disk.rota === '0') {
    return 'SSD';
  }
  
  // If it rotates, it's likely a HDD
  if (disk.rota === '1') {
    return 'HDD';
  }
  
  // Fall back to examining the model name for common SSD indicators
  const modelLower = (disk.model || '').toLowerCase();
  if (modelLower.includes('ssd') || modelLower.includes('solid') || modelLower.includes('flash')) {
    return 'SSD';
  }
  
  return 'Unknown';
};

export default PartitionLayout;
