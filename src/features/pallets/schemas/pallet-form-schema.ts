// Pallet Form Validation Schema
import { z } from 'zod';
import { PalletStatus } from '@/src/types/database';

// Pallet status options (internal workflow)
export const PALLET_STATUS_OPTIONS: { label: string; value: PalletStatus }[] = [
  { label: 'Unprocessed', value: 'unprocessed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
];

// Pallet form schema - simplified for flexibility
export const palletFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Pallet name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),

  // Freeform supplier field - user builds their own list over time
  supplier: z
    .string()
    .max(100, 'Supplier must be 100 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),

  // Freeform source name - e.g., "Amazon Monster", "Walmart Medium", "Target Undeliverables"
  source_name: z
    .string()
    .max(100, 'Source name must be 100 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null),

  purchase_cost: z
    .number({ message: 'Purchase cost must be a number' })
    .min(0, 'Purchase cost cannot be negative')
    .max(999999.99, 'Purchase cost cannot exceed $999,999.99'),

  // Sales tax as dollar amount (calculated from rate or entered manually)
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

// Helper to get local date as YYYY-MM-DD string (avoids timezone issues with toISOString)
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Default values for new pallet form (function to ensure fresh date each time)
export function getDefaultPalletFormValues(): Partial<PalletFormData> {
  return {
    name: '',
    supplier: null,
    source_name: null,
    purchase_cost: 0,
    sales_tax: null,
    purchase_date: getLocalDateString(),
    status: 'unprocessed',
    notes: null,
  };
}

// Legacy export for backwards compatibility
export const defaultPalletFormValues = getDefaultPalletFormValues();

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

// Helper to calculate sales tax from rate
export function calculateSalesTaxFromRate(purchaseCost: number, taxRatePercent: number): number {
  if (taxRatePercent <= 0) return 0;
  return Math.round((purchaseCost * taxRatePercent / 100) * 100) / 100;
}

// Helper to split cost evenly across multiple pallets
export function splitCostEvenly(totalCost: number, numberOfPallets: number): number {
  if (numberOfPallets <= 0) return totalCost;
  return Math.round((totalCost / numberOfPallets) * 100) / 100;
}

// Get unique values from existing pallets for autocomplete
export function getUniqueSuppliers(pallets: { supplier: string | null }[]): string[] {
  const suppliers = pallets
    .map(p => p.supplier)
    .filter((s): s is string => s !== null && s.trim() !== '');
  return [...new Set(suppliers)].sort();
}

export function getUniqueSourceNames(pallets: { source_name: string | null }[]): string[] {
  const names = pallets
    .map(p => p.source_name)
    .filter((s): s is string => s !== null && s.trim() !== '');
  return [...new Set(names)].sort();
}
