// Sale Form Validation Schema
import { z } from 'zod';

// Common sales channels for suggestions
export const SALES_CHANNEL_SUGGESTIONS = [
  'Facebook Marketplace',
  'eBay',
  'Mercari',
  'Poshmark',
  'Amazon',
  'Etsy',
  'Craigslist',
  'OfferUp',
  'Local Sale',
  'Consignment',
  'Yard Sale',
  'Other',
] as const;

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

  // Sales channel (optional but encouraged)
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

// Default values for new sale form
export function getDefaultSaleFormValues(listingPrice?: number | null): SaleFormData {
  const today = new Date().toISOString().split('T')[0];

  return {
    sale_price: listingPrice ?? 0,
    sale_date: today,
    sales_channel: null,
    buyer_notes: null,
  };
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
