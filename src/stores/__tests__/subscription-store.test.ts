// Subscription Store Tests - Phase 10
import { useSubscriptionStore } from '../subscription-store';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock RevenueCat
jest.mock('@/src/lib/revenuecat', () => ({
  isConfigured: jest.fn(() => false),
  initializeRevenueCat: jest.fn(),
  identifyUser: jest.fn(),
  logOutUser: jest.fn(),
  getCustomerInfo: jest.fn(),
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  getTierFromEntitlements: jest.fn(() => 'free'),
  getExpirationDate: jest.fn(() => null),
  getBillingCycle: jest.fn(() => null),
  willRenew: jest.fn(() => false),
}));

// Mock onboarding store
jest.mock('../onboarding-store', () => ({
  useOnboardingStore: {
    getState: jest.fn(() => ({
      trial: { isActive: false, trialTier: 'pro' },
      currentTier: 'free',
      checkTrialStatus: jest.fn(() => false),
      completeOnboarding: jest.fn(),
      endTrial: jest.fn(),
    })),
  },
}));

describe('SubscriptionStore', () => {
  beforeEach(() => {
    // Reset store state
    useSubscriptionStore.setState({
      tier: 'free',
      isLoading: false,
      isInitialized: false,
      error: null,
      customerInfo: null,
      offerings: null,
      expirationDate: null,
      billingCycle: null,
      willRenew: false,
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('free');
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
      expect(state.customerInfo).toBeNull();
      expect(state.offerings).toBeNull();
      expect(state.expirationDate).toBeNull();
      expect(state.billingCycle).toBeNull();
      expect(state.willRenew).toBe(false);
    });
  });

  describe('getEffectiveTier', () => {
    it('should return free when RevenueCat not configured and no trial', () => {
      const { getEffectiveTier } = useSubscriptionStore.getState();

      expect(getEffectiveTier()).toBe('free');
    });

    it('should return subscription tier when RevenueCat has subscription', () => {
      // Mock RevenueCat as configured with subscription
      const revenuecat = jest.requireMock('@/src/lib/revenuecat');
      revenuecat.isConfigured.mockReturnValue(true);

      useSubscriptionStore.setState({ tier: 'pro' });

      const { getEffectiveTier } = useSubscriptionStore.getState();

      expect(getEffectiveTier()).toBe('pro');
    });
  });

  describe('canPerform', () => {
    it('should return true for free tier with active pallets under limit', () => {
      const { canPerform } = useSubscriptionStore.getState();

      // Free tier allows 2 active pallets
      expect(canPerform('activePallets', 0)).toBe(true);
      expect(canPerform('activePallets', 1)).toBe(true);
    });

    it('should return false for free tier at active pallet limit', () => {
      const { canPerform } = useSubscriptionStore.getState();

      // Free tier allows 2 active pallets, so at count 2 should fail
      expect(canPerform('activePallets', 2)).toBe(false);
    });

    it('should return true for active items under limit', () => {
      const { canPerform } = useSubscriptionStore.getState();

      // Free tier allows 100 active items
      expect(canPerform('activeItems', 99)).toBe(true);
    });

    it('should return false for active items at limit', () => {
      const { canPerform } = useSubscriptionStore.getState();

      // Free tier allows 100 active items
      expect(canPerform('activeItems', 100)).toBe(false);
    });

    it('should return correct result for boolean limits', () => {
      const { canPerform } = useSubscriptionStore.getState();

      // Free tier doesn't have expense tracking
      expect(canPerform('expenseTracking', 0)).toBe(false);
      expect(canPerform('csvExport', 0)).toBe(false);
    });
  });

  describe('getLimitForAction', () => {
    it('should return correct limit for free tier', () => {
      const { getLimitForAction } = useSubscriptionStore.getState();

      expect(getLimitForAction('activePallets')).toBe(2);
      expect(getLimitForAction('archivedPallets')).toBe(10);
      expect(getLimitForAction('activeItems')).toBe(100);
      expect(getLimitForAction('archivedItems')).toBe(200);
      expect(getLimitForAction('photosPerItem')).toBe(1);
      expect(getLimitForAction('expenseTracking')).toBe(false);
    });

    it('should return correct photo limits for each tier', () => {
      // Free tier - 1 photo
      useSubscriptionStore.setState({ tier: 'free' });
      expect(useSubscriptionStore.getState().getLimitForAction('photosPerItem')).toBe(1);

      // Starter tier - 3 photos
      useSubscriptionStore.setState({ tier: 'starter' });
      const onboardingStoreMock = jest.requireMock('../onboarding-store');
      onboardingStoreMock.useOnboardingStore.getState.mockReturnValue({
        trial: { isActive: false, trialTier: 'pro' },
        currentTier: 'starter',
        checkTrialStatus: jest.fn(() => false),
      });
      expect(useSubscriptionStore.getState().getLimitForAction('photosPerItem')).toBe(3);

      // Pro tier - 10 photos
      useSubscriptionStore.setState({ tier: 'pro' });
      onboardingStoreMock.useOnboardingStore.getState.mockReturnValue({
        trial: { isActive: false, trialTier: 'pro' },
        currentTier: 'pro',
        checkTrialStatus: jest.fn(() => false),
      });
      expect(useSubscriptionStore.getState().getLimitForAction('photosPerItem')).toBe(10);

      // Enterprise tier - unlimited (-1)
      useSubscriptionStore.setState({ tier: 'enterprise' });
      onboardingStoreMock.useOnboardingStore.getState.mockReturnValue({
        trial: { isActive: false, trialTier: 'pro' },
        currentTier: 'enterprise',
        checkTrialStatus: jest.fn(() => false),
      });
      expect(useSubscriptionStore.getState().getLimitForAction('photosPerItem')).toBe(-1);
    });
  });

  describe('canPerform for photos', () => {
    it('should allow photos under limit for free tier', () => {
      // Reset to free tier and ensure onboarding mock returns free
      useSubscriptionStore.setState({ tier: 'free' });
      const onboardingStoreMock = jest.requireMock('../onboarding-store');
      onboardingStoreMock.useOnboardingStore.getState.mockReturnValue({
        trial: { isActive: false, trialTier: 'pro' },
        currentTier: 'free',
        checkTrialStatus: jest.fn(() => false),
      });

      const { canPerform } = useSubscriptionStore.getState();

      expect(canPerform('photosPerItem', 0)).toBe(true);
      expect(canPerform('photosPerItem', 1)).toBe(false); // At limit
    });

    it('should allow more photos for higher tiers', () => {
      // Starter tier allows 3 photos
      useSubscriptionStore.setState({ tier: 'starter' });
      const onboardingStoreMock = jest.requireMock('../onboarding-store');
      onboardingStoreMock.useOnboardingStore.getState.mockReturnValue({
        trial: { isActive: false, trialTier: 'pro' },
        currentTier: 'starter',
        checkTrialStatus: jest.fn(() => false),
      });

      let { canPerform } = useSubscriptionStore.getState();
      expect(canPerform('photosPerItem', 2)).toBe(true);
      expect(canPerform('photosPerItem', 3)).toBe(false); // At limit

      // Pro tier allows 10 photos
      useSubscriptionStore.setState({ tier: 'pro' });
      onboardingStoreMock.useOnboardingStore.getState.mockReturnValue({
        trial: { isActive: false, trialTier: 'pro' },
        currentTier: 'pro',
        checkTrialStatus: jest.fn(() => false),
      });

      ({ canPerform } = useSubscriptionStore.getState());
      expect(canPerform('photosPerItem', 9)).toBe(true);
      expect(canPerform('photosPerItem', 10)).toBe(false); // At limit
    });

    it('should allow unlimited photos for enterprise tier', () => {
      useSubscriptionStore.setState({ tier: 'enterprise' });
      const onboardingStoreMock = jest.requireMock('../onboarding-store');
      onboardingStoreMock.useOnboardingStore.getState.mockReturnValue({
        trial: { isActive: false, trialTier: 'pro' },
        currentTier: 'enterprise',
        checkTrialStatus: jest.fn(() => false),
      });

      const { canPerform } = useSubscriptionStore.getState();
      expect(canPerform('photosPerItem', 0)).toBe(true);
      expect(canPerform('photosPerItem', 50)).toBe(true);
      expect(canPerform('photosPerItem', 100)).toBe(true);
    });
  });

  describe('getRequiredTierForAction', () => {
    it('should return null when current tier allows action', () => {
      const { getRequiredTierForAction } = useSubscriptionStore.getState();

      // Free tier with 0 active pallets should allow adding one
      expect(getRequiredTierForAction('activePallets', 0)).toBeNull();
    });

    it('should return starter when free tier limit exceeded', () => {
      // Ensure we're on free tier
      useSubscriptionStore.setState({ tier: 'free' });
      const onboardingStoreMock = jest.requireMock('../onboarding-store');
      onboardingStoreMock.useOnboardingStore.getState.mockReturnValue({
        trial: { isActive: false, trialTier: 'pro' },
        currentTier: 'free',
        checkTrialStatus: jest.fn(() => false),
      });

      const { getRequiredTierForAction } = useSubscriptionStore.getState();

      // Free tier at 2 active pallets needs upgrade (limit is 2)
      expect(getRequiredTierForAction('activePallets', 2)).toBe('starter');
    });

    it('should return pro when starter limit exceeded', () => {
      useSubscriptionStore.setState({ tier: 'starter' });

      // Mock the getEffectiveTier to return starter
      const onboardingStoreMock = jest.requireMock('../onboarding-store');
      onboardingStoreMock.useOnboardingStore.getState.mockReturnValue({
        trial: { isActive: false, trialTier: 'pro' },
        currentTier: 'starter',
        checkTrialStatus: jest.fn(() => false),
      });

      const { getRequiredTierForAction } = useSubscriptionStore.getState();

      // Starter tier allows 5 active pallets, so at 5 needs pro
      expect(getRequiredTierForAction('activePallets', 5)).toBe('pro');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useSubscriptionStore.setState({ error: 'Some error' });

      const { clearError } = useSubscriptionStore.getState();
      clearError();

      expect(useSubscriptionStore.getState().error).toBeNull();
    });
  });

  describe('initialize (when not configured)', () => {
    it('should set isInitialized without calling RevenueCat', async () => {
      const revenuecat = jest.requireMock('@/src/lib/revenuecat');
      revenuecat.isConfigured.mockReturnValue(false);

      const { initialize } = useSubscriptionStore.getState();
      await initialize();

      const state = useSubscriptionStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(revenuecat.initializeRevenueCat).not.toHaveBeenCalled();
    });
  });

  describe('purchasePackage (when not configured)', () => {
    it('should return error when subscriptions not configured', async () => {
      const revenuecat = jest.requireMock('@/src/lib/revenuecat');
      revenuecat.isConfigured.mockReturnValue(false);

      const { purchasePackage } = useSubscriptionStore.getState();
      const result = await purchasePackage({} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscriptions not configured');
    });
  });

  describe('restorePurchases (when not configured)', () => {
    it('should return error when subscriptions not configured', async () => {
      const revenuecat = jest.requireMock('@/src/lib/revenuecat');
      revenuecat.isConfigured.mockReturnValue(false);

      const { restorePurchases } = useSubscriptionStore.getState();
      const result = await restorePurchases();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscriptions not configured');
    });
  });
});
