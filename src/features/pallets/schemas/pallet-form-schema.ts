// Pallet Form Validation Schema
import { z } from 'zod';
import { SourceType, PalletStatus } from '@/src/types/database';

// Source type options for dropdown
export const SOURCE_TYPE_OPTIONS: { label: string; value: SourceType }[] = [
  { label: 'Pallet', value: 'pallet' },
  { label: 'Mystery Box', value: 'mystery_box' },
  { label: 'Thrift Store', value: 'thrift' },
  { label: 'Garage Sale', value: 'garage_sale' },
  { label: 'Retail Arbitrage', value: 'retail_arbitrage' },
  { label: 'Other', value: 'other' },
];

// Pallet status options
export const PALLET_STATUS_OPTIONS: { label: string; value: PalletStatus }[] = [
  { label: 'Unprocessed', value: 'unprocessed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
];

// Common supplier suggestions
export const SUPPLIER_SUGGESTIONS = [
  'GRPL',
  'Liquidation Land',
  'Amazon Returns',
  'Target Liquidation',
  'Walmart Liquidation',
  'Home Depot Returns',
  'Costco Returns',
];

// Pallet form schema
export const palletFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Pallet name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),

  supplier: z
    .string()
    .max(100, 'Supplier must be 100 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),

  source_type: z
    .enum(['pallet', 'thrift', 'garage_sale', 'retail_arbitrage', 'mystery_box', 'other'] as const)
    .default('pallet'),

  purchase_cost: z
    .number({ message: 'Purchase cost must be a number' })
    .min(0, 'Purchase cost cannot be negative')
    .max(999999.99, 'Purchase cost cannot exceed $999,999.99'),

  sales_tax: z
    .number({ message: 'Sales tax must be a number' })
    .min(0, 'Sales tax cannot be negative')
    .max(99999.99, 'Sales tax cannot exceed $99,999.99')
    .optional()
    .nullable()
    .transform(val => val ?? null),

  purchase_date: z
    .string()
    .min(1, 'Purchase date is required')
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      'Invalid date format'
    )
    .refine(
      (date) => {
        const parsed = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return parsed <= today;
      },
      'Purchase date cannot be in the future'
    ),

  status: z
    .enum(['unprocessed', 'processing', 'completed'] as const)
    .default('unprocessed'),

  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),
});

// Type inference
export type PalletFormData = z.infer<typeof palletFormSchema>;

// Default values for new pallet form
export const defaultPalletFormValues: Partial<PalletFormData> = {
  name: '',
  supplier: null,
  source_type: 'pallet',
  purchase_cost: 0,
  sales_tax: null,
  purchase_date: new Date().toISOString().split('T')[0],
  status: 'unprocessed',
  notes: null,
};

// Helper to generate auto-suggested pallet name
export function generatePalletName(existingPallets: { name: string }[]): string {
  const palletNumbers = existingPallets
    .map(p => {
      const match = p.name.match(/^Pallet\s*#?(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);

  const nextNumber = palletNumbers.length > 0 ? Math.max(...palletNumbers) + 1 : 1;
  return `Pallet #${nextNumber}`;
}

// Helper to calculate total cost (purchase + tax)
export function calculateTotalCost(purchaseCost: number, salesTax: number | null): number {
  return purchaseCost + (salesTax || 0);
}

// Helper to split cost evenly across multiple pallets
export function splitCostEvenly(totalCost: number, numberOfPallets: number): number {
  if (numberOfPallets <= 0) return totalCost;
  return Math.round((totalCost / numberOfPallets) * 100) / 100;
}
