// src/app/step2/page.tsx
'use client';

import React from 'react';
import DiskSelection from '@/components/DiskSelection';
import { FaInfoCircle } from 'react-icons/fa';

export default function Step2Page() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Grid Layout for Header & Info Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Column 1: Step & Title */}
        <div className="md:col-span-1">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#3d59a1]/20 text-[#7aa2f7] mb-3">
            <span className="text-xs font-medium">Step 2 of 4</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Select Target Disk
          </h1>
        </div>

        {/* Column 2: Description */}
        <div className="md:col-span-1">
          <p className="text-sm text-[#a9b1d6] pt-1">
            Choose the disk where you want to install your operating system. All connected storage devices are shown below.
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
              Selecting a disk allows configuration in the next step. Ensure backups are done.
            </p>
          </div>
        </div>
      </div>

      {/* Disk Selection Component - Remains Full Width */}
      <DiskSelection />
    </div>
  );
}
