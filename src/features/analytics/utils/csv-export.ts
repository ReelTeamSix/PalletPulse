// CSV Export Utilities - Phase 9E
// Export analytics data to CSV format for paid tier users
import * as FileSystem from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import type { Item, Pallet, SourceType, ItemCondition, ItemStatus, ExpenseCategory, SalesPlatform } from '@/src/types/database';
import type { ExpenseWithPallets } from '@/src/stores/expenses-store';
import type { MileageTripWithPallets } from '@/src/stores/mileage-store';
import type { PalletAnalytics, TypeComparison } from '../types/analytics';
import type { ProfitLossSummary } from './profit-loss-calculations';
import { getSourceTypeLabel } from './analytics-calculations';

// ============================================================================
// Types
// ============================================================================

export type ExportType = 'pallets' | 'items' | 'expenses' | 'pallet_performance' | 'type_comparison' | 'mileage' | 'profit_loss';

export interface ExportResult {
  success: boolean;
  error?: string;
  filename?: string;
}

// ============================================================================
// CSV Formatting Utilities
// ============================================================================

/**
 * Escape a value for CSV format.
 * Handles strings with commas, quotes, and newlines.
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format a number for CSV export (2 decimal places for currency).
 */
function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return '';
  }
  return value.toFixed(decimals);
}

/**
 * Format a date string for CSV export (YYYY-MM-DD).
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return '';
  }
  return dateString.split('T')[0];
}

/**
 * Format a percentage for CSV export.
 */
function formatPercentage(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) {
    return '';
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Convert array of objects to CSV string.
 */
function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T | string; header: string; format?: (value: unknown, row: T) => string }[]
): string {
  const headers = columns.map(col => escapeCSVValue(col.header)).join(',');

  const rows = data.map(row => {
    return columns.map(col => {
      const value = col.key in row ? row[col.key as keyof T] : undefined;
      const formatted = col.format ? col.format(value, row) : escapeCSVValue(value);
      return formatted;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Generate a timestamped filename.
 */
function generateFilename(prefix: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${timestamp}.${extension}`;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export items to CSV.
 */
export function exportItemsToCSV(items: Item[], palletMap: Map<string, string>): string {
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description' },
    { key: 'pallet_id', header: 'Pallet', format: (v: unknown) => v ? escapeCSVValue(palletMap.get(v as string) || '') : '' },
    { key: 'status', header: 'Status', format: (v: unknown) => formatStatus(v as ItemStatus) },
    { key: 'condition', header: 'Condition', format: (v: unknown) => formatCondition(v as ItemCondition) },
    { key: 'source_type', header: 'Source Type', format: (v: unknown) => v ? getSourceTypeLabel(v as SourceType) : '' },
    { key: 'purchase_cost', header: 'Purchase Cost', format: (v: unknown) => formatNumber(v as number) },
    { key: 'allocated_cost', header: 'Allocated Cost', format: (v: unknown) => formatNumber(v as number) },
    { key: 'listing_price', header: 'Listing Price', format: (v: unknown) => formatNumber(v as number) },
    { key: 'sale_price', header: 'Sale Price', format: (v: unknown) => formatNumber(v as number) },
    { key: 'platform', header: 'Platform', format: (v: unknown) => v ? formatPlatform(v as SalesPlatform) : '' },
    { key: 'platform_fee', header: 'Platform Fee', format: (v: unknown) => formatNumber(v as number) },
    { key: 'shipping_cost', header: 'Shipping Cost', format: (v: unknown) => formatNumber(v as number) },
    { key: 'profit', header: 'Profit', format: (_v: unknown, row: Record<string, unknown>) => {
      const item = row as unknown as Item;
      if (item.status !== 'sold' || item.sale_price === null) return '';
      const cost = (item.allocated_cost ?? item.purchase_cost ?? 0);
      const fees = (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
      return formatNumber(item.sale_price - cost - fees);
    }},
    { key: 'listing_date', header: 'Listed Date', format: (v: unknown) => formatDate(v as string) },
    { key: 'sale_date', header: 'Sale Date', format: (v: unknown) => formatDate(v as string) },
    { key: 'storage_location', header: 'Storage Location' },
    { key: 'barcode', header: 'Barcode' },
    { key: 'notes', header: 'Notes' },
  ];

  return toCSV(items as unknown as Record<string, unknown>[], columns);
}

/**
 * Export pallets to CSV.
 */
export function exportPalletsToCSV(pallets: Pallet[]): string {
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'supplier', header: 'Supplier' },
    { key: 'source_type', header: 'Source Type', format: (v: unknown) => v ? getSourceTypeLabel(v as SourceType) : '' },
    { key: 'source_name', header: 'Source Name' },
    { key: 'purchase_cost', header: 'Purchase Cost', format: (v: unknown) => formatNumber(v as number) },
    { key: 'sales_tax', header: 'Sales Tax', format: (v: unknown) => formatNumber(v as number) },
    { key: 'purchase_date', header: 'Purchase Date', format: (v: unknown) => formatDate(v as string) },
    { key: 'status', header: 'Status', format: (v: unknown) => formatPalletStatus(v as string) },
    { key: 'notes', header: 'Notes' },
  ];

  return toCSV(pallets as unknown as Record<string, unknown>[], columns);
}

/**
 * Export expenses to CSV.
 */
export function exportExpensesToCSV(expenses: ExpenseWithPallets[], palletMap: Map<string, string>): string {
  const columns = [
    { key: 'expense_date', header: 'Date', format: (v: unknown) => formatDate(v as string) },
    { key: 'amount', header: 'Amount', format: (v: unknown) => formatNumber(v as number) },
    { key: 'category', header: 'Category', format: (v: unknown) => formatExpenseCategory(v as ExpenseCategory) },
    { key: 'description', header: 'Description' },
    { key: 'pallet_ids', header: 'Linked Pallets', format: (v: unknown) => {
      const ids = v as string[] | undefined;
      if (!ids || ids.length === 0) return '';
      return escapeCSVValue(ids.map(id => palletMap.get(id) || id).join('; '));
    }},
    { key: 'receipt_photo_path', header: 'Has Receipt', format: (v: unknown) => v ? 'Yes' : 'No' },
  ];

  return toCSV(expenses as unknown as Record<string, unknown>[], columns);
}

/**
 * Export pallet performance analytics to CSV.
 */
export function exportPalletPerformanceToCSV(palletAnalytics: PalletAnalytics[]): string {
  const columns = [
    { key: 'name', header: 'Pallet Name' },
    { key: 'sourceType', header: 'Source Type', format: (v: unknown) => v ? getSourceTypeLabel(v as SourceType) : '' },
    { key: 'sourceName', header: 'Source Name' },
    { key: 'totalCost', header: 'Total Cost', format: (v: unknown) => formatNumber(v as number) },
    { key: 'totalRevenue', header: 'Total Revenue', format: (v: unknown) => formatNumber(v as number) },
    { key: 'profit', header: 'Net Profit', format: (v: unknown) => formatNumber(v as number) },
    { key: 'roi', header: 'ROI', format: (v: unknown) => formatPercentage(v as number) },
    { key: 'itemCount', header: 'Total Items', format: (v: unknown) => String(v ?? 0) },
    { key: 'soldCount', header: 'Items Sold', format: (v: unknown) => String(v ?? 0) },
    { key: 'sellThroughRate', header: 'Sell-Through Rate', format: (v: unknown) => formatPercentage(v as number) },
    { key: 'avgDaysToSell', header: 'Avg Days to Sell', format: (v: unknown) => v !== null ? formatNumber(v as number, 1) : '' },
  ];

  return toCSV(palletAnalytics as unknown as Record<string, unknown>[], columns);
}

/**
 * Export type comparison analytics to CSV.
 */
export function exportTypeComparisonToCSV(typeComparison: TypeComparison[]): string {
  const columns = [
    { key: 'sourceType', header: 'Source Type', format: (v: unknown) => v ? getSourceTypeLabel(v as SourceType) : '' },
    { key: 'palletCount', header: 'Pallet Count', format: (v: unknown) => String(v ?? 0) },
    { key: 'totalCost', header: 'Total Cost', format: (v: unknown) => formatNumber(v as number) },
    { key: 'totalProfit', header: 'Total Profit', format: (v: unknown) => formatNumber(v as number) },
    { key: 'avgROI', header: 'Average ROI', format: (v: unknown) => formatPercentage(v as number) },
    { key: 'avgProfitPerPallet', header: 'Avg Profit/Pallet', format: (v: unknown) => formatNumber(v as number) },
    { key: 'avgItemsPerPallet', header: 'Avg Items/Pallet', format: (v: unknown) => formatNumber(v as number, 1) },
    { key: 'avgDaysToSell', header: 'Avg Days to Sell', format: (v: unknown) => v !== null ? formatNumber(v as number, 1) : '' },
    { key: 'sellThroughRate', header: 'Sell-Through Rate', format: (v: unknown) => formatPercentage(v as number) },
  ];

  return toCSV(typeComparison as unknown as Record<string, unknown>[], columns);
}

/**
 * Export mileage trips to CSV.
 */
export function exportMileageTripsToCSV(trips: MileageTripWithPallets[], palletMap: Map<string, string>): string {
  const columns = [
    { key: 'trip_date', header: 'Date', format: (v: unknown) => formatDate(v as string) },
    { key: 'miles', header: 'Miles', format: (v: unknown) => formatNumber(v as number, 1) },
    { key: 'mileage_rate', header: 'Rate ($/mi)', format: (v: unknown) => formatNumber(v as number, 3) },
    { key: 'deduction', header: 'Deduction', format: (_v: unknown, row: Record<string, unknown>) => {
      const trip = row as unknown as MileageTripWithPallets;
      return formatNumber(trip.miles * trip.mileage_rate);
    }},
    { key: 'purpose', header: 'Purpose', format: (v: unknown) => formatTripPurpose(v as string) },
    { key: 'notes', header: 'Notes' },
    { key: 'pallet_ids', header: 'Linked Pallets', format: (v: unknown) => {
      const ids = v as string[] | undefined;
      if (!ids || ids.length === 0) return '';
      return escapeCSVValue(ids.map(id => palletMap.get(id) || id).join('; '));
    }},
  ];

  return toCSV(trips as unknown as Record<string, unknown>[], columns);
}

/**
 * Export Profit & Loss Summary to CSV.
 * Creates a formatted summary report suitable for tax preparation.
 */
export function exportProfitLossSummaryToCSV(summary: ProfitLossSummary): string {
  const lines: string[] = [];

  // Header
  lines.push('Profit & Loss Summary');
  lines.push(`Period: ${summary.periodStart} to ${summary.periodEnd}`);
  lines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  // Revenue Section
  lines.push('REVENUE');
  lines.push(`Gross Sales,${formatNumber(summary.revenue.grossSales)}`);
  lines.push(`Items Sold,${summary.revenue.itemsSold}`);
  lines.push(`Average Sale Price,${formatNumber(summary.revenue.avgSalePrice)}`);
  lines.push('');

  // Cost of Goods Sold Section
  lines.push('COST OF GOODS SOLD');
  lines.push(`Pallet Purchases (${summary.cogs.palletCount} pallets),${formatNumber(summary.cogs.palletPurchases)}`);
  lines.push(`Individual Item Purchases (${summary.cogs.individualItemCount} items),${formatNumber(summary.cogs.individualItemPurchases)}`);
  lines.push(`Sales Tax Paid,${formatNumber(summary.cogs.salesTax)}`);
  lines.push(`Total COGS,${formatNumber(summary.cogs.totalCOGS)}`);
  lines.push('');

  // Gross Profit
  lines.push('GROSS PROFIT');
  lines.push(`Gross Profit,${formatNumber(summary.grossProfit)}`);
  lines.push(`Gross Margin,${formatPercentage(summary.grossMargin)}`);
  lines.push('');

  // Selling Expenses Section
  lines.push('SELLING EXPENSES');
  lines.push(`Platform Fees,${formatNumber(summary.sellingExpenses.platformFees)}`);
  lines.push(`Shipping Costs,${formatNumber(summary.sellingExpenses.shippingCosts)}`);
  lines.push(`Total Selling Expenses,${formatNumber(summary.sellingExpenses.totalSellingExpenses)}`);
  lines.push('');

  // Platform Breakdown
  if (summary.platformBreakdown.length > 0) {
    lines.push('PLATFORM BREAKDOWN');
    lines.push('Platform,Sales,Fees,Item Count');
    summary.platformBreakdown.forEach(p => {
      lines.push(`${escapeCSVValue(p.platform)},${formatNumber(p.sales)},${formatNumber(p.fees)},${p.count}`);
    });
    lines.push('');
  }

  // Operating Expenses Section
  lines.push('OPERATING EXPENSES');
  if (summary.operatingExpenses.byCategory.length > 0) {
    summary.operatingExpenses.byCategory.forEach(c => {
      lines.push(`${escapeCSVValue(c.label)} (${c.count} expenses),${formatNumber(c.amount)}`);
    });
  }
  lines.push(`Total Operating Expenses,${formatNumber(summary.operatingExpenses.totalOperatingExpenses)}`);
  lines.push('');

  // Mileage Deductions Section
  lines.push('MILEAGE DEDUCTIONS');
  lines.push(`Total Miles (${summary.mileageDeductions.tripCount} trips),${formatNumber(summary.mileageDeductions.totalMiles, 1)}`);
  lines.push(`Average Rate ($/mile),${formatNumber(summary.mileageDeductions.avgRate, 3)}`);
  lines.push(`Total Mileage Deduction,${formatNumber(summary.mileageDeductions.totalDeduction)}`);
  lines.push('');

  // Summary Section
  lines.push('NET PROFIT SUMMARY');
  lines.push(`Total Expenses,${formatNumber(summary.totalExpenses)}`);
  lines.push(`Net Profit,${formatNumber(summary.netProfit)}`);
  lines.push(`Net Margin,${formatPercentage(summary.netMargin)}`);

  return lines.join('\n');
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Save CSV content to file and share.
 */
export async function saveAndShareCSV(csvContent: string, filename: string): Promise<ExportResult> {
  try {
    // Check if sharing is available
    const sharingAvailable = await isAvailableAsync();
    if (!sharingAvailable) {
      return {
        success: false,
        error: 'Sharing is not available on this device',
      };
    }

    // Get cache directory (may be null on some platforms)
    if (!FileSystem.cacheDirectory) {
      return {
        success: false,
        error: 'Cache directory not available',
      };
    }

    // Create file path in cache directory
    const filePath = `${FileSystem.cacheDirectory}${filename}`;

    // Write CSV content to file
    await FileSystem.writeAsStringAsync(filePath, csvContent);

    // Share the file
    await shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: `Export ${filename}`,
      UTI: 'public.comma-separated-values-text',
    });

    return {
      success: true,
      filename,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export CSV';
    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================================
// High-Level Export Functions
// ============================================================================

/**
 * Export items data.
 */
export async function exportItems(items: Item[], pallets: Pallet[]): Promise<ExportResult> {
  const palletMap = new Map(pallets.map(p => [p.id, p.name]));
  const csvContent = exportItemsToCSV(items, palletMap);
  const filename = generateFilename('palletpulse_items');
  return saveAndShareCSV(csvContent, filename);
}

/**
 * Export pallets data.
 */
export async function exportPallets(pallets: Pallet[]): Promise<ExportResult> {
  const csvContent = exportPalletsToCSV(pallets);
  const filename = generateFilename('palletpulse_pallets');
  return saveAndShareCSV(csvContent, filename);
}

/**
 * Export expenses data.
 */
export async function exportExpenses(expenses: ExpenseWithPallets[], pallets: Pallet[]): Promise<ExportResult> {
  const palletMap = new Map(pallets.map(p => [p.id, p.name]));
  const csvContent = exportExpensesToCSV(expenses, palletMap);
  const filename = generateFilename('palletpulse_expenses');
  return saveAndShareCSV(csvContent, filename);
}

/**
 * Export pallet performance analytics.
 */
export async function exportPalletPerformance(palletAnalytics: PalletAnalytics[]): Promise<ExportResult> {
  const csvContent = exportPalletPerformanceToCSV(palletAnalytics);
  const filename = generateFilename('palletpulse_pallet_performance');
  return saveAndShareCSV(csvContent, filename);
}

/**
 * Export type comparison analytics.
 */
export async function exportTypeComparison(typeComparison: TypeComparison[]): Promise<ExportResult> {
  const csvContent = exportTypeComparisonToCSV(typeComparison);
  const filename = generateFilename('palletpulse_type_comparison');
  return saveAndShareCSV(csvContent, filename);
}

/**
 * Export mileage trips data.
 */
export async function exportMileageTrips(trips: MileageTripWithPallets[], pallets: Pallet[]): Promise<ExportResult> {
  const palletMap = new Map(pallets.map(p => [p.id, p.name]));
  const csvContent = exportMileageTripsToCSV(trips, palletMap);
  const filename = generateFilename('palletpulse_mileage');
  return saveAndShareCSV(csvContent, filename);
}

/**
 * Export Profit & Loss Summary for tax preparation.
 */
export async function exportProfitLoss(summary: ProfitLossSummary): Promise<ExportResult> {
  const csvContent = exportProfitLossSummaryToCSV(summary);
  const filename = generateFilename('palletpulse_profit_loss');
  return saveAndShareCSV(csvContent, filename);
}

// ============================================================================
// Format Helpers
// ============================================================================

function formatStatus(status: ItemStatus | null | undefined): string {
  if (!status) return '';
  const labels: Record<ItemStatus, string> = {
    unlisted: 'Unlisted',
    listed: 'Listed',
    sold: 'Sold',
  };
  return labels[status] || status;
}

function formatCondition(condition: ItemCondition | null | undefined): string {
  if (!condition) return '';
  const labels: Record<ItemCondition, string> = {
    new: 'New',
    open_box: 'Open Box',
    used_good: 'Used - Good',
    used_fair: 'Used - Fair',
    damaged: 'Damaged',
    for_parts: 'For Parts',
    unsellable: 'Unsellable',
  };
  return labels[condition] || condition;
}

function formatPalletStatus(status: string | null | undefined): string {
  if (!status) return '';
  const labels: Record<string, string> = {
    unprocessed: 'Unprocessed',
    processing: 'Processing',
    completed: 'Completed',
  };
  return labels[status] || status;
}

function formatExpenseCategory(category: ExpenseCategory | null | undefined): string {
  if (!category) return '';
  const labels: Record<ExpenseCategory, string> = {
    supplies: 'Supplies',
    storage: 'Storage',
    subscriptions: 'Subscriptions',
    equipment: 'Equipment',
    other: 'Other',
    gas: 'Gas',
    mileage: 'Mileage',
    fees: 'Fees',
    shipping: 'Shipping',
  };
  return labels[category] || category;
}

function formatPlatform(platform: SalesPlatform | null | undefined): string {
  if (!platform) return '';
  const labels: Record<SalesPlatform, string> = {
    ebay: 'eBay',
    poshmark: 'Poshmark',
    mercari: 'Mercari',
    whatnot: 'Whatnot',
    facebook: 'Facebook Marketplace',
    offerup: 'OfferUp',
    letgo: 'Letgo',
    craigslist: 'Craigslist',
    other: 'Other',
  };
  return labels[platform] || platform;
}

function formatTripPurpose(purpose: string | null | undefined): string {
  if (!purpose) return '';
  const labels: Record<string, string> = {
    pickup: 'Pallet Pickup',
    sourcing: 'Sourcing',
    shipping: 'Shipping Drop-off',
    supplies: 'Supplies Run',
    other: 'Other',
  };
  return labels[purpose] || purpose;
}
