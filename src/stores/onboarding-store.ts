// Onboarding Store - Zustand store for onboarding and trial state
// Phase 8F: Research-backed onboarding with reverse trial pattern
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionTier } from '@/src/types/database';

// Trial duration in days (based on RevenueCat research: 7 days optimal)
const TRIAL_DURATION_DAYS = 7;

export interface TrialState {
  isActive: boolean;
  startDate: string | null; // ISO date string
  endDate: string | null; // ISO date string
  selectedTier: SubscriptionTier | null; // Tier user selected during onboarding
  trialTier: SubscriptionTier; // Tier they have access to during trial (always 'pro')
}

export interface OnboardingState {
  // Onboarding completion
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: string | null;

  // Trial state (reverse trial pattern)
  trial: TrialState;

  // Current effective tier (trial tier if active, otherwise actual subscription)
  currentTier: SubscriptionTier;

  // Actions
  completeOnboarding: (tier: SubscriptionTier, selectedTier: SubscriptionTier | null) => Promise<void>;
  startTrial: (selectedTier: SubscriptionTier) => Promise<void>;
  endTrial: () => void;
  checkTrialStatus: () => boolean; // Returns true if trial is still active

  // Helpers
  getTrialDaysRemaining: () => number;
  getSelectedTierAfterTrial: () => SubscriptionTier | null;
  isTrialActive: () => boolean;
  resetOnboarding: () => void; // For testing/debugging
}

// Calculate end date from start date
function calculateEndDate(startDate: Date, days: number): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return endDate;
}

// Check if a date is in the past
function isDatePast(dateString: string | null): boolean {
  if (!dateString) return true;
  return new Date(dateString) < new Date();
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      onboardingCompletedAt: null,

      trial: {
        isActive: false,
        startDate: null,
        endDate: null,
        selectedTier: null,
        trialTier: 'pro', // Reverse trial always gives Pro access
      },

      currentTier: 'free',

      completeOnboarding: async (tier, selectedTier) => {
        set({
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date().toISOString(),
          currentTier: tier,
          trial: {
            ...get().trial,
            selectedTier: selectedTier,
          },
        });
      },

      startTrial: async (selectedTier) => {
        const now = new Date();
        const endDate = calculateEndDate(now, TRIAL_DURATION_DAYS);

        set({
          trial: {
            isActive: true,
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            selectedTier: selectedTier,
            trialTier: 'pro', // Always Pro during trial (reverse trial pattern)
          },
          currentTier: 'pro', // Immediate Pro access during trial
        });
      },

      endTrial: () => {
        const { trial } = get();

        set({
          trial: {
            ...trial,
            isActive: false,
          },
          // Downgrade to free if they haven't subscribed
          // In production, this would check RevenueCat for actual subscription
          currentTier: 'free',
        });
      },

      checkTrialStatus: () => {
        const { trial } = get();

        if (!trial.isActive || !trial.endDate) {
          return false;
        }

        const isExpired = isDatePast(trial.endDate);

        if (isExpired && trial.isActive) {
          // Trial has expired, end it
          get().endTrial();
          return false;
        }

        return trial.isActive;
      },

      getTrialDaysRemaining: () => {
        const { trial } = get();

        if (!trial.isActive || !trial.endDate) {
          return 0;
        }

        const now = new Date();
        const endDate = new Date(trial.endDate);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
      },

      getSelectedTierAfterTrial: () => {
        return get().trial.selectedTier;
      },

      isTrialActive: () => {
        return get().checkTrialStatus();
      },

      resetOnboarding: () => {
        set({
          hasCompletedOnboarding: false,
          onboardingCompletedAt: null,
          trial: {
            isActive: false,
            startDate: null,
            endDate: null,
            selectedTier: null,
            trialTier: 'pro',
          },
          currentTier: 'free',
        });
      },
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Hook for checking effective tier (considers trial)
export function useEffectiveTier(): SubscriptionTier {
  const { currentTier, trial, checkTrialStatus } = useOnboardingStore();

  // Check if trial is still active
  const isTrialActive = checkTrialStatus();

  if (isTrialActive) {
    return trial.trialTier; // 'pro' during trial
  }

  return currentTier;
}

// Hook for trial banner display
export function useTrialBanner() {
  const { trial, getTrialDaysRemaining, isTrialActive } = useOnboardingStore();

  const active = isTrialActive();
  const daysRemaining = getTrialDaysRemaining();
  const selectedTier = trial.selectedTier;

  return {
    show: active && daysRemaining <= 3, // Show banner in last 3 days
    daysRemaining,
    selectedTier,
    message: daysRemaining === 1
      ? 'Your Pro trial ends tomorrow'
      : daysRemaining === 0
        ? 'Your Pro trial ends today'
        : `${daysRemaining} days left in your Pro trial`,
  };
}
