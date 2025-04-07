// src/app/step3/page.tsx
'use client';

import React from 'react';
import PartitionLayout from '@/components/PartitionLayout';
import { FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useWizardStore } from '@/store/wizardStore';

export default function Step3Page() {
  const { selectedDiskId } = useWizardStore();

  // --- No Disk Selected State (Keep this separate and full-width) ---
  if (!selectedDiskId) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#3d59a1]/20 text-[#7aa2f7] mb-4">
            <span className="text-sm font-medium">Step 3 of 4</span>
          </div>
          <h1 className="text-3xl font-bold mb-3 text-white">
            Configure Partition Layout
          </h1>
        </div>

        <div className="p-6 rounded-xl bg-[#1f2335] border border-[#ff9e64]/30 shadow-lg flex items-start">
          <div className="mr-4 mt-1 p-3 bg-[#ff9e64]/20 rounded-lg text-[#ff9e64]">
            <FaExclamationTriangle size={24} />
          </div>
          <div>
            <h3 className="text-xl font-medium mb-2 text-white">No Disk Selected</h3>
            <p className="text-[#a9b1d6] mb-4">
              You need to select a disk in the previous step before you can configure its partition layout.
            </p>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-[#3d59a1] hover:bg-[#7aa2f7] text-white rounded-lg transition-colors duration-200">
              Return to Disk Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Normal State (Apply grid layout here) ---
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Grid Layout for Header & Info Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Column 1: Step & Title */}
        <div className="md:col-span-1">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#3d59a1]/20 text-[#7aa2f7] mb-3">
            <span className="text-xs font-medium">Step 3 of 4</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Configure Partitions
          </h1>
        </div>

        {/* Column 2: Description */}
        <div className="md:col-span-1">
          <p className="text-sm text-[#a9b1d6] pt-1">
            Define how storage space is divided. Create, resize, or delete partitions as needed.
          </p>
        </div>

        {/* Column 3: Info Box */}
        <div className="md:col-span-1 p-4 rounded-lg bg-[#1f2335] border border-[#3d59a1]/30 flex items-start h-full">
          <div className="mr-3 mt-0.5 text-[#7dcfff] flex-shrink-0">
            <FaInfoCircle size={18} />
          </div>
          <div className="text-sm text-[#a9b1d6]">
            <p className="font-medium text-[#c0caf5] mb-1">Important</p>
            <p>
              Changes are not final until confirmation. Feel free to experiment.
            </p>
          </div>
        </div>
      </div>

      {/* Partition Layout Component - Remains Full Width */}
      <PartitionLayout diskId={selectedDiskId} />
    </div>
  );
}
