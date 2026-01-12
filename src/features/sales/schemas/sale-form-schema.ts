// Sale Form Validation Schema
import { z } from 'zod';
import type { SalesPlatform } from '@/src/types/database';
import { useAppSettingsStore } from '@/src/stores/admin-store';

// Platform static configuration (structure only - rates are fetched dynamically)
// Note: rates here are fallback defaults; actual rates come from app_settings
const PLATFORM_STATIC_CONFIG: Record<SalesPlatform, Omit<PlatformFeeConfig, 'rate' | 'rateShipped'> & { defaultRate: number; defaultRateShipped?: number }> = {
  ebay: {
    name: 'eBay',
    defaultRate: 0.1325, // Fallback: 13.25%
    description: 'Final value fee',
    hasShippedRate: false,
  },
  poshmark: {
    name: 'Poshmark',
    defaultRate: 0.20, // Fallback: 20%
    description: 'Flat fee',
    hasShippedRate: false,
  },
  mercari: {
    name: 'Mercari',
    defaultRate: 0.10, // Fallback: 10%
    description: 'Selling fee',
    hasShippedRate: false,
  },
  whatnot: {
    name: 'Whatnot',
    defaultRate: 0.10, // Fallback: 10%
    description: 'Seller fee',
    hasShippedRate: false,
  },
  facebook: {
    name: 'Facebook Marketplace',
    defaultRate: 0, // 0% local
    defaultRateShipped: 0.05, // Fallback: 5% shipped
    description: 'Local free, shipped fee',
    hasShippedRate: true,
  },
  offerup: {
    name: 'OfferUp',
    defaultRate: 0, // 0% local
    defaultRateShipped: 0.129, // Fallback: 12.9% shipped
    description: 'Local free, shipped fee',
    hasShippedRate: true,
  },
  letgo: {
    name: 'LetGo',
    defaultRate: 0, // 0% local (merged with OfferUp)
    defaultRateShipped: 0.129, // Fallback: 12.9% shipped
    description: 'Local free, shipped fee',
    hasShippedRate: true,
  },
  craigslist: {
    name: 'Craigslist',
    defaultRate: 0,
    description: 'Free (no fees)',
    hasShippedRate: false,
  },
  other: {
    name: 'Other/Custom',
    defaultRate: 0,
    description: 'Enter fee manually',
    hasShippedRate: false,
    isManual: true,
  },
};

/**
 * Get the current platform fee rate from app settings
 * Falls back to default if not available
 * Note: For platforms with shipped rates (Facebook, OfferUp), this returns the LOCAL rate (0)
 */
export function getPlatformFeeRate(platform: SalesPlatform): number {
  const config = PLATFORM_STATIC_CONFIG[platform];
  if (!config) return 0;

  // Platforms with shipped rates have 0% for local sales
  if (config.hasShippedRate) {
    return 0;
  }

  // Get dynamic rate from settings store
  const feePercent = useAppSettingsStore.getState().getPlatformFee(platform);

  // If settings store returns a value, convert from percentage to decimal
  if (feePercent > 0) {
    return feePercent / 100;
  }

  // Fallback to default rate
  return config.defaultRate;
}

/**
 * Get the shipped rate for platforms with different local/shipped fees
 */
export function getPlatformShippedRate(platform: SalesPlatform): number {
  const config = PLATFORM_STATIC_CONFIG[platform];
  if (!config || !config.hasShippedRate) return 0;

  // Get dynamic rate from settings store
  const feePercent = useAppSettingsStore.getState().getPlatformFee(platform);

  // If settings store returns a value, use it for shipped rate
  if (feePercent > 0) {
    return feePercent / 100;
  }

  // Fallback to default shipped rate
  return config.defaultRateShipped ?? 0;
}

/**
 * Get full platform config with current dynamic rates
 * Use this when you need the complete PlatformFeeConfig
 */
export function getPlatformConfig(platform: SalesPlatform): PlatformFeeConfig {
  const staticConfig = PLATFORM_STATIC_CONFIG[platform];
  if (!staticConfig) {
    return {
      name: platform,
      rate: 0,
      description: 'Unknown platform',
      hasShippedRate: false,
    };
  }

  const rate = getPlatformFeeRate(platform);
  const rateShipped = staticConfig.hasShippedRate ? getPlatformShippedRate(platform) : undefined;

  // Build dynamic description
  let description: string;
  if (staticConfig.isManual) {
    description = 'Enter fee manually';
  } else if (staticConfig.hasShippedRate) {
    const shippedPercent = ((rateShipped ?? 0) * 100).toFixed(1).replace(/\.0$/, '');
    description = `0% local, ${shippedPercent}% shipped`;
  } else if (rate === 0) {
    description = 'Free (no fees)';
  } else {
    const percent = (rate * 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    description = `${percent}% fee`;
  }

  return {
    name: staticConfig.name,
    rate,
    rateShipped,
    description,
    hasShippedRate: staticConfig.hasShippedRate,
    isManual: staticConfig.isManual,
  };
}

// Legacy export for backward compatibility - builds from dynamic config
export const PLATFORM_PRESETS: Record<SalesPlatform, PlatformFeeConfig> = Object.fromEntries(
  Object.keys(PLATFORM_STATIC_CONFIG).map(key => [key, getPlatformConfig(key as SalesPlatform)])
) as Record<SalesPlatform, PlatformFeeConfig>;

// Platform fee configuration type
export interface PlatformFeeConfig {
  name: string;
  rate: number;
  rateShipped?: number;
  description: string;
  hasShippedRate: boolean;
  isManual?: boolean;
}

// Platform options order (for dropdown)
const PLATFORM_ORDER: SalesPlatform[] = [
  'ebay', 'poshmark', 'mercari', 'whatnot', 'facebook', 'offerup', 'letgo', 'craigslist', 'other'
];

/**
 * Get platform options with current dynamic fees for dropdown
 * Call this function to get up-to-date fee descriptions
 */
export function getPlatformOptions(): { value: SalesPlatform; label: string; description: string }[] {
  return PLATFORM_ORDER.map(platform => {
    const config = getPlatformConfig(platform);
    return {
      value: platform,
      label: config.name.replace(' Marketplace', ''), // Shorten for dropdown
      description: config.description,
    };
  });
}

// Legacy static export - use getPlatformOptions() for dynamic rates
export const PLATFORM_OPTIONS: { value: SalesPlatform; label: string; description: string }[] = getPlatformOptions();

// Common sales channels for suggestions (legacy, kept for backward compatibility)
export const SALES_CHANNEL_SUGGESTIONS = [
  'Facebook Marketplace',
  'eBay',
  'Mercari',
  'Poshmark',
  'WhatNot',
  'Amazon',
  'Etsy',
  'Craigslist',
  'OfferUp',
  'Local Sale',
  'Consignment',
  'Yard Sale',
  'Other',
] as const;

// Valid platform values
const VALID_PLATFORMS = ['ebay', 'poshmark', 'mercari', 'whatnot', 'facebook', 'offerup', 'letgo', 'craigslist', 'other'] as const;

// Sale form schema
export const saleFormSchema = z.object({
  // Sale price is required
  sale_price: z
    .number({ message: 'Sale price must be a number' })
    .min(0, 'Sale price cannot be negative')
    .max(999999.99, 'Sale price cannot exceed $999,999.99'),

  // Sale date defaults to today, cannot be in future
  sale_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (date) => {
        const saleDate = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        return saleDate <= today;
      },
      { message: 'Sale date cannot be in the future' }
    ),

  // Platform where item was sold (new for Phase 8)
  platform: z
    .enum(VALID_PLATFORMS, { message: 'Please select a platform' })
    .nullable()
    .optional()
    .transform(val => val || null),

  // Platform fee - auto-calculated or manual override (new for Phase 8)
  platform_fee: z
    .number({ message: 'Platform fee must be a number' })
    .min(0, 'Platform fee cannot be negative')
    .max(999999.99, 'Platform fee cannot exceed $999,999.99')
    .nullable()
    .optional()
    .transform(val => val ?? null),

  // Shipping cost paid by seller (new for Phase 8)
  shipping_cost: z
    .number({ message: 'Shipping cost must be a number' })
    .min(0, 'Shipping cost cannot be negative')
    .max(9999.99, 'Shipping cost cannot exceed $9,999.99')
    .nullable()
    .optional()
    .transform(val => val ?? null),

  // Sales channel (auto-filled from platform or manual) - kept for backward compat
  sales_channel: z
    .string()
    .max(100, 'Sales channel must be 100 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),

  // Buyer notes (optional)
  buyer_notes: z
    .string()
    .max(500, 'Buyer notes must be 500 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),
});

// Type inference
export type SaleFormData = z.infer<typeof saleFormSchema>;

// Helper to get local date as YYYY-MM-DD string (avoids timezone issues with toISOString)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Default values for new sale form
export function getDefaultSaleFormValues(listingPrice?: number | null): SaleFormData {
  const today = getLocalDateString();

  return {
    sale_price: listingPrice ?? 0,
    sale_date: today,
    platform: null,
    platform_fee: null,
    shipping_cost: null,
    sales_channel: null,
    buyer_notes: null,
  };
}

/**
 * Calculate platform fee based on sale price and platform
 * Uses dynamic rates from app_settings store
 * @param salePrice - The sale price of the item
 * @param platform - The sales platform
 * @param hasShipping - Whether the item is being shipped (affects FB/OfferUp)
 * @returns The calculated platform fee, or 0 if no platform selected
 */
export function calculatePlatformFee(
  salePrice: number,
  platform: SalesPlatform | null,
  hasShipping: boolean = false
): number {
  if (!platform || salePrice <= 0) return 0;

  const staticConfig = PLATFORM_STATIC_CONFIG[platform];
  if (!staticConfig) return 0;

  // Skip auto-calculation for manual/custom platforms
  if (staticConfig.isManual) return 0;

  // For platforms with different shipped rates (Facebook, OfferUp)
  if (staticConfig.hasShippedRate && hasShipping) {
    const shippedRate = getPlatformShippedRate(platform);
    return Math.round(salePrice * shippedRate * 100) / 100;
  }

  // Use dynamic rate from settings
  const rate = getPlatformFeeRate(platform);
  return Math.round(salePrice * rate * 100) / 100;
}

/**
 * Calculate net profit from a sale including all costs
 * @param salePrice - The sale price
 * @param allocatedCost - The allocated cost of the item
 * @param platformFee - The platform fee (optional)
 * @param shippingCost - The shipping cost (optional)
 * @returns Net profit
 */
export function calculateNetProfit(
  salePrice: number,
  allocatedCost: number | null,
  platformFee: number | null = null,
  shippingCost: number | null = null
): number {
  const cost = allocatedCost ?? 0;
  const fees = platformFee ?? 0;
  const shipping = shippingCost ?? 0;

  return salePrice - cost - fees - shipping;
}

/**
 * Get the platform name from enum value
 */
export function getPlatformName(platform: SalesPlatform | null): string {
  if (!platform) return 'Not specified';
  return getPlatformConfig(platform).name;
}

/**
 * Get sales channel from platform (auto-fill helper)
 */
export function getSalesChannelFromPlatform(platform: SalesPlatform | null): string | null {
  if (!platform) return null;
  return getPlatformConfig(platform).name;
}

// Helper to format date for display
// Uses UTC to avoid timezone shifting
export function formatSaleDate(dateString: string): string {
  // Parse YYYY-MM-DD as UTC to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Helper to get sales channel display (handles null/empty)
export function formatSalesChannel(channel: string | null): string {
  if (!channel || channel.trim() === '') {
    return 'Not specified';
  }
  return channel;
}

// Get unique sales channels from existing items
export function getUniqueSalesChannels(items: { sales_channel: string | null }[]): string[] {
  const channels = items
    .map(i => i.sales_channel)
    .filter((s): s is string => s !== null && s.trim() !== '');

  // Combine with suggestions and deduplicate
  const allChannels = [...new Set([...channels, ...SALES_CHANNEL_SUGGESTIONS])];
  return allChannels.sort();
}

// Validate that price is reasonable (warn if very different from listing)
export function getPriceWarning(
  salePrice: number,
  listingPrice: number | null
): string | null {
  if (!listingPrice || listingPrice === 0) return null;

  const difference = salePrice - listingPrice;
  const percentDiff = (difference / listingPrice) * 100;

  if (percentDiff > 50) {
    return `Sale price is ${percentDiff.toFixed(0)}% above listing price`;
  }

  if (percentDiff < -50) {
    return `Sale price is ${Math.abs(percentDiff).toFixed(0)}% below listing price`;
  }

  return null;
}

// Calculate negotiation discount
export function calculateDiscount(
  salePrice: number,
  listingPrice: number | null
): { amount: number; percentage: number } | null {
  if (!listingPrice || listingPrice === 0) return null;

  const amount = listingPrice - salePrice;
  const percentage = (amount / listingPrice) * 100;

  return { amount, percentage };
}
