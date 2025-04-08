import { create } from 'zustand';
import { Disk, Partition, PartitionBlock, calculateBlocks } from '@/lib/diskUtils';
import { produce } from 'immer';
import { shallow } from 'zustand/shallow';
import { useRef, useMemo, useState, useEffect } from 'react';

interface PartitionEditorState {
  selectedDisk: Disk | null;
  blocks: PartitionBlock[];
  isLoading: boolean;
  error: string | null;
  history: PartitionBlock[][];
  isoStorageCreated: boolean; // Track if ISO storage has been created
}

interface PartitionEditorActions {
  initializeState: (disk: Disk) => void;
  resetState: () => void;
  addPartition: () => void;
  deletePartition: (blockId: string) => void;
  editPartition: (blockId: string) => void;
  mergeUnallocated: () => void;
  createISOStoragePartition: () => void; // Add new action for auto-creating ISO storage
}

// Merge adjacent unallocated blocks for a cleaner partition view
const mergeAdjacentUnallocated = (blocks: PartitionBlock[]): PartitionBlock[] => {
  if (blocks.length < 2) return blocks;
  
  const result: PartitionBlock[] = [];
  let current = blocks[0];
  
  for (let i = 1; i < blocks.length; i++) {
    const next = blocks[i];
    
    // If both are unallocated, merge them
    if (!current.isAllocated && !next.isAllocated) {
      current = {
        ...current,
        sizeBytes: current.sizeBytes + next.sizeBytes,
        size: `${(current.sizeBytes + next.sizeBytes) / (1024 * 1024 * 1024)} GiB`
      };
    } else {
      // Otherwise add current to result and move to next
      result.push(current);
      current = next;
    }
  }
  
  // Don't forget the last one
  result.push(current);
  return result;
};

// Create the base store
const createPartitionEditorStore = () => create<PartitionEditorState & PartitionEditorActions>()((set) => ({
  // Initial state
  selectedDisk: null,
  blocks: [],
  isLoading: false,
  error: null,
  history: [],
  isoStorageCreated: false,

  // Actions
  initializeState: (disk) => set(produce((draft) => {
    draft.selectedDisk = disk;
    draft.blocks = calculateBlocks(disk.partitions, disk.sizeBytes);
    draft.isLoading = false;
    draft.error = null;
    draft.history = [draft.blocks];
  }), true),

  resetState: () => set({
    selectedDisk: null,
    blocks: [],
    isLoading: false,
    error: null,
    history: [],
    isoStorageCreated: false,
  }, true),

  addPartition: () => set(produce((draft) => {
    // Find the first unallocated block
    const unallocatedIndex = draft.blocks.findIndex(b => !b.isAllocated);
    if (unallocatedIndex === -1) return;
    
    const unallocatedBlock = draft.blocks[unallocatedIndex];
    
    // Default to taking the full unallocated space
    const newPartitionSizeBytes = unallocatedBlock.sizeBytes;
    const formattedSize = `${(newPartitionSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
    
    // Create new partition block
    const newPartition: PartitionBlock = {
      id: `partition-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: `New Partition`, // This will be the device name later
      type: 'part',
      isAllocated: true,
      sizeBytes: newPartitionSizeBytes,
      size: formattedSize,
      fsType: 'ext4', // Default filesystem type
      label: 'New Partition',
      uuid: null,
      originalId: null,
    };
    
    draft.blocks.splice(unallocatedIndex, 1, newPartition);
    draft.history.push([...draft.blocks]);
  }), true),

  deletePartition: (blockId) => set(produce((draft) => {
    const blockIndex = draft.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1 || !draft.blocks[blockIndex].isAllocated) return;

    const blockToDelete = draft.blocks[blockIndex];
    const newUnallocatedBlock: PartitionBlock = {
      id: `unallocated-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: 'Unallocated',
      type: 'free',
      isAllocated: false,
      sizeBytes: blockToDelete.sizeBytes,
      size: blockToDelete.size,
      fsType: null,
      label: null,
      uuid: null,
      originalId: null,
    };

    draft.blocks.splice(blockIndex, 1, newUnallocatedBlock);
    draft.blocks = mergeAdjacentUnallocated(draft.blocks);
    draft.history.push([...draft.blocks]);
  }), true),

  editPartition: (blockId) => set(produce((draft) => {
    const blockIndex = draft.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1 || !draft.blocks[blockIndex].isAllocated) return;
    
    // For now, just toggle between ext4 and ntfs as a proof of concept
    const partition = draft.blocks[blockIndex];
    const newFsType = partition.fsType === 'ext4' ? 'ntfs' : 'ext4';
    
    // Update the partition
    draft.blocks[blockIndex] = {
      ...partition,
      fsType: newFsType,
      label: `${newFsType.toUpperCase()} Partition`
    };
    
    draft.history.push([...draft.blocks]);
  }), true),

  mergeUnallocated: () => set(produce((draft) => {
    const originalCount = draft.blocks.length;
    draft.blocks = mergeAdjacentUnallocated(draft.blocks);
    if (draft.blocks.length < originalCount) {
      draft.history.push([...draft.blocks]);
    }
  }), true),

  // Auto-create ISO storage partition using all available space
  createISOStoragePartition: () => set(produce((draft) => {
    // Only proceed if there's unallocated space and ISO storage hasn't been created yet
    if (draft.isoStorageCreated) return;
    
    // Merge any adjacent unallocated spaces first
    draft.blocks = mergeAdjacentUnallocated(draft.blocks);
    
    // Find all unallocated blocks
    const unallocatedBlocks = draft.blocks.filter(b => !b.isAllocated);
    if (unallocatedBlocks.length === 0) return;
    
    // Calculate total unallocated space
    const totalUnallocatedBytes = unallocatedBlocks.reduce((sum, block) => sum + block.sizeBytes, 0);
    
    // Create new ISO storage partition with all available space
    const newISOStorage: PartitionBlock = {
      id: `iso-storage-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: 'ISO Storage',
      type: 'part',
      isAllocated: true,
      sizeBytes: totalUnallocatedBytes,
      size: `${(totalUnallocatedBytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`,
      fsType: 'exfat', // exFAT for ISO storage
      label: 'ISO Storage',
      uuid: null,
      originalId: null,
    };
    
    // Replace all unallocated blocks with this new ISO storage partition
    draft.blocks = draft.blocks.filter(b => b.isAllocated).concat(newISOStorage);
    
    // Mark ISO storage as created
    draft.isoStorageCreated = true;
    
    // Update history
    draft.history.push([...draft.blocks]);
  }), true),
}));

// Initialize the store
export const partitionEditorStore = createPartitionEditorStore();

// Custom hook for state with stable selector
export function usePartitionEditorState() {
  // Create a stable reference for our selection function
  const stableSelector = useRef((state: PartitionEditorState) => ({
    selectedDisk: state.selectedDisk,
    blocks: state.blocks,
    isLoading: state.isLoading,
    error: state.error
  })).current;
  
  // Get the initial state
  const initialState = useMemo(() => stableSelector(partitionEditorStore.getState()), []);
  const [state, setState] = useState(initialState);
  
  // Subscribe to store changes
  useEffect(() => {
    return partitionEditorStore.subscribe(
      (newState) => {
        const selection = stableSelector(newState);
        setState(selection);
      },
      (oldSelection, newSelection) => shallow(oldSelection, newSelection)
    );
  }, [stableSelector]);
  
  return state;
}

// Stable actions that won't change between renders
export function usePartitionEditorActions() {
  return useMemo(() => {
    return {
      initializeState: (disk: Disk) => partitionEditorStore.setState(produce((draft) => {
        draft.selectedDisk = disk;
        draft.blocks = calculateBlocks(disk.partitions, disk.sizeBytes);
        draft.isLoading = false;
        draft.error = null;
        draft.history = [draft.blocks];
      }), true),
      
      resetState: () => partitionEditorStore.setState({
        selectedDisk: null,
        blocks: [],
        isLoading: false,
        error: null,
        history: [],
        isoStorageCreated: false,
      }, true),
      
      addPartition: () => partitionEditorStore.setState(produce((draft) => {
        // Find the first unallocated block
        const unallocatedIndex = draft.blocks.findIndex(b => !b.isAllocated);
        if (unallocatedIndex === -1) return;
        
        const unallocatedBlock = draft.blocks[unallocatedIndex];
        
        // Default to taking the full unallocated space
        const newPartitionSizeBytes = unallocatedBlock.sizeBytes;
        const formattedSize = `${(newPartitionSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
        
        // Create new partition block
        const newPartition: PartitionBlock = {
          id: `partition-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: `New Partition`, // This will be the device name later
          type: 'part',
          isAllocated: true,
          sizeBytes: newPartitionSizeBytes,
          size: formattedSize,
          fsType: 'ext4', // Default filesystem type
          label: 'New Partition',
          uuid: null,
          originalId: null,
        };
        
        draft.blocks.splice(unallocatedIndex, 1, newPartition);
        draft.history.push([...draft.blocks]);
      }), true),
      
      deletePartition: (blockId: string) => partitionEditorStore.setState(produce((draft) => {
        const blockIndex = draft.blocks.findIndex(b => b.id === blockId);
        if (blockIndex === -1 || !draft.blocks[blockIndex].isAllocated) return;

        const blockToDelete = draft.blocks[blockIndex];
        const newUnallocatedBlock: PartitionBlock = {
          id: `unallocated-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: 'Unallocated',
          type: 'free',
          isAllocated: false,
          sizeBytes: blockToDelete.sizeBytes,
          size: blockToDelete.size,
          fsType: null,
          label: null,
          uuid: null,
          originalId: null,
        };

        draft.blocks.splice(blockIndex, 1, newUnallocatedBlock);
        draft.blocks = mergeAdjacentUnallocated(draft.blocks);
        draft.history.push([...draft.blocks]);
      }), true),
      
      editPartition: (blockId: string) => partitionEditorStore.setState(produce((draft) => {
        const blockIndex = draft.blocks.findIndex(b => b.id === blockId);
        if (blockIndex === -1 || !draft.blocks[blockIndex].isAllocated) return;
        
        // For now, just toggle between ext4 and ntfs as a proof of concept
        const partition = draft.blocks[blockIndex];
        const newFsType = partition.fsType === 'ext4' ? 'ntfs' : 'ext4';
        
        // Update the partition
        draft.blocks[blockIndex] = {
          ...partition,
          fsType: newFsType,
          label: `${newFsType.toUpperCase()} Partition`
        };
        
        draft.history.push([...draft.blocks]);
      }), true),
      
      mergeUnallocated: () => partitionEditorStore.setState(produce((draft) => {
        const originalCount = draft.blocks.length;
        draft.blocks = mergeAdjacentUnallocated(draft.blocks);
        if (draft.blocks.length < originalCount) {
          draft.history.push([...draft.blocks]);
        }
      }), true),
      
      createISOStoragePartition: () => partitionEditorStore.setState(produce((draft) => {
        // Only proceed if there's unallocated space and ISO storage hasn't been created yet
        if (draft.isoStorageCreated) return;
        
        // Merge any adjacent unallocated spaces first
        draft.blocks = mergeAdjacentUnallocated(draft.blocks);
        
        // Find all unallocated blocks
        const unallocatedBlocks = draft.blocks.filter(b => !b.isAllocated);
        if (unallocatedBlocks.length === 0) return;
        
        // Calculate total unallocated space
        const totalUnallocatedBytes = unallocatedBlocks.reduce((sum, block) => sum + block.sizeBytes, 0);
        
        // Create new ISO storage partition with all available space
        const newISOStorage: PartitionBlock = {
          id: `iso-storage-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: 'ISO Storage',
          type: 'part',
          isAllocated: true,
          sizeBytes: totalUnallocatedBytes,
          size: `${(totalUnallocatedBytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`,
          fsType: 'exfat', // exFAT for ISO storage
          label: 'ISO Storage',
          uuid: null,
          originalId: null,
        };
        
        // Replace all unallocated blocks with this new ISO storage partition
        draft.blocks = draft.blocks.filter(b => b.isAllocated).concat(newISOStorage);
        
        // Mark ISO storage as created
        draft.isoStorageCreated = true;
        
        // Update history
        draft.history.push([...draft.blocks]);
      }), true),
    };
  }, []);
}
