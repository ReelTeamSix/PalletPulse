// Onboarding Store Tests - Phase 8F
import { useOnboardingStore } from '../onboarding-store';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('OnboardingStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useOnboardingStore.getState().resetOnboarding();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useOnboardingStore.getState();

      expect(state.hasCompletedOnboarding).toBe(false);
      expect(state.onboardingCompletedAt).toBeNull();
      expect(state.currentTier).toBe('free');
      expect(state.trial.isActive).toBe(false);
      expect(state.trial.startDate).toBeNull();
      expect(state.trial.endDate).toBeNull();
      expect(state.trial.selectedTier).toBeNull();
      expect(state.trial.trialTier).toBe('pro');
    });
  });

  describe('startTrial', () => {
    it('should start a 7-day Pro trial', async () => {
      const { startTrial } = useOnboardingStore.getState();

      await startTrial('starter');

      const state = useOnboardingStore.getState();
      expect(state.trial.isActive).toBe(true);
      expect(state.trial.selectedTier).toBe('starter');
      expect(state.trial.trialTier).toBe('pro'); // Always Pro during trial
      expect(state.currentTier).toBe('pro'); // Pro access during trial
      expect(state.trial.startDate).not.toBeNull();
      expect(state.trial.endDate).not.toBeNull();
    });

    it('should set end date 7 days from start', async () => {
      const { startTrial } = useOnboardingStore.getState();

      await startTrial('pro');

      const state = useOnboardingStore.getState();
      const startDate = new Date(state.trial.startDate!);
      const endDate = new Date(state.trial.endDate!);

      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      expect(diffDays).toBe(7);
    });
  });

  describe('completeOnboarding', () => {
    it('should mark onboarding as complete', async () => {
      const { completeOnboarding } = useOnboardingStore.getState();

      await completeOnboarding('pro', 'starter');

      const state = useOnboardingStore.getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.onboardingCompletedAt).not.toBeNull();
      expect(state.currentTier).toBe('pro');
      expect(state.trial.selectedTier).toBe('starter');
    });

    it('should set free tier when skipping trial', async () => {
      const { completeOnboarding } = useOnboardingStore.getState();

      await completeOnboarding('free', null);

      const state = useOnboardingStore.getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.currentTier).toBe('free');
      expect(state.trial.selectedTier).toBeNull();
    });
  });

  describe('endTrial', () => {
    it('should end trial and downgrade to free', async () => {
      const { startTrial, endTrial } = useOnboardingStore.getState();

      await startTrial('starter');
      expect(useOnboardingStore.getState().currentTier).toBe('pro');

      endTrial();

      const state = useOnboardingStore.getState();
      expect(state.trial.isActive).toBe(false);
      expect(state.currentTier).toBe('free'); // Downgraded
    });
  });

  describe('getTrialDaysRemaining', () => {
    it('should return 0 when no trial is active', () => {
      const { getTrialDaysRemaining } = useOnboardingStore.getState();

      expect(getTrialDaysRemaining()).toBe(0);
    });

    it('should return days remaining during active trial', async () => {
      const { startTrial, getTrialDaysRemaining } = useOnboardingStore.getState();

      await startTrial('starter');

      // Should be close to 7 days (might be 6 or 7 depending on timing)
      const days = getTrialDaysRemaining();
      expect(days).toBeGreaterThanOrEqual(6);
      expect(days).toBeLessThanOrEqual(7);
    });
  });

  describe('checkTrialStatus', () => {
    it('should return false when no trial is active', () => {
      const { checkTrialStatus } = useOnboardingStore.getState();

      expect(checkTrialStatus()).toBe(false);
    });

    it('should return true during active trial', async () => {
      const { startTrial, checkTrialStatus } = useOnboardingStore.getState();

      await startTrial('starter');

      expect(checkTrialStatus()).toBe(true);
    });

    it('should auto-end expired trial', async () => {
      const store = useOnboardingStore.getState();

      // Manually set an expired trial
      useOnboardingStore.setState({
        trial: {
          isActive: true,
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          selectedTier: 'starter',
          trialTier: 'pro',
        },
        currentTier: 'pro',
      });

      const { checkTrialStatus } = useOnboardingStore.getState();
      const result = checkTrialStatus();

      expect(result).toBe(false);
      expect(useOnboardingStore.getState().trial.isActive).toBe(false);
      expect(useOnboardingStore.getState().currentTier).toBe('free');
    });
  });

  describe('isTrialActive', () => {
    it('should return false when no trial', () => {
      const { isTrialActive } = useOnboardingStore.getState();
      expect(isTrialActive()).toBe(false);
    });

    it('should return true when trial is active', async () => {
      const { startTrial, isTrialActive } = useOnboardingStore.getState();

      await startTrial('pro');

      expect(isTrialActive()).toBe(true);
    });
  });

  describe('getSelectedTierAfterTrial', () => {
    it('should return null when no tier selected', () => {
      const { getSelectedTierAfterTrial } = useOnboardingStore.getState();
      expect(getSelectedTierAfterTrial()).toBeNull();
    });

    it('should return selected tier during trial', async () => {
      const { startTrial, getSelectedTierAfterTrial } = useOnboardingStore.getState();

      await startTrial('starter');

      expect(getSelectedTierAfterTrial()).toBe('starter');
    });
  });

  describe('resetOnboarding', () => {
    it('should reset all state to initial values', async () => {
      const store = useOnboardingStore.getState();

      // Set some state
      await store.startTrial('pro');
      await store.completeOnboarding('pro', 'pro');

      // Reset
      store.resetOnboarding();

      const state = useOnboardingStore.getState();
      expect(state.hasCompletedOnboarding).toBe(false);
      expect(state.onboardingCompletedAt).toBeNull();
      expect(state.currentTier).toBe('free');
      expect(state.trial.isActive).toBe(false);
    });
  });
});
