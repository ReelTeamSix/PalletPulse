// PalletPulse Subscription Tier Limits
// Based on pricing tiers from PALLETPULSE_ONESHOT_CONTEXT.md

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface TierLimits {
  pallets: number;
  items: number;
  photosPerItem: number;
  aiDescriptionsPerMonth: number;
  analyticsRetentionDays: number;
  csvExport: boolean;
  pdfExport: boolean;
  expenseTracking: boolean;
  // Mileage tracking features (tiered)
  mileageTracking: boolean;        // Basic manual mileage entry (Starter+)
  mileageSavedRoutes: boolean;     // Save frequent routes for quick-log (Pro+)
  bulkImportExport: boolean;
  prioritySupport: boolean;
  multiUser: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    pallets: 1,
    items: 20,
    photosPerItem: 1,
    aiDescriptionsPerMonth: 0,
    analyticsRetentionDays: 30,
    csvExport: false,
    pdfExport: false,
    expenseTracking: false,
    mileageTracking: false,
    mileageSavedRoutes: false,
    bulkImportExport: false,
    prioritySupport: false,
    multiUser: false,
  },
  starter: {
    pallets: 25,
    items: 500,
    photosPerItem: 3,
    aiDescriptionsPerMonth: 50,
    analyticsRetentionDays: -1, // Unlimited
    csvExport: true,
    pdfExport: false,
    expenseTracking: true,
    mileageTracking: true,       // Manual mileage entry
    mileageSavedRoutes: false,   // Upgrade to Pro for saved routes
    bulkImportExport: false,
    prioritySupport: false,
    multiUser: false,
  },
  pro: {
    pallets: -1, // Unlimited
    items: -1,   // Unlimited
    photosPerItem: 10,
    aiDescriptionsPerMonth: 200,
    analyticsRetentionDays: -1, // Unlimited
    csvExport: true,
    pdfExport: true,
    expenseTracking: true,
    mileageTracking: true,       // Manual mileage entry
    mileageSavedRoutes: true,    // Save frequent routes for quick-log
    bulkImportExport: true,
    prioritySupport: true,
    multiUser: false,
  },
  enterprise: {
    pallets: -1, // Unlimited
    items: -1,   // Unlimited
    photosPerItem: -1, // Unlimited
    aiDescriptionsPerMonth: -1, // Unlimited
    analyticsRetentionDays: -1, // Unlimited
    csvExport: true,
    pdfExport: true,
    expenseTracking: true,
    mileageTracking: true,
    mileageSavedRoutes: true,
    bulkImportExport: true,
    prioritySupport: true,
    multiUser: true,
  },
} as const;

export const TIER_PRICING = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 9.99, annual: 99.99 },
  pro: { monthly: 24.99, annual: 249.99 },
  enterprise: { monthly: null, annual: null }, // Custom pricing
} as const;

// Usage thresholds for UI indicators
export const USAGE_THRESHOLDS = {
  warning: 0.75,  // Yellow at 75%
  critical: 0.99, // Red at 99%
} as const;

/**
 * Check if a limit value means "unlimited"
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Check if user can perform an action based on their tier limits
 */
export function canPerformAction(
  tier: SubscriptionTier,
  limitType: keyof TierLimits,
  currentCount: number
): boolean {
  const limit = TIER_LIMITS[tier][limitType];

  // Boolean limits
  if (typeof limit === 'boolean') {
    return limit;
  }

  // Numeric limits
  if (isUnlimited(limit as number)) {
    return true;
  }

  return currentCount < (limit as number);
}

/**
 * Get usage percentage for a limit type
 */
export function getUsagePercentage(
  tier: SubscriptionTier,
  limitType: 'pallets' | 'items' | 'photosPerItem' | 'aiDescriptionsPerMonth',
  currentCount: number
): number | null {
  const limit = TIER_LIMITS[tier][limitType];

  if (isUnlimited(limit)) {
    return null; // No percentage for unlimited
  }

  return (currentCount / limit) * 100;
}
