// Pallet Pro Subscription Tier Limits
// Based on pricing tiers from PALLETPULSE_ONESHOT_CONTEXT.md

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface TierLimits {
  // Pallet limits - separated into active (in-progress) and archived (completed)
  activePallets: number;     // Pallets with status 'unprocessed' or 'processing'
  archivedPallets: number;   // Pallets with status 'completed'

  // Item limits - separated into active (unsold) and archived (sold)
  activeItems: number;       // Items with status 'unlisted' or 'listed'
  archivedItems: number;     // Items with status 'sold'

  // Photo limits
  photosPerItem: number;
  archivedPhotoRetentionDays: number; // Days to keep photos after item sold (-1 = unlimited)

  // Feature limits
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

// Photo cleanup configuration by tier
// Determines how photos are handled for sold/archived items
export interface PhotoCleanupConfig {
  retentionDays: number;    // Days after sale before cleanup (-1 = never)
  keepFirstPhoto: boolean;  // Keep hero photo even after cleanup
}

export const PHOTO_CLEANUP_CONFIG: Record<SubscriptionTier, PhotoCleanupConfig> = {
  free: { retentionDays: 30, keepFirstPhoto: false },      // Delete all after 30 days
  starter: { retentionDays: 90, keepFirstPhoto: true },    // Keep first photo only after 90 days
  pro: { retentionDays: -1, keepFirstPhoto: true },        // Keep all forever
  enterprise: { retentionDays: -1, keepFirstPhoto: true }, // Keep all forever
};

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    // Limits based on market research: casual resellers do 1-2 pallets/month
    activePallets: 2,        // Covers typical monthly cycle
    archivedPallets: 10,     // ~6-12 months of history
    activeItems: 100,        // 2 pallets × ~50 items average
    archivedItems: 200,      // ~4 pallets worth of sold history
    photosPerItem: 1,
    archivedPhotoRetentionDays: 30,  // Photos deleted after 30 days
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
    // For growing resellers: 2-3 months inventory buffer
    activePallets: 5,
    archivedPallets: -1,     // Unlimited - paying customers keep full history
    activeItems: 500,        // 5 pallets × ~100 items max
    archivedItems: -1,       // Unlimited
    photosPerItem: 3,
    archivedPhotoRetentionDays: 90,  // Keep first photo, delete rest after 90 days
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
    // For serious resellers: no limits on core features
    activePallets: -1,       // Unlimited
    archivedPallets: -1,     // Unlimited
    activeItems: -1,         // Unlimited
    archivedItems: -1,       // Unlimited
    photosPerItem: 10,
    archivedPhotoRetentionDays: -1,  // Photos kept forever
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
    // For teams and businesses: everything unlimited
    activePallets: -1,
    archivedPallets: -1,
    activeItems: -1,
    archivedItems: -1,
    photosPerItem: -1,       // Unlimited
    archivedPhotoRetentionDays: -1,
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

// Tier display configuration for badges and UI elements
// Centralized here for consistency across the app
export const TIER_DISPLAY = {
  free: {
    label: 'Free Plan',
    shortLabel: 'FREE',
    color: '#F59E0B', // Amber/warning
    icon: 'star-outline',
  },
  starter: {
    label: 'Starter',
    shortLabel: 'STARTER',
    color: '#2563EB', // Primary blue
    icon: 'star-half',
  },
  pro: {
    label: 'Pro',
    shortLabel: 'PRO',
    color: '#8B5CF6', // Purple for premium feel
    icon: 'star',
  },
  enterprise: {
    label: 'Enterprise',
    shortLabel: 'ENTERPRISE',
    color: '#D97706', // Amber/gold for top tier
    icon: 'star',
  },
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
  limitType: 'activePallets' | 'archivedPallets' | 'activeItems' | 'archivedItems' | 'photosPerItem' | 'aiDescriptionsPerMonth',
  currentCount: number
): number | null {
  const limit = TIER_LIMITS[tier][limitType];

  if (isUnlimited(limit)) {
    return null; // No percentage for unlimited
  }

  return (currentCount / limit) * 100;
}

/**
 * Check if an item's photos should be cleaned based on tier
 */
export function shouldCleanArchivedPhotos(
  tier: SubscriptionTier,
  soldDate: Date | string,
  photoCount: number
): boolean {
  const config = PHOTO_CLEANUP_CONFIG[tier];

  // No cleanup if unlimited retention
  if (config.retentionDays === -1) return false;

  // No photos to clean
  if (photoCount === 0) return false;

  // For tiers that keep first photo, only clean if more than 1 photo
  if (config.keepFirstPhoto && photoCount <= 1) return false;

  const soldAt = typeof soldDate === 'string' ? new Date(soldDate) : soldDate;
  const daysSinceSold = Math.floor((Date.now() - soldAt.getTime()) / (1000 * 60 * 60 * 24));

  return daysSinceSold > config.retentionDays;
}
