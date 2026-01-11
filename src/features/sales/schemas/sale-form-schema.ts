// Sale Form Validation Schema
import { z } from 'zod';
import type { SalesPlatform } from '@/src/types/database';

// Sales platforms with fee structures
export const PLATFORM_PRESETS: Record<SalesPlatform, PlatformFeeConfig> = {
  ebay: {
    name: 'eBay',
    rate: 0.1325, // 13.25% final value fee
    description: '13.25% final value fee',
    hasShippedRate: false,
  },
  poshmark: {
    name: 'Poshmark',
    rate: 0.20, // 20% flat
    description: '20% flat fee',
    hasShippedRate: false,
  },
  mercari: {
    name: 'Mercari',
    rate: 0.10, // 10%
    description: '10% selling fee',
    hasShippedRate: false,
  },
  whatnot: {
    name: 'Whatnot',
    rate: 0.089, // 8.9% seller fee
    description: '8.9% seller fee',
    hasShippedRate: false,
  },
  facebook: {
    name: 'Facebook Marketplace',
    rate: 0, // 0% local
    rateShipped: 0.05, // 5% shipped
    description: '0% local, 5% shipped',
    hasShippedRate: true,
  },
  offerup: {
    name: 'OfferUp',
    rate: 0, // 0% local
    rateShipped: 0.129, // 12.9% shipped
    description: '0% local, 12.9% shipped',
    hasShippedRate: true,
  },
  letgo: {
    name: 'LetGo',
    rate: 0, // 0% local (merged with OfferUp)
    rateShipped: 0.129, // 12.9% shipped
    description: '0% local, 12.9% shipped',
    hasShippedRate: true,
  },
  craigslist: {
    name: 'Craigslist',
    rate: 0,
    description: 'Free (no fees)',
    hasShippedRate: false,
  },
  other: {
    name: 'Other/Custom',
    rate: 0,
    description: 'Enter fee manually',
    hasShippedRate: false,
    isManual: true,
  },
};

// Platform fee configuration type
export interface PlatformFeeConfig {
  name: string;
  rate: number;
  rateShipped?: number;
  description: string;
  hasShippedRate: boolean;
  isManual?: boolean;
}

// Platform options for dropdown
export const PLATFORM_OPTIONS: { value: SalesPlatform; label: string; description: string }[] = [
  { value: 'ebay', label: 'eBay', description: '13.25% fee' },
  { value: 'poshmark', label: 'Poshmark', description: '20% fee' },
  { value: 'mercari', label: 'Mercari', description: '10% fee' },
  { value: 'whatnot', label: 'Whatnot', description: '8.9% fee' },
  { value: 'facebook', label: 'Facebook', description: '0%/5% shipped' },
  { value: 'offerup', label: 'OfferUp', description: '0%/12.9% shipped' },
  { value: 'letgo', label: 'LetGo', description: '0%/12.9% shipped' },
  { value: 'craigslist', label: 'Craigslist', description: 'Free' },
  { value: 'other', label: 'Other', description: 'Manual' },
];

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

  const config = PLATFORM_PRESETS[platform];
  if (!config) return 0;

  // For platforms with different shipped rates (Facebook, OfferUp)
  if (config.hasShippedRate && hasShipping && config.rateShipped) {
    return Math.round(salePrice * config.rateShipped * 100) / 100;
  }

  return Math.round(salePrice * config.rate * 100) / 100;
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
  return PLATFORM_PRESETS[platform]?.name ?? platform;
}

/**
 * Get sales channel from platform (auto-fill helper)
 */
export function getSalesChannelFromPlatform(platform: SalesPlatform | null): string | null {
  if (!platform) return null;
  return PLATFORM_PRESETS[platform]?.name ?? null;
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
