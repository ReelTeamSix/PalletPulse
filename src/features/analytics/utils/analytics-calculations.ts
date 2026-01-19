// Analytics Calculations - Phase 9
// Pure functions for calculating analytics metrics
// Leverages existing profit-utils.ts for base calculations

import type { Item, Pallet, Expense, SourceType } from '@/src/types/database';
import type { ExpenseWithPallets } from '@/src/stores/expenses-store';
import type { DateRange } from '@/src/components/ui/DateRangeFilter';
import type {
  HeroMetrics,
  PalletAnalytics,
  TypeComparison,
  SupplierComparison,
  PalletTypeComparison,
  StaleItem,
  TrendDataPoint,
} from '../types/analytics';
import {
  calculatePalletProfit,
  getDaysToSell,
  isItemStale,
  getDaysSinceListed,
} from '@/src/lib/profit-utils';

// ============================================================================
// Date Filtering
// ============================================================================

/**
 * Filter data by date range.
 * @param data - Array of objects with a date field
 * @param dateRange - The date range to filter by
 * @param dateField - The field name containing the date string
 * @returns Filtered array
 */
export function filterByDateRange<T>(
  data: T[],
  dateRange: DateRange,
  dateField: keyof T
): T[] {
  if (!dateRange.start && !dateRange.end) {
    return data;
  }

  return data.filter((item) => {
    const dateValue = item[dateField];
    if (typeof dateValue !== 'string') return false;

    const itemDate = new Date(dateValue);
    // Normalize to start of day for comparison
    const itemDateNorm = new Date(
      itemDate.getFullYear(),
      itemDate.getMonth(),
      itemDate.getDate()
    );

    if (dateRange.start && dateRange.end) {
      const startNorm = new Date(
        dateRange.start.getFullYear(),
        dateRange.start.getMonth(),
        dateRange.start.getDate()
      );
      const endNorm = new Date(
        dateRange.end.getFullYear(),
        dateRange.end.getMonth(),
        dateRange.end.getDate()
      );
      return itemDateNorm >= startNorm && itemDateNorm <= endNorm;
    }

    return true;
  });
}

// ============================================================================
// Hero Metrics
// ============================================================================

/**
 * Calculate hero metrics for the analytics dashboard.
 * @param pallets - All pallets
 * @param items - All items
 * @param expenses - All expenses (with pallet_ids)
 * @param dateRange - Optional date range filter
 * @returns Hero metrics
 */
export function calculateHeroMetrics(
  pallets: Pallet[],
  items: Item[],
  expenses: ExpenseWithPallets[],
  dateRange?: DateRange
): HeroMetrics {
  // Filter items by sale date if date range provided
  const filteredItems = dateRange
    ? filterByDateRange(items, dateRange, 'sale_date')
    : items;

  // Get sold items (only those with sale_price)
  const soldItems = filteredItems.filter(
    (item) => item.status === 'sold' && item.sale_price !== null
  );

  // Calculate total profit from all pallets
  let totalProfit = 0;
  let totalCost = 0;

  pallets.forEach((pallet) => {
    const palletItems = items.filter((item) => item.pallet_id === pallet.id);
    const palletExpenses = expenses.filter(
      (exp) => exp.pallet_ids?.includes(pallet.id) || exp.pallet_id === pallet.id
    );

    // Calculate split amounts for multi-pallet expenses
    const splitExpenses: Expense[] = palletExpenses.map((exp) => ({
      ...exp,
      amount: exp.amount / (exp.pallet_ids?.length || 1),
    }));

    const result = calculatePalletProfit(pallet, palletItems, splitExpenses);
    totalProfit += result.netProfit;
    totalCost += result.totalCost;
  });

  // Add profit from individual items (no pallet)
  const individualItems = items.filter((item) => !item.pallet_id);
  individualItems.forEach((item) => {
    if (item.status === 'sold' && item.sale_price !== null) {
      const cost = item.purchase_cost ?? 0;
      const fees = (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
      totalProfit += item.sale_price - cost - fees;
      totalCost += cost + fees;
    }
  });

  // Calculate average ROI
  const avgROI = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  // Calculate active inventory value (unsold items)
  const unsoldItems = items.filter((item) => item.status !== 'sold');
  const activeInventoryValue = unsoldItems.reduce((sum, item) => {
    return sum + (item.listing_price ?? item.retail_price ?? item.purchase_cost ?? 0);
  }, 0);

  return {
    totalProfit,
    totalItemsSold: soldItems.length,
    avgROI,
    activeInventoryValue,
  };
}

// ============================================================================
// Pallet Leaderboard
// ============================================================================

/**
 * Calculate pallet analytics for leaderboard.
 * @param pallets - All pallets
 * @param items - All items
 * @param expenses - All expenses (with pallet_ids)
 * @returns Sorted array of pallet analytics (by profit descending)
 */
export function calculatePalletLeaderboard(
  pallets: Pallet[],
  items: Item[],
  expenses: ExpenseWithPallets[]
): PalletAnalytics[] {
  const analytics: PalletAnalytics[] = pallets.map((pallet) => {
    const palletItems = items.filter((item) => item.pallet_id === pallet.id);
    const palletExpenses = expenses.filter(
      (exp) => exp.pallet_ids?.includes(pallet.id) || exp.pallet_id === pallet.id
    );

    // Calculate split amounts for multi-pallet expenses
    const splitExpenses: Expense[] = palletExpenses.map((exp) => ({
      ...exp,
      amount: exp.amount / (exp.pallet_ids?.length || 1),
    }));

    const result = calculatePalletProfit(pallet, palletItems, splitExpenses);

    // Calculate average days to sell for sold items
    const soldItems = palletItems.filter(
      (item) => item.status === 'sold' && item.listing_date && item.sale_date
    );
    const avgDaysToSell = soldItems.length > 0
      ? soldItems.reduce((sum, item) => sum + (getDaysToSell(item) ?? 0), 0) / soldItems.length
      : null;

    // Calculate sell-through rate
    const sellThroughRate = palletItems.length > 0
      ? (result.soldItemsCount / palletItems.length) * 100
      : 0;

    return {
      id: pallet.id,
      name: pallet.name,
      sourceType: pallet.source_type,
      sourceName: pallet.source_name,
      profit: result.netProfit,
      roi: result.roi,
      totalCost: result.totalCost,
      totalRevenue: result.totalRevenue,
      itemCount: palletItems.length,
      soldCount: result.soldItemsCount,
      avgDaysToSell,
      sellThroughRate,
    };
  });

  // Sort by profit descending
  return analytics.sort((a, b) => b.profit - a.profit);
}

// ============================================================================
// Type Comparison
// ============================================================================

/**
 * Calculate aggregated metrics by pallet source type.
 * @param pallets - All pallets
 * @param items - All items
 * @param expenses - All expenses (with pallet_ids)
 * @returns Array of type comparisons sorted by average ROI descending
 */
export function calculateTypeComparison(
  pallets: Pallet[],
  items: Item[],
  expenses: ExpenseWithPallets[]
): TypeComparison[] {
  // Get unique source types from pallets
  const sourceTypes = [...new Set(pallets.map((p) => p.source_type))];

  const comparisons: TypeComparison[] = sourceTypes.map((sourceType) => {
    const typePallets = pallets.filter((p) => p.source_type === sourceType);

    let totalProfit = 0;
    let totalCost = 0;
    let totalItems = 0;
    let totalSoldItems = 0;
    let totalDaysToSell = 0;
    let soldItemsWithDays = 0;

    typePallets.forEach((pallet) => {
      const palletItems = items.filter((item) => item.pallet_id === pallet.id);
      const palletExpenses = expenses.filter(
        (exp) => exp.pallet_ids?.includes(pallet.id) || exp.pallet_id === pallet.id
      );

      // Calculate split amounts for multi-pallet expenses
      const splitExpenses: Expense[] = palletExpenses.map((exp) => ({
        ...exp,
        amount: exp.amount / (exp.pallet_ids?.length || 1),
      }));

      const result = calculatePalletProfit(pallet, palletItems, splitExpenses);
      totalProfit += result.netProfit;
      totalCost += result.totalCost;
      totalItems += palletItems.length;
      totalSoldItems += result.soldItemsCount;

      // Sum days to sell for averaging
      const soldItems = palletItems.filter(
        (item) => item.status === 'sold' && item.listing_date && item.sale_date
      );
      soldItems.forEach((item) => {
        const days = getDaysToSell(item);
        if (days !== null) {
          totalDaysToSell += days;
          soldItemsWithDays++;
        }
      });
    });

    const palletCount = typePallets.length;
    const avgROI = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const avgProfitPerPallet = palletCount > 0 ? totalProfit / palletCount : 0;
    const avgItemsPerPallet = palletCount > 0 ? totalItems / palletCount : 0;
    const avgDaysToSell = soldItemsWithDays > 0 ? totalDaysToSell / soldItemsWithDays : null;
    const sellThroughRate = totalItems > 0 ? (totalSoldItems / totalItems) * 100 : 0;

    return {
      sourceType,
      avgROI,
      avgProfitPerPallet,
      avgItemsPerPallet,
      avgDaysToSell,
      sellThroughRate,
      palletCount,
      totalProfit,
      totalCost,
    };
  });

  // Sort by average ROI descending
  return comparisons.sort((a, b) => b.avgROI - a.avgROI);
}

// ============================================================================
// Supplier Comparison
// ============================================================================

/**
 * Calculate aggregated metrics by supplier (vendor).
 * @param pallets - All pallets
 * @param items - All items
 * @param expenses - All expenses (with pallet_ids)
 * @returns Array of supplier comparisons sorted by total profit descending
 */
export function calculateSupplierComparison(
  pallets: Pallet[],
  items: Item[],
  expenses: ExpenseWithPallets[]
): SupplierComparison[] {
  // Get unique suppliers from pallets (normalize null/empty to "Unknown")
  const normalizeSupplier = (supplier: string | null): string => {
    return supplier && supplier.trim() ? supplier.trim() : 'Unknown';
  };

  const suppliers = [...new Set(pallets.map((p) => normalizeSupplier(p.supplier)))];

  const comparisons: SupplierComparison[] = suppliers.map((supplier) => {
    const supplierPallets = pallets.filter(
      (p) => normalizeSupplier(p.supplier) === supplier
    );

    let totalProfit = 0;
    let totalCost = 0;
    let totalItems = 0;
    let totalSoldItems = 0;
    let totalDaysToSell = 0;
    let soldItemsWithDays = 0;

    supplierPallets.forEach((pallet) => {
      const palletItems = items.filter((item) => item.pallet_id === pallet.id);
      const palletExpenses = expenses.filter(
        (exp) => exp.pallet_ids?.includes(pallet.id) || exp.pallet_id === pallet.id
      );

      // Calculate split amounts for multi-pallet expenses
      const splitExpenses: Expense[] = palletExpenses.map((exp) => ({
        ...exp,
        amount: exp.amount / (exp.pallet_ids?.length || 1),
      }));

      const result = calculatePalletProfit(pallet, palletItems, splitExpenses);
      totalProfit += result.netProfit;
      totalCost += result.totalCost;
      totalItems += palletItems.length;
      totalSoldItems += result.soldItemsCount;

      // Sum days to sell for averaging
      const soldItems = palletItems.filter(
        (item) => item.status === 'sold' && item.listing_date && item.sale_date
      );
      soldItems.forEach((item) => {
        const days = getDaysToSell(item);
        if (days !== null) {
          totalDaysToSell += days;
          soldItemsWithDays++;
        }
      });
    });

    const palletCount = supplierPallets.length;
    const avgROI = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const avgProfitPerPallet = palletCount > 0 ? totalProfit / palletCount : 0;
    const avgDaysToSell = soldItemsWithDays > 0 ? totalDaysToSell / soldItemsWithDays : null;
    const sellThroughRate = totalItems > 0 ? (totalSoldItems / totalItems) * 100 : 0;

    return {
      supplier,
      totalProfit,
      totalCost,
      avgROI,
      avgProfitPerPallet,
      palletCount,
      totalItemsSold: totalSoldItems,
      avgDaysToSell,
      sellThroughRate,
    };
  });

  // Sort by total profit descending
  return comparisons.sort((a, b) => b.totalProfit - a.totalProfit);
}

/**
 * Calculate aggregated metrics by pallet type (source_name).
 * Groups pallets by source_name and includes mystery box indicator.
 * @param pallets - All pallets
 * @param items - All items
 * @param expenses - All expenses (with pallet_ids)
 * @returns Array of pallet type comparisons sorted by total profit descending
 */
export function calculatePalletTypeComparison(
  pallets: Pallet[],
  items: Item[],
  expenses: ExpenseWithPallets[]
): PalletTypeComparison[] {
  // Get unique pallet types from pallets (normalize null/empty to "Unspecified")
  const normalizePalletType = (sourceName: string | null): string => {
    return sourceName && sourceName.trim() ? sourceName.trim() : 'Unspecified';
  };

  const palletTypes = [...new Set(pallets.map((p) => normalizePalletType(p.source_name)))];

  const comparisons: PalletTypeComparison[] = palletTypes.map((palletType) => {
    const typePallets = pallets.filter(
      (p) => normalizePalletType(p.source_name) === palletType
    );

    // Check if ANY pallet in this group is a mystery box
    const isMysteryBox = typePallets.some((p) => p.source_type === 'mystery_box');

    let totalProfit = 0;
    let totalCost = 0;
    let totalItems = 0;
    let totalSoldItems = 0;
    let totalDaysToSell = 0;
    let soldItemsWithDays = 0;

    typePallets.forEach((pallet) => {
      const palletItems = items.filter((item) => item.pallet_id === pallet.id);
      const palletExpenses = expenses.filter(
        (exp) => exp.pallet_ids?.includes(pallet.id) || exp.pallet_id === pallet.id
      );

      // Calculate split amounts for multi-pallet expenses
      const splitExpenses: Expense[] = palletExpenses.map((exp) => ({
        ...exp,
        amount: exp.amount / (exp.pallet_ids?.length || 1),
      }));

      const result = calculatePalletProfit(pallet, palletItems, splitExpenses);
      totalProfit += result.netProfit;
      totalCost += result.totalCost;
      totalItems += palletItems.length;
      totalSoldItems += result.soldItemsCount;

      // Sum days to sell for averaging
      const soldItems = palletItems.filter(
        (item) => item.status === 'sold' && item.listing_date && item.sale_date
      );
      soldItems.forEach((item) => {
        const days = getDaysToSell(item);
        if (days !== null) {
          totalDaysToSell += days;
          soldItemsWithDays++;
        }
      });
    });

    const palletCount = typePallets.length;
    const avgROI = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const avgProfitPerPallet = palletCount > 0 ? totalProfit / palletCount : 0;
    const avgDaysToSell = soldItemsWithDays > 0 ? totalDaysToSell / soldItemsWithDays : null;
    const sellThroughRate = totalItems > 0 ? (totalSoldItems / totalItems) * 100 : 0;

    return {
      palletType,
      isMysteryBox,
      totalProfit,
      totalCost,
      avgROI,
      avgProfitPerPallet,
      palletCount,
      totalItemsSold: totalSoldItems,
      avgDaysToSell,
      sellThroughRate,
    };
  });

  // Sort by total profit descending
  return comparisons.sort((a, b) => b.totalProfit - a.totalProfit);
}

// ============================================================================
// Stale Inventory
// ============================================================================

/**
 * Get stale items that need attention.
 * @param items - All items
 * @param pallets - All pallets (for pallet names)
 * @param thresholdDays - Number of days to consider an item stale (default: 30)
 * @returns Array of stale items sorted by days listed descending
 */
export function getStaleItems(
  items: Item[],
  pallets: Pallet[],
  thresholdDays: number = 30
): StaleItem[] {
  const palletMap = new Map(pallets.map((p) => [p.id, p.name]));

  const staleItems: StaleItem[] = items
    .filter((item) => isItemStale(item, thresholdDays))
    .map((item) => {
      const daysListed = getDaysSinceListed(item) ?? 0;
      return {
        id: item.id,
        name: item.name,
        palletId: item.pallet_id,
        palletName: item.pallet_id ? palletMap.get(item.pallet_id) ?? null : null,
        daysListed,
        listingPrice: item.listing_price,
      };
    });

  // Sort by days listed descending (oldest first)
  return staleItems.sort((a, b) => b.daysListed - a.daysListed);
}

// ============================================================================
// Trend Data
// ============================================================================

/**
 * Calculate profit trend data for charting.
 * Groups sold items by date and calculates daily/weekly/monthly totals.
 * @param items - All items
 * @param granularity - 'daily' | 'weekly' | 'monthly'
 * @param dateRange - Optional date range filter
 * @returns Array of trend data points
 */
export function calculateProfitTrend(
  items: Item[],
  granularity: 'daily' | 'weekly' | 'monthly' = 'monthly',
  dateRange?: DateRange
): TrendDataPoint[] {
  // Filter to sold items with sale dates
  let soldItems = items.filter(
    (item) => item.status === 'sold' && item.sale_date && item.sale_price !== null
  );

  // Apply date range filter
  if (dateRange) {
    soldItems = filterByDateRange(soldItems, dateRange, 'sale_date');
  }

  // Group by date key based on granularity
  const groups = new Map<string, { profit: number; revenue: number; count: number }>();

  soldItems.forEach((item) => {
    const date = new Date(item.sale_date!);
    let dateKey: string;

    switch (granularity) {
      case 'daily':
        dateKey = date.toISOString().split('T')[0];
        break;
      case 'weekly':
        // Get ISO week start (Monday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1);
        dateKey = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        break;
    }

    const existing = groups.get(dateKey) || { profit: 0, revenue: 0, count: 0 };
    const cost = item.allocated_cost ?? item.purchase_cost ?? 0;
    const fees = (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
    const profit = item.sale_price! - cost - fees;

    groups.set(dateKey, {
      profit: existing.profit + profit,
      revenue: existing.revenue + item.sale_price!,
      count: existing.count + 1,
    });
  });

  // Convert to array and sort by date
  const trendData: TrendDataPoint[] = Array.from(groups.entries())
    .map(([date, data]) => ({
      date,
      profit: data.profit,
      revenue: data.revenue,
      itemsSold: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return trendData;
}

// ============================================================================
// Summary Statistics
// ============================================================================

/**
 * Calculate quick summary statistics for a date range.
 * @param items - All items
 * @param dateRange - Date range to calculate for
 * @returns Summary statistics
 */
export function calculatePeriodSummary(
  items: Item[],
  dateRange: DateRange
): {
  itemsSold: number;
  revenue: number;
  profit: number;
  avgSalePrice: number;
} {
  const filteredSoldItems = filterByDateRange(
    items.filter((item) => item.status === 'sold' && item.sale_price !== null),
    dateRange,
    'sale_date'
  );

  const revenue = filteredSoldItems.reduce((sum, item) => sum + (item.sale_price ?? 0), 0);
  const profit = filteredSoldItems.reduce((sum, item) => {
    const cost = item.allocated_cost ?? item.purchase_cost ?? 0;
    const fees = (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
    return sum + (item.sale_price ?? 0) - cost - fees;
  }, 0);
  const avgSalePrice = filteredSoldItems.length > 0 ? revenue / filteredSoldItems.length : 0;

  return {
    itemsSold: filteredSoldItems.length,
    revenue,
    profit,
    avgSalePrice,
  };
}

// ============================================================================
// Source Type Labels
// ============================================================================

/**
 * Get human-readable label for source type.
 */
export function getSourceTypeLabel(sourceType: SourceType): string {
  const labels: Record<SourceType, string> = {
    pallet: 'Pallet',
    thrift: 'Thrift Store',
    garage_sale: 'Garage Sale',
    retail_arbitrage: 'Retail Arbitrage',
    mystery_box: 'Mystery Box',
    other: 'Other',
  };
  return labels[sourceType] || sourceType;
}
