// Expense Form Validation Schema
import { z } from 'zod';
import { ExpenseCategory } from '@/src/types/database';

// Overhead expense categories
// Note: gas, mileage, fees, shipping are deprecated - use Mileage Tracking and per-item costs instead
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'storage',
  'supplies',
  'subscriptions',
  'equipment',
  'other',
];

// Display labels for expense categories
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  storage: 'Storage',
  supplies: 'Supplies',
  subscriptions: 'Subscriptions',
  equipment: 'Equipment',
  other: 'Other',
};

// Category colors for visual distinction
export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  storage: '#4CAF50', // Green
  supplies: '#2196F3', // Blue
  subscriptions: '#9C27B0', // Purple
  equipment: '#FF9800', // Orange
  other: '#9E9E9E', // Grey
};

// Category descriptions for help text
export const EXPENSE_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  storage: 'Storage unit rent, warehouse fees',
  supplies: 'Boxes, tape, bubble wrap, labels',
  subscriptions: 'eBay store fee, software subscriptions',
  equipment: 'Scale, measuring tools, shelving',
  other: 'Miscellaneous business expenses',
};

// Expense form schema
export const expenseFormSchema = z.object({
  // Amount is required, positive, max limit
  amount: z
    .number({ message: 'Amount must be a number' })
    .positive('Amount must be greater than zero')
    .max(999999.99, 'Amount cannot exceed $999,999.99'),

  // Category is required enum
  category: z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]], {
    message: 'Please select a category',
  }),

  // Description is optional
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => (val && val.trim() !== '') ? val : null),

  // Expense date required, cannot be in future
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (date) => {
        const expenseDate = new Date(date + 'T00:00:00'); // Parse as local time
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        return expenseDate <= today;
      },
      { message: 'Expense date cannot be in the future' }
    ),

  // Multi-pallet linking (Phase 8D) - replaces single pallet_id
  pallet_ids: z
    .array(z.string().uuid('Invalid pallet ID'))
    .optional()
    .nullable()
    .transform((val) => val || []),

  // Legacy single pallet_id - kept for backward compatibility with old data
  // New expenses should use pallet_ids instead
  pallet_id: z
    .preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.string().uuid('Invalid pallet ID format').nullable()
    )
    .optional(),

  // Receipt photo path is optional
  receipt_photo_path: z
    .string()
    .max(1000, 'Photo path too long')
    .optional()
    .nullable()
    .transform(val => val || null),
});

// Type inference
export type ExpenseFormData = z.infer<typeof expenseFormSchema>;

// Helper to get local date as YYYY-MM-DD string (avoids timezone issues)
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Default values for new expense form
export function getDefaultExpenseFormValues(palletIds?: string[] | null): ExpenseFormData {
  const today = getLocalDateString();

  return {
    amount: 0,
    category: 'other',
    description: null,
    expense_date: today,
    pallet_ids: palletIds ?? [],
    pallet_id: null, // Legacy field
    receipt_photo_path: null,
  };
}

// Helper to format date for display
export function formatExpenseDate(dateString: string): string {
  // Parse YYYY-MM-DD as local time to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Get category display label (handles legacy categories by returning raw name)
export function getCategoryLabel(category: string): string {
  return EXPENSE_CATEGORY_LABELS[category] || category;
}

// Get category color (handles legacy categories with grey fallback)
export function getCategoryColor(category: string): string {
  return EXPENSE_CATEGORY_COLORS[category] || '#9E9E9E';
}

// Format amount as currency
export function formatExpenseAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Parse currency input string to number
export function parseCurrencyInput(input: string): number {
  // Remove currency symbols and commas
  const cleaned = input.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

// Get expenses grouped by category
export function groupExpensesByCategory<T extends { category: ExpenseCategory }>(
  expenses: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  // Initialize with current categories
  for (const cat of EXPENSE_CATEGORIES) {
    grouped[cat] = [];
  }

  for (const expense of expenses) {
    // Handle any category (including legacy ones from old data)
    if (!grouped[expense.category]) {
      grouped[expense.category] = [];
    }
    grouped[expense.category].push(expense);
  }

  return grouped;
}

// Calculate total by category
export function calculateTotalByCategory<T extends { category: ExpenseCategory; amount: number }>(
  expenses: T[]
): Record<string, number> {
  const totals: Record<string, number> = {};

  // Initialize with current categories
  for (const cat of EXPENSE_CATEGORIES) {
    totals[cat] = 0;
  }

  for (const expense of expenses) {
    // Handle any category (including legacy ones from old data)
    if (totals[expense.category] === undefined) {
      totals[expense.category] = 0;
    }
    totals[expense.category] += expense.amount;
  }

  return totals;
}

// Calculate total of all expenses
export function calculateTotalExpenses<T extends { amount: number }>(expenses: T[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

// Filter expenses by date range
export function filterExpensesByDateRange<T extends { expense_date: string }>(
  expenses: T[],
  startDate: string,
  endDate: string
): T[] {
  return expenses.filter(expense => {
    const date = expense.expense_date;
    return date >= startDate && date <= endDate;
  });
}

// Filter expenses by category
export function filterExpensesByCategory<T extends { category: ExpenseCategory }>(
  expenses: T[],
  category: ExpenseCategory
): T[] {
  return expenses.filter(expense => expense.category === category);
}

// Get unique pallets from expenses
export function getUniquePalletIds<T extends { pallet_id: string | null }>(expenses: T[]): string[] {
  const palletIds = expenses
    .map(e => e.pallet_id)
    .filter((id): id is string => id !== null);
  return [...new Set(palletIds)];
}

// Check if expense is linked to a pallet
export function isLinkedToPallet<T extends { pallet_id: string | null }>(expense: T): boolean {
  return expense.pallet_id !== null;
}

// Sort expenses by date (newest first by default)
export function sortExpensesByDate<T extends { expense_date: string }>(
  expenses: T[],
  ascending: boolean = false
): T[] {
  return [...expenses].sort((a, b) => {
    const comparison = a.expense_date.localeCompare(b.expense_date);
    return ascending ? comparison : -comparison;
  });
}

// Sort expenses by amount (highest first by default)
export function sortExpensesByAmount<T extends { amount: number }>(
  expenses: T[],
  ascending: boolean = false
): T[] {
  return [...expenses].sort((a, b) => {
    return ascending ? a.amount - b.amount : b.amount - a.amount;
  });
}
