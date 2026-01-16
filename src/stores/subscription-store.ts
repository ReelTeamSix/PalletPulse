// Subscription Store - Zustand store for RevenueCat subscription management
// Phase 10: Full subscription integration with tier enforcement
import { create } from 'zustand';
import { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import {
  initializeRevenueCat,
  identifyUser,
  logOutUser,
  getCustomerInfo,
  getOfferings,
  purchasePackage as rcPurchasePackage,
  restorePurchases as rcRestorePurchases,
  getTierFromEntitlements,
  getExpirationDate,
  getBillingCycle,
  willRenew,
  isConfigured,
} from '@/src/lib/revenuecat';
import { SubscriptionTier, TIER_LIMITS, TierLimits, canPerformAction } from '@/src/constants/tier-limits';
import { useOnboardingStore } from './onboarding-store';

export interface SubscriptionState {
  // State
  tier: SubscriptionTier;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;

  // Computed subscription details
  expirationDate: Date | null;
  billingCycle: 'monthly' | 'annual' | null;
  willRenew: boolean;

  // Actions
  initialize: (userId?: string) => Promise<void>;
  identify: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; restored: boolean; error?: string }>;
  clearError: () => void;

  // Helpers
  getEffectiveTier: () => SubscriptionTier;
  canPerform: (limitType: keyof TierLimits, currentCount: number) => boolean;
  getLimitForAction: (limitType: keyof TierLimits) => number | boolean;
  getRequiredTierForAction: (limitType: keyof TierLimits, currentCount: number) => SubscriptionTier | null;
}

export const useSubscriptionStore = create<SubscriptionState>()((set, get) => ({
  // Initial state
  tier: 'free',
  isLoading: false,
  isInitialized: false,
  error: null,
  customerInfo: null,
  offerings: null,
  expirationDate: null,
  billingCycle: null,
  willRenew: false,

  /**
   * Initialize RevenueCat SDK and fetch initial subscription status
   */
  initialize: async (userId?: string) => {
    // Skip if not configured
    if (!isConfigured()) {
      console.log('RevenueCat: Not configured, using free tier');
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      await initializeRevenueCat(userId);

      // Get initial customer info
      const customerInfo = await getCustomerInfo();
      const tier = getTierFromEntitlements(customerInfo);

      set({
        isInitialized: true,
        isLoading: false,
        customerInfo,
        tier,
        expirationDate: getExpirationDate(customerInfo),
        billingCycle: getBillingCycle(customerInfo),
        willRenew: willRenew(customerInfo),
      });

      // Sync with onboarding store
      const onboardingStore = useOnboardingStore.getState();
      if (!onboardingStore.trial.isActive && tier !== 'free') {
        // User has a real subscription, update onboarding store
        onboardingStore.completeOnboarding(tier, null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize subscriptions';
      console.error('Subscription initialization error:', error);
      set({ isLoading: false, error: message, isInitialized: true });
    }
  },

  /**
   * Identify user with RevenueCat (call after login)
   */
  identify: async (userId: string) => {
    if (!isConfigured()) return;

    set({ isLoading: true, error: null });

    try {
      const customerInfo = await identifyUser(userId);
      const tier = getTierFromEntitlements(customerInfo);

      set({
        isLoading: false,
        customerInfo,
        tier,
        expirationDate: getExpirationDate(customerInfo),
        billingCycle: getBillingCycle(customerInfo),
        willRenew: willRenew(customerInfo),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to identify user';
      set({ isLoading: false, error: message });
    }
  },

  /**
   * Log out user from RevenueCat
   */
  logout: async () => {
    if (!isConfigured()) return;

    try {
      await logOutUser();
      set({
        tier: 'free',
        customerInfo: null,
        expirationDate: null,
        billingCycle: null,
        willRenew: false,
      });
    } catch (error) {
      console.error('Failed to log out from RevenueCat:', error);
    }
  },

  /**
   * Refresh subscription status from RevenueCat
   */
  refreshSubscription: async () => {
    if (!isConfigured()) return;

    set({ isLoading: true, error: null });

    try {
      const customerInfo = await getCustomerInfo();
      const tier = getTierFromEntitlements(customerInfo);

      set({
        isLoading: false,
        customerInfo,
        tier,
        expirationDate: getExpirationDate(customerInfo),
        billingCycle: getBillingCycle(customerInfo),
        willRenew: willRenew(customerInfo),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh subscription';
      set({ isLoading: false, error: message });
    }
  },

  /**
   * Load available subscription offerings
   */
  loadOfferings: async () => {
    if (!isConfigured()) return;

    set({ isLoading: true, error: null });

    try {
      const offerings = await getOfferings();
      set({ isLoading: false, offerings });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load offerings';
      set({ isLoading: false, error: message });
    }
  },

  /**
   * Purchase a subscription package
   */
  purchasePackage: async (pkg: PurchasesPackage) => {
    if (!isConfigured()) {
      return { success: false, error: 'Subscriptions not configured' };
    }

    set({ isLoading: true, error: null });

    try {
      const { customerInfo, success } = await rcPurchasePackage(pkg);

      if (success) {
        const tier = getTierFromEntitlements(customerInfo);

        set({
          isLoading: false,
          customerInfo,
          tier,
          expirationDate: getExpirationDate(customerInfo),
          billingCycle: getBillingCycle(customerInfo),
          willRenew: willRenew(customerInfo),
        });

        // Update onboarding store - trial is now converted
        const onboardingStore = useOnboardingStore.getState();
        onboardingStore.endTrial();
        onboardingStore.completeOnboarding(tier, null);

        return { success: true };
      }

      set({ isLoading: false });
      return { success: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Purchase failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  /**
   * Restore previous purchases
   */
  restorePurchases: async () => {
    if (!isConfigured()) {
      return { success: false, restored: false, error: 'Subscriptions not configured' };
    }

    set({ isLoading: true, error: null });

    try {
      const customerInfo = await rcRestorePurchases();
      const tier = getTierFromEntitlements(customerInfo);
      const restored = tier !== 'free';

      set({
        isLoading: false,
        customerInfo,
        tier,
        expirationDate: getExpirationDate(customerInfo),
        billingCycle: getBillingCycle(customerInfo),
        willRenew: willRenew(customerInfo),
      });

      if (restored) {
        // Update onboarding store with restored tier
        const onboardingStore = useOnboardingStore.getState();
        onboardingStore.completeOnboarding(tier, null);
      }

      return { success: true, restored };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore purchases';
      set({ isLoading: false, error: message });
      return { success: false, restored: false, error: message };
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Get effective tier (considers trial from onboarding store)
   */
  getEffectiveTier: () => {
    const { tier } = get();
    const onboardingStore = useOnboardingStore.getState();

    // Check if trial is active
    const isTrialActive = onboardingStore.checkTrialStatus();

    if (isTrialActive) {
      return onboardingStore.trial.trialTier; // 'pro' during trial
    }

    // If RevenueCat is configured and has a subscription, use that
    if (isConfigured() && tier !== 'free') {
      return tier;
    }

    // Fall back to onboarding store's current tier
    return onboardingStore.currentTier;
  },

  /**
   * Check if user can perform an action based on their tier limits
   */
  canPerform: (limitType: keyof TierLimits, currentCount: number) => {
    const effectiveTier = get().getEffectiveTier();
    return canPerformAction(effectiveTier, limitType, currentCount);
  },

  /**
   * Get limit value for a specific action
   */
  getLimitForAction: (limitType: keyof TierLimits) => {
    const effectiveTier = get().getEffectiveTier();
    return TIER_LIMITS[effectiveTier][limitType];
  },

  /**
   * Determine which tier is required to perform an action
   * Returns null if current tier allows the action
   */
  getRequiredTierForAction: (limitType: keyof TierLimits, currentCount: number) => {
    const effectiveTier = get().getEffectiveTier();

    // If current tier allows, return null
    if (canPerformAction(effectiveTier, limitType, currentCount)) {
      return null;
    }

    // Check which tier would allow this action
    const tiers: SubscriptionTier[] = ['starter', 'pro', 'enterprise'];

    for (const tier of tiers) {
      if (canPerformAction(tier, limitType, currentCount)) {
        return tier;
      }
    }

    // Enterprise is the highest tier
    return 'enterprise';
  },
}));

// Hook for easy access to effective tier
export function useEffectiveTier(): SubscriptionTier {
  const getEffectiveTier = useSubscriptionStore((state) => state.getEffectiveTier);
  return getEffectiveTier();
}

// Hook for checking if user can perform an action
export function useCanPerform(limitType: keyof TierLimits, currentCount: number): boolean {
  const canPerform = useSubscriptionStore((state) => state.canPerform);
  return canPerform(limitType, currentCount);
}

// Hook for getting required tier for an upgrade prompt
export function useRequiredTier(limitType: keyof TierLimits, currentCount: number): SubscriptionTier | null {
  const getRequiredTierForAction = useSubscriptionStore((state) => state.getRequiredTierForAction);
  return getRequiredTierForAction(limitType, currentCount);
}
