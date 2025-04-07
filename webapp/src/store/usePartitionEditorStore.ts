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
}

interface PartitionEditorActions {
  initializeState: (disk: Disk) => void;
  resetState: () => void;
  addPartition: () => void;
  deletePartition: (blockId: string) => void;
  editPartition: (blockId: string) => void;
  mergeUnallocated: () => void;
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
  }, true),

  addPartition: () => {
    console.warn('addPartition action not implemented');
  },

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

  editPartition: (blockId) => {
    console.warn('editPartition action not implemented');
  },

  mergeUnallocated: () => set(produce((draft) => {
    const originalCount = draft.blocks.length;
    draft.blocks = mergeAdjacentUnallocated(draft.blocks);
    if (draft.blocks.length < originalCount) {
      draft.history.push([...draft.blocks]);
    }
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
      }, true),
      
      addPartition: () => {
        console.warn('addPartition action not implemented');
      },
      
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
      
      editPartition: (blockId: string) => {
        console.warn('editPartition action not implemented');
      },
      
      mergeUnallocated: () => partitionEditorStore.setState(produce((draft) => {
        const originalCount = draft.blocks.length;
        draft.blocks = mergeAdjacentUnallocated(draft.blocks);
        if (draft.blocks.length < originalCount) {
          draft.history.push([...draft.blocks]);
        }
      }), true),
    };
  }, []);
}
