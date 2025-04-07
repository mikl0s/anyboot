// src/store/wizardStore.ts
import { create } from 'zustand';

// Define the routes centrally
export const stepRoutes: { [key: number]: string } = {
  1: '/',       // Corresponds to currentStep = 1
  2: '/step2',  // Corresponds to currentStep = 2
  3: '/step3',  // Corresponds to currentStep = 3
  // Add more steps as needed
};
const totalSteps = Object.keys(stepRoutes).length;

interface WizardState {
  currentStep: number;
  selectedDiskId: string | null;
  actions: {
    setCurrentStep: (step: number) => void;
    setSelectedDiskId: (diskId: string | null) => void;
    goToNextStep: () => void;
    goToPreviousStep: () => void;
  };
}

export const useWizardStore = create<WizardState>((set, get) => ({
  currentStep: 1, // Start at step 1
  selectedDiskId: null,
  actions: {
    setCurrentStep: (step) => {
      if (step >= 1 && step <= totalSteps) {
        set({ currentStep: step });
      }
    },
    setSelectedDiskId: (diskId) => set({ selectedDiskId: diskId }),
    goToNextStep: () => {
      const { currentStep } = get();
      if (currentStep < totalSteps) {
        set({ currentStep: currentStep + 1 });
      }
    },
    goToPreviousStep: () => {
      const { currentStep } = get();
      if (currentStep > 1) {
        set({ currentStep: currentStep - 1 });
      }
    },
  },
}));

// Selector hook for actions to prevent unnecessary re-renders
export const useWizardActions = () => useWizardStore((state) => state.actions);

// Helper to get the route for the current step (optional, can be done in component)
export const getCurrentStepRoute = () => {
    const state = useWizardStore.getState();
    return stepRoutes[state.currentStep] || '/';
}
