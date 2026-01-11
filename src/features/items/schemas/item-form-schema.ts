// Item Form Validation Schema
import { z } from 'zod';
import { ItemCondition, ItemStatus } from '@/src/types/database';

// Item condition options for dropdown
export const ITEM_CONDITION_OPTIONS: { label: string; value: ItemCondition }[] = [
  { label: 'New', value: 'new' },
  { label: 'Open Box', value: 'open_box' },
  { label: 'Used - Good', value: 'used_good' },
  { label: 'Used - Fair', value: 'used_fair' },
  { label: 'Damaged', value: 'damaged' },
  { label: 'For Parts', value: 'for_parts' },
  { label: 'Unsellable', value: 'unsellable' },
];

// Item status options
export const ITEM_STATUS_OPTIONS: { label: string; value: ItemStatus }[] = [
  { label: 'Unlisted', value: 'unprocessed' },
  { label: 'Listed', value: 'listed' },
  { label: 'Sold', value: 'sold' },
];

// Common sales channels
export const SALES_CHANNEL_SUGGESTIONS = [
  'eBay',
  'Facebook Marketplace',
  'Mercari',
  'Poshmark',
  'Amazon',
  'Etsy',
  'Craigslist',
  'OfferUp',
  'Local Sale',
  'Consignment',
];

// Item form schema
export const itemFormSchema = z.object({
  // Basic Info
  name: z
    .string()
    .trim()
    .min(1, 'Item name is required')
    .max(50, 'Name must be 50 characters or less'),

  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),

  quantity: z
    .number({ message: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(9999, 'Quantity cannot exceed 9999')
    .default(1),

  condition: z
    .enum(['new', 'open_box', 'used_good', 'used_fair', 'damaged', 'for_parts', 'unsellable'] as const)
    .default('used_good'),

  // Pricing
  retail_price: z
    .number({ message: 'Retail price must be a number' })
    .min(0, 'Retail price cannot be negative')
    .max(999999.99, 'Retail price cannot exceed $999,999.99')
    .optional()
    .nullable()
    .transform(val => val ?? null),

  listing_price: z
    .number({ message: 'Listing price must be a number' })
    .min(0, 'Listing price cannot be negative')
    .max(999999.99, 'Listing price cannot exceed $999,999.99')
    .optional()
    .nullable()
    .transform(val => val ?? null),

  // For individual items (not from pallet)
  purchase_cost: z
    .number({ message: 'Purchase cost must be a number' })
    .min(0, 'Purchase cost cannot be negative')
    .max(999999.99, 'Purchase cost cannot exceed $999,999.99')
    .optional()
    .nullable()
    .transform(val => val ?? null),

  // Organization
  storage_location: z
    .string()
    .max(100, 'Storage location must be 100 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),

  status: z
    .enum(['unprocessed', 'listed', 'sold'] as const)
    .default('unprocessed'),

  barcode: z
    .string()
    .max(100, 'Barcode must be 100 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),

  // Source (for individual items not from pallet)
  source_name: z
    .string()
    .max(100, 'Source name must be 100 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),

  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),

  // Pallet link (null for individual items)
  pallet_id: z
    .preprocess(
      (val) => (val === '' ? null : val),
      z.string().uuid('Invalid pallet ID').nullable()
    )
    .optional()
    .nullable()
    .transform(val => val || null),
});

// Type inference
export type ItemFormData = z.infer<typeof itemFormSchema>;

// Default values for new item form
export const defaultItemFormValues: Partial<ItemFormData> = {
  name: '',
  description: null,
  quantity: 1,
  condition: 'used_good',
  retail_price: null,
  listing_price: null,
  purchase_cost: null,
  storage_location: null,
  status: 'unprocessed',
  barcode: null,
  source_name: null,
  notes: null,
  pallet_id: null,
};

// Helper to calculate profit for an item
export function calculateItemProfit(
  salePrice: number | null,
  allocatedCost: number | null,
  purchaseCost: number | null
): number {
  if (salePrice === null) return 0;
  const cost = allocatedCost ?? purchaseCost ?? 0;
  return salePrice - cost;
}

// Helper to calculate ROI for an item
export function calculateItemROI(
  salePrice: number | null,
  allocatedCost: number | null,
  purchaseCost: number | null
): number {
  if (salePrice === null) return 0;
  const cost = allocatedCost ?? purchaseCost ?? 0;
  if (cost === 0) return salePrice > 0 ? 100 : 0;
  return ((salePrice - cost) / cost) * 100;
}

// Get condition display color
export function getConditionColor(condition: ItemCondition): string {
  switch (condition) {
    case 'new':
      return '#2E7D32'; // Green
    case 'open_box':
      return '#1976D2'; // Blue
    case 'used_good':
      return '#388E3C'; // Light green
    case 'used_fair':
      return '#FFA000'; // Orange
    case 'damaged':
      return '#F57C00'; // Dark orange
    case 'for_parts':
      return '#E64A19'; // Deep orange
    case 'unsellable':
      return '#D32F2F'; // Red
    default:
      return '#9E9E9E'; // Grey
  }
}

// Get status display color
export function getStatusColor(status: ItemStatus): string {
  switch (status) {
    case 'unprocessed':
      return '#9E9E9E'; // Grey
    case 'listed':
      return '#1976D2'; // Blue
    case 'sold':
      return '#2E7D32'; // Green
    default:
      return '#9E9E9E';
  }
}

// Get unique storage locations from existing items
export function getUniqueStorageLocations(items: { storage_location: string | null }[]): string[] {
  const locations = items
    .map(i => i.storage_location)
    .filter((s): s is string => s !== null && s.trim() !== '');
  return [...new Set(locations)].sort();
}

// Get unique source names from existing items
export function getUniqueItemSourceNames(items: { source_name: string | null }[]): string[] {
  const names = items
    .map(i => i.source_name)
    .filter((s): s is string => s !== null && s.trim() !== '');
  return [...new Set(names)].sort();
}

// Get unique sales channels from existing items
export function getUniqueSalesChannels(items: { sales_channel: string | null }[]): string[] {
  const channels = items
    .map(i => i.sales_channel)
    .filter((s): s is string => s !== null && s.trim() !== '');
  return [...new Set(channels)].sort();
}

// Format condition for display
export function formatCondition(condition: ItemCondition): string {
  const option = ITEM_CONDITION_OPTIONS.find(o => o.value === condition);
  return option?.label ?? condition;
}

// Format status for display
export function formatStatus(status: ItemStatus): string {
  const option = ITEM_STATUS_OPTIONS.find(o => o.value === status);
  return option?.label ?? status;
}
