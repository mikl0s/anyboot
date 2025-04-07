// src/components/DiskSelection.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FaHdd, FaSpinner, FaExclamationTriangle } from 'react-icons/fa'; 
import { useWizardStore, useWizardActions } from '@/store/wizardStore';
import { Disk, LsblkOutput, transformLsblkData } from '@/lib/diskUtils'; 

interface DiskSelectionProps {
  onDiskSelect?: (diskId: string | null) => void; 
}

const diskColors = [
  'bg-[#7aa2f7]', 
  'bg-[#bb9af7]', 
  'bg-[#f7757f]', 
  'bg-[#9ece6a]', 
  'bg-[#ff9e64]', 
  'bg-[#7dcfff]', 
  'bg-[#e0af68]', 
  'bg-[#c0caf5]'  
];

const DiskSelection: React.FC<DiskSelectionProps> = ({ onDiskSelect }) => {
  const { selectedDiskId } = useWizardStore();
  const { setSelectedDiskId: setGlobalSelectedDiskId } = useWizardActions();

  const [disks, setDisks] = useState<Disk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/disks');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data: LsblkOutput = await response.json();
        const transformedDisks = transformLsblkData(data);
        setDisks(transformedDisks);
      } catch (err: unknown) {
        console.error("Failed to fetch or process disk data:", err);
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred while fetching disk data.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisks();
  }, []);

  const handleSelectDisk = (diskId: string) => {
    const newSelectedId = selectedDiskId === diskId ? null : diskId;
    setGlobalSelectedDiskId(newSelectedId);
    if (onDiskSelect) {
      onDiskSelect(newSelectedId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <FaSpinner className="animate-spin text-4xl text-[#7aa2f7]" />
        <span className="ml-4 text-[#a9b1d6]">Loading disks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-[#f7757f] rounded bg-[#f7757f]/10 text-[#ff9e64]">
        <h3 className="font-bold flex items-center"><FaExclamationTriangle className="mr-2" /> Error loading disks</h3>
        <p>{error}</p>
      </div>
    );
  }

  const getDiskColor = (index: number): string => {
    return diskColors[index % diskColors.length];
  };

  return (
    <div> 
      <h2 className="text-xl font-semibold mb-4 text-[#c0caf5]">Available Drives</h2>
      
      {disks.length === 0 ? (
        <p className="text-center text-[#a9b1d6] py-6">No disks detected.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {disks.map((disk, index) => {
            const isSelected = selectedDiskId === disk.id;
            
            return (
              <div 
                key={disk.id} 
                className={`bg-[#24283b] rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer ${isSelected ? 'border-[#7aa2f7] ring-2 ring-[#7aa2f7]/50' : 'border-[#292e42] hover:border-[#4a598c]'}`}
                onClick={() => handleSelectDisk(disk.id)}
                role="button"
                aria-pressed={isSelected}
                tabIndex={0} 
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectDisk(disk.id)} 
              >
                <div className={`h-2 ${getDiskColor(index)}`}></div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="flex items-center text-md font-semibold text-[#c0caf5] break-all">
                       <FaHdd className="mr-2 text-[#7aa2f7]/80 flex-shrink-0" size={16} /> 
                       {disk.name}
                    </h3>
                    <span className="text-sm font-medium text-[#a9b1d6] whitespace-nowrap ml-2">{disk.size}</span>
                  </div>
                  
                  <div className="text-xs text-[#787c99] space-y-1">
                     <p title={disk.model} className="truncate">
                        <span className="font-medium text-[#a9b1d6]">Model:</span> {disk.model || 'N/A'}
                     </p>
                     <p>
                        <span className="font-medium text-[#a9b1d6]">Interface:</span> {disk.tran ? disk.tran.toUpperCase() : 'N/A'} ({disk.type})
                     </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiskSelection;
