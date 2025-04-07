// src/components/FooterNav.tsx
'use client';

import React from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { useWizardStore, useWizardActions, stepRoutes } from '@/store/wizardStore';
import { useRouter } from 'next/navigation';

// Removed local stepRoutes, now imported from store

export default function FooterNav() {
  const router = useRouter();
  const { currentStep, selectedDiskId } = useWizardStore();
  const { goToNextStep, goToPreviousStep } = useWizardActions();

  const totalSteps = Object.keys(stepRoutes).length;

  // --- Navigation Logic ---
  const handlePrevious = () => {
    const targetStep = currentStep - 1;
    goToPreviousStep(); // Update store first
    const previousStepRoute = stepRoutes[targetStep];
    if (previousStepRoute) {
      router.push(previousStepRoute);
    }
  };

  const handleNext = () => {
    const targetStep = currentStep + 1;
    goToNextStep(); // Update store first
    const nextStepRoute = stepRoutes[targetStep];
    if (nextStepRoute) {
      router.push(nextStepRoute);
    }
  };

  // --- Button Disabled Logic ---
  const isBackDisabled = currentStep <= 1;
  const isNextDisabled = () => {
    if (currentStep >= totalSteps) return true; // Can't go past last step
    if (currentStep === 2 && !selectedDiskId) return true; // Must select disk on step 2
    // Add more conditions for later steps (e.g., valid partition layout on step 3)
    return false;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-20 px-8 flex items-center justify-between bg-[#1a1b26] z-10 border-t border-[#292e42] shadow-lg">
      {/* Back Button */}
      <button
        onClick={handlePrevious}
        disabled={isBackDisabled}
        className={`flex items-center px-5 py-3 rounded-lg font-medium transition-all duration-200 
          ${isBackDisabled
            ? 'text-[#565f89] cursor-not-allowed opacity-50'
            : 'border border-[#292e42] text-[#a9b1d6] hover:bg-[#24283b] hover:border-[#3d59a1]'}
        `}
      >
        <FaArrowLeft className="mr-2" />
        Back
      </button>

      {/* Step Indicator */}
      <div className="flex items-center space-x-2">
        {Array.from({length: totalSteps}).map((_, i) => (
          <div 
            key={i} 
            className={`h-2 w-2 rounded-full transition-all duration-300 ${i + 1 === currentStep 
              ? 'bg-[#7aa2f7] w-6' 
              : i + 1 < currentStep 
                ? 'bg-[#7aa2f7]/50' 
                : 'bg-[#3d59a1]'}`}
          />
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={isNextDisabled()}
        className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 
          ${isNextDisabled()
            ? 'bg-[#7aa2f7]/40 text-white/70 cursor-not-allowed'
            : 'bg-[#7aa2f7] text-white hover:bg-[#7dcfff] shadow-md hover:shadow-[#7aa2f7]/20'}
        `}
      >
        Next
        <FaArrowRight className="ml-2" />
      </button>
    </footer>
  );
}
