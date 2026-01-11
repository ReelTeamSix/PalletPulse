// Profit Calculation Utilities
// Pure functions for calculating profit, ROI, and cost allocation

import type { Item, Pallet, Expense, ItemCondition } from '@/src/types/database';

// ============================================================================
// Types
// ============================================================================

export interface PalletProfitResult {
  totalRevenue: number;      // Sum of all sold item sale prices
  totalCost: number;         // Pallet cost + sales tax + expenses
  palletCost: number;        // Purchase cost of pallet
  salesTax: number;          // Sales tax on pallet
  expenses: number;          // Total pallet-linked expenses
  netProfit: number;         // Total revenue - total cost
  roi: number;               // ROI percentage ((profit / cost) * 100)
  soldItemsCount: number;    // Number of sold items
  totalItemsCount: number;   // Total number of items
  unsoldItemsCount: number;  // Number of unsold items
  unsoldValue: number;       // Estimated value of unsold items (listing or retail price)
}

export interface ItemWithAllocatedCost extends Item {
  calculated_allocated_cost: number;
}

export interface CostAllocationOptions {
  includeUnsellable: boolean;  // Whether to include unsellable items in cost division
}

// ============================================================================
// Item Profit Calculations
// ============================================================================

/**
 * Calculate profit for a single item.
 * Uses allocated_cost for pallet items, purchase_cost for individual items.
 */
export function calculateItemProfit(item: Item): number {
  if (item.sale_price === null) return 0;
  const cost = item.allocated_cost ?? item.purchase_cost ?? 0;
  return item.sale_price - cost;
}

/**
 * Calculate profit for an item given explicit values.
 * Useful when calculating before item is saved.
 */
export function calculateItemProfitFromValues(
  salePrice: number | null,
  allocatedCost: number | null,
  purchaseCost: number | null
): number {
  if (salePrice === null) return 0;
  const cost = allocatedCost ?? purchaseCost ?? 0;
  return salePrice - cost;
}

/**
 * Calculate ROI (Return on Investment) for a single item.
 * Returns percentage value (e.g., 50 for 50% ROI).
 */
export function calculateItemROI(item: Item): number {
  if (item.sale_price === null) return 0;
  const cost = item.allocated_cost ?? item.purchase_cost ?? 0;
  if (cost === 0) return item.sale_price > 0 ? 100 : 0;
  return ((item.sale_price - cost) / cost) * 100;
}

/**
 * Calculate ROI from explicit values.
 */
export function calculateItemROIFromValues(
  salePrice: number | null,
  allocatedCost: number | null,
  purchaseCost: number | null
): number {
  if (salePrice === null) return 0;
  const cost = allocatedCost ?? purchaseCost ?? 0;
  if (cost === 0) return salePrice > 0 ? 100 : 0;
  return ((salePrice - cost) / cost) * 100;
}

// ============================================================================
// Cost Allocation
// ============================================================================

/**
 * Allocate pallet cost evenly across items.
 * By default, excludes unsellable items from cost calculation.
 *
 * @param pallet - The pallet to allocate costs for
 * @param items - All items belonging to this pallet
 * @param options - Configuration options (includeUnsellable)
 * @returns Items with calculated_allocated_cost field populated
 */
export function allocateCosts(
  pallet: Pallet,
  items: Item[],
  options: CostAllocationOptions = { includeUnsellable: false }
): ItemWithAllocatedCost[] {
  if (items.length === 0) {
    return [];
  }

  // Calculate total cost including sales tax
  const totalCost = pallet.purchase_cost + (pallet.sales_tax ?? 0);

  // Filter items based on options
  const sellableItems = options.includeUnsellable
    ? items
    : items.filter(item => item.condition !== 'unsellable');

  // Calculate cost per item
  const costPerItem = sellableItems.length > 0
    ? totalCost / sellableItems.length
    : 0;

  // Return items with allocated costs
  return items.map(item => {
    const isUnsellable = item.condition === 'unsellable';

    // Unsellable items get 0 cost if excludeUnsellable is true
    const allocatedCost = (isUnsellable && !options.includeUnsellable)
      ? 0
      : costPerItem;

    return {
      ...item,
      calculated_allocated_cost: allocatedCost,
    };
  });
}

/**
 * Calculate estimated allocated cost for a pallet.
 * Used to show estimated cost before item is saved.
 */
export function estimateAllocatedCost(
  palletCost: number,
  palletSalesTax: number | null,
  totalItems: number,
  includeUnsellable: boolean = false,
  unsellableCount: number = 0
): number {
  const totalCost = palletCost + (palletSalesTax ?? 0);
  const divisor = includeUnsellable ? totalItems : (totalItems - unsellableCount);

  if (divisor <= 0) return 0;
  return totalCost / divisor;
}

// ============================================================================
// Pallet Profit Calculations
// ============================================================================

/**
 * Calculate comprehensive profit metrics for a pallet.
 * Includes all items and pallet-linked expenses.
 */
export function calculatePalletProfit(
  pallet: Pallet | null,
  items: Item[],
  expenses: Expense[]
): PalletProfitResult {
  // Handle null pallet
  if (pallet === null) {
    return {
      totalRevenue: 0,
      totalCost: 0,
      palletCost: 0,
      salesTax: 0,
      expenses: 0,
      netProfit: 0,
      roi: 0,
      soldItemsCount: 0,
      totalItemsCount: items.length,
      unsoldItemsCount: items.length,
      unsoldValue: 0,
    };
  }

  // Calculate revenue from sold items
  const soldItems = items.filter(item => item.status === 'sold' && item.sale_price !== null);
  const totalRevenue = soldItems.reduce((sum, item) => sum + (item.sale_price ?? 0), 0);

  // Calculate costs
  const palletCost = pallet.purchase_cost;
  const salesTax = pallet.sales_tax ?? 0;
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalCost = palletCost + salesTax + expenseTotal;

  // Calculate profit
  const netProfit = totalRevenue - totalCost;

  // Calculate ROI
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : (netProfit > 0 ? 100 : 0);

  // Count items
  const unsoldItems = items.filter(item => item.status !== 'sold');

  // Calculate unsold value (use listing_price if available, otherwise retail_price)
  const unsoldValue = unsoldItems.reduce((sum, item) => {
    return sum + (item.listing_price ?? item.retail_price ?? 0);
  }, 0);

  return {
    totalRevenue,
    totalCost,
    palletCost,
    salesTax,
    expenses: expenseTotal,
    netProfit,
    roi,
    soldItemsCount: soldItems.length,
    totalItemsCount: items.length,
    unsoldItemsCount: unsoldItems.length,
    unsoldValue,
  };
}

/**
 * Calculate simple profit for display (revenue - cost).
 * Useful for quick profit display on cards.
 */
export function calculateSimplePalletProfit(
  pallet: Pallet,
  items: Item[],
  expenses: Expense[]
): number {
  const result = calculatePalletProfit(pallet, items, expenses);
  return result.netProfit;
}

/**
 * Calculate pallet ROI percentage.
 */
export function calculatePalletROI(
  pallet: Pallet,
  items: Item[],
  expenses: Expense[]
): number {
  const result = calculatePalletProfit(pallet, items, expenses);
  return result.roi;
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format a number as currency (USD).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format profit with color indicator.
 * Returns object with formatted value and color.
 * @param amount - The profit amount
 * @param isRealized - Whether profit is realized (pallet completed). If false, uses neutral color.
 */
export function formatProfit(
  amount: number,
  isRealized: boolean = true
): { value: string; color: string; isPositive: boolean } {
  const formatted = formatCurrency(Math.abs(amount));
  const isPositive = amount >= 0;

  // Use neutral color for unrealized profit/loss
  const color = isRealized
    ? (isPositive ? '#2E7D32' : '#D32F2F')
    : '#9E9E9E';

  return {
    value: isPositive ? formatted : `-${formatted}`,
    color,
    isPositive,
  };
}

/**
 * Format ROI percentage for display.
 */
export function formatROI(roi: number): string {
  const sign = roi >= 0 ? '+' : '';
  return `${sign}${roi.toFixed(1)}%`;
}

/**
 * Get color for ROI value.
 * @param roi - The ROI percentage
 * @param isRealized - Whether profit is realized (pallet completed). If false, uses neutral color.
 */
export function getROIColor(roi: number, isRealized: boolean = true): string {
  // Use neutral color for unrealized ROI
  if (!isRealized) return '#9E9E9E';

  if (roi > 20) return '#2E7D32';      // Strong positive - green
  if (roi > 0) return '#4CAF50';        // Positive - light green
  if (roi === 0) return '#9E9E9E';      // Neutral - grey
  if (roi > -20) return '#FFA000';      // Slight loss - orange
  return '#D32F2F';                      // Significant loss - red
}

// ============================================================================
// Analysis Helpers
// ============================================================================

/**
 * Check if an item is considered stale (unsold for X days).
 */
export function isItemStale(item: Item, thresholdDays: number = 30): boolean {
  if (item.status === 'sold') return false;
  if (!item.listing_date) return false;

  const listingDate = new Date(item.listing_date);
  const now = new Date();
  const daysSinceListing = Math.floor(
    (now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceListing >= thresholdDays;
}

/**
 * Get days since item was listed.
 */
export function getDaysSinceListed(item: Item): number | null {
  if (!item.listing_date) return null;

  const listingDate = new Date(item.listing_date);
  const now = new Date();
  return Math.floor((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get days to sell for a sold item.
 */
export function getDaysToSell(item: Item): number | null {
  if (item.status !== 'sold' || !item.listing_date || !item.sale_date) return null;

  const listingDate = new Date(item.listing_date);
  const saleDate = new Date(item.sale_date);
  return Math.floor((saleDate.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate average days to sell for a set of items.
 */
export function calculateAverageDaysToSell(items: Item[]): number | null {
  const soldItems = items.filter(
    item => item.status === 'sold' && item.listing_date && item.sale_date
  );

  if (soldItems.length === 0) return null;

  const totalDays = soldItems.reduce((sum, item) => {
    const days = getDaysToSell(item);
    return sum + (days ?? 0);
  }, 0);

  return totalDays / soldItems.length;
}
