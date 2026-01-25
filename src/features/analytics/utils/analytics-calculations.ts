// Analytics Calculations - Phase 9
// Pure functions for calculating analytics metrics
// Leverages existing profit-utils.ts for base calculations
//
// COGS (Cost of Goods Sold) Model:
// When a date range is selected, we use the COGS model for accurate period-based analytics.
// - Revenue: Sum of sale_price for items sold within the period
// - COGS: Sum of allocated_cost (or purchase_cost) for those same sold items
// - Profit: Revenue - COGS - Fees
// This ensures costs and revenues are matched to the same period (Matching Principle).

import type { Item, Pallet, Expense, SourceType } from '@/src/types/database';
import type { ExpenseWithPallets } from '@/src/stores/expenses-store';
import type { DateRange } from '@/src/components/ui/DateRangeFilter';
import type {
  HeroMetrics,
  PalletAnalytics,
  RetailMetrics,
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
// COGS (Cost of Goods Sold) Calculation
// ============================================================================

/**
 * Calculate COGS-based metrics for sold items.
 * Uses item-level costs (allocated_cost or purchase_cost) instead of full pallet costs.
 * This provides accurate period-based profitability when filtering by date range.
 *
 * @param soldItems - Array of sold items to calculate COGS for
 * @returns Object with totalRevenue, totalCOGS, totalFees, and netProfit
 */
export function calculateCOGS(soldItems: Item[]): {
  totalRevenue: number;
  totalCOGS: number;
  totalFees: number;
  netProfit: number;
} {
  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalFees = 0;

  soldItems.forEach((item) => {
    if (item.sale_price !== null) {
      totalRevenue += item.sale_price;
      // Use allocated_cost if available, otherwise use purchase_cost
      totalCOGS += item.allocated_cost ?? item.purchase_cost ?? 0;
      totalFees += (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
    }
  });

  const netProfit = totalRevenue - totalCOGS - totalFees;

  return {
    totalRevenue,
    totalCOGS,
    totalFees,
    netProfit,
  };
}

// ============================================================================
// Hero Metrics
// ============================================================================

/**
 * Calculate hero metrics for the analytics dashboard.
 *
 * When a date range is provided, uses the COGS (Cost of Goods Sold) model:
 * - Only counts revenue and costs for items sold within the date range
 * - Uses item-level allocated_cost/purchase_cost instead of full pallet costs
 * - This ensures costs and revenues are matched to the same period
 *
 * When no date range is provided (all-time view), uses the traditional model:
 * - Counts full pallet costs and all revenue
 *
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
  // Filter sold items by sale date if date range provided
  const hasDateRange = dateRange?.start || dateRange?.end;
  const filteredSoldItems = hasDateRange
    ? filterByDateRange(items.filter(i => i.status === 'sold'), dateRange, 'sale_date')
    : items.filter(i => i.status === 'sold');

  // Get sold items (only those with sale_price) from the filtered set
  const soldItems = filteredSoldItems.filter(
    (item) => item.sale_price !== null
  );

  let totalProfit = 0;
  let totalCost = 0;

  // When a date range is provided, use COGS model for accurate period profitability
  if (hasDateRange) {
    // COGS model: Use item-level costs for items sold within the period
    const cogsResult = calculateCOGS(soldItems);
    totalProfit = cogsResult.netProfit;
    totalCost = cogsResult.totalCOGS + cogsResult.totalFees;
  } else {
    // All-time view: Use traditional pallet-based calculation
    // Create a combined set: all sold items + all non-sold items
    const allItems = items;

    pallets.forEach((pallet) => {
      const palletItems = allItems.filter((item) => item.pallet_id === pallet.id);
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
    const individualItems = allItems.filter((item) => !item.pallet_id);
    individualItems.forEach((item) => {
      if (item.status === 'sold' && item.sale_price !== null) {
        const cost = item.purchase_cost ?? 0;
        const fees = (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
        totalProfit += item.sale_price - cost - fees;
        totalCost += cost + fees;
      }
    });
  }

  // Calculate average ROI
  const avgROI = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  // Calculate active inventory value (unsold items - always use all items)
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
 * Calculate retail value metrics for a set of items.
 * @param items - Items to calculate metrics for
 * @param palletCost - Total pallet cost for cost per dollar retail calculation
 * @returns RetailMetrics or null if no retail values exist
 */
export function calculateRetailMetrics(
  items: Item[],
  palletCost: number
): RetailMetrics | null {
  // Sum up retail values (only items with retail_price set)
  const itemsWithRetail = items.filter((item) => item.retail_price !== null && item.retail_price > 0);

  if (itemsWithRetail.length === 0) {
    return null;
  }

  const totalRetailValue = itemsWithRetail.reduce(
    (sum, item) => sum + (item.retail_price ?? 0),
    0
  );

  // Calculate retail recovery rate (only for sold items)
  const soldItemsWithRetail = itemsWithRetail.filter(
    (item) => item.status === 'sold' && item.sale_price !== null
  );

  const soldRetailTotal = soldItemsWithRetail.reduce(
    (sum, item) => sum + (item.retail_price ?? 0),
    0
  );
  const soldSalePriceTotal = soldItemsWithRetail.reduce(
    (sum, item) => sum + (item.sale_price ?? 0),
    0
  );

  const retailRecoveryRate = soldRetailTotal > 0
    ? (soldSalePriceTotal / soldRetailTotal) * 100
    : 0;

  // Calculate cost per dollar retail (lower = better deal)
  const costPerDollarRetail = totalRetailValue > 0
    ? palletCost / totalRetailValue
    : 0;

  return {
    totalRetailValue,
    retailRecoveryRate,
    costPerDollarRetail,
  };
}

/**
 * Calculate pallet analytics for leaderboard.
 *
 * When a date range is provided, uses the COGS model:
 * - Only counts revenue and costs for items sold within the date range
 * - Uses item-level allocated_cost instead of full pallet costs
 *
 * @param pallets - All pallets
 * @param items - All items
 * @param expenses - All expenses (with pallet_ids)
 * @param dateRange - Optional date range to filter sold items by sale date
 * @returns Sorted array of pallet analytics (by profit descending)
 */
export function calculatePalletLeaderboard(
  pallets: Pallet[],
  items: Item[],
  expenses: ExpenseWithPallets[],
  dateRange?: DateRange
): PalletAnalytics[] {
  const hasDateRange = dateRange?.start || dateRange?.end;

  // Filter sold items by sale date if dateRange provided
  const filteredSoldItems = hasDateRange
    ? filterByDateRange(items.filter(i => i.status === 'sold'), dateRange, 'sale_date')
    : items.filter(i => i.status === 'sold');

  // Get all items for counting purposes
  const allItems = items;

  const analytics: PalletAnalytics[] = pallets.map((pallet) => {
    // Get all pallet items for counts
    const allPalletItems = allItems.filter((item) => item.pallet_id === pallet.id);
    // Get filtered sold items for this pallet
    const palletSoldItems = filteredSoldItems.filter((item) => item.pallet_id === pallet.id);

    let profit: number;
    let roi: number;
    let totalCost: number;
    let totalRevenue: number;
    let soldCount: number;

    if (hasDateRange) {
      // COGS model: Use item-level costs for period profitability
      const cogsResult = calculateCOGS(palletSoldItems);
      totalRevenue = cogsResult.totalRevenue;
      totalCost = cogsResult.totalCOGS + cogsResult.totalFees;
      profit = cogsResult.netProfit;
      roi = totalCost > 0 ? (profit / totalCost) * 100 : (profit > 0 ? 100 : 0);
      soldCount = palletSoldItems.length;
    } else {
      // All-time view: Use traditional pallet-based calculation
      const palletExpenses = expenses.filter(
        (exp) => exp.pallet_ids?.includes(pallet.id) || exp.pallet_id === pallet.id
      );

      // Calculate split amounts for multi-pallet expenses
      const splitExpenses: Expense[] = palletExpenses.map((exp) => ({
        ...exp,
        amount: exp.amount / (exp.pallet_ids?.length || 1),
      }));

      const result = calculatePalletProfit(pallet, allPalletItems, splitExpenses);
      profit = result.netProfit;
      roi = result.roi;
      totalCost = result.totalCost;
      totalRevenue = result.totalRevenue;
      soldCount = result.soldItemsCount;
    }

    // Calculate average days to sell for sold items (use filtered sold items)
    const soldItemsWithDates = palletSoldItems.filter(
      (item) => item.listing_date && item.sale_date
    );
    const avgDaysToSell = soldItemsWithDates.length > 0
      ? soldItemsWithDates.reduce((sum, item) => sum + (getDaysToSell(item) ?? 0), 0) / soldItemsWithDates.length
      : null;

    // Calculate sell-through rate based on all pallet items
    const sellThroughRate = allPalletItems.length > 0
      ? (soldCount / allPalletItems.length) * 100
      : 0;

    // Calculate retail metrics using all pallet items
    const retailMetrics = calculateRetailMetrics(allPalletItems, totalCost);

    return {
      id: pallet.id,
      name: pallet.name,
      sourceType: pallet.source_type,
      sourceName: pallet.source_name,
      profit,
      roi,
      totalCost,
      totalRevenue,
      itemCount: allPalletItems.length,
      soldCount,
      avgDaysToSell,
      sellThroughRate,
      retailMetrics,
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
 *
 * When a date range is provided, uses the COGS model:
 * - Only counts revenue and costs for items sold within the date range
 *
 * @param pallets - All pallets
 * @param items - All items
 * @param expenses - All expenses (with pallet_ids)
 * @param dateRange - Optional date range to filter sold items by sale date
 * @returns Array of type comparisons sorted by average ROI descending
 */
export function calculateTypeComparison(
  pallets: Pallet[],
  items: Item[],
  expenses: ExpenseWithPallets[],
  dateRange?: DateRange
): TypeComparison[] {
  const hasDateRange = dateRange?.start || dateRange?.end;

  // Filter sold items by sale date if dateRange provided
  const filteredSoldItems = hasDateRange
    ? filterByDateRange(items.filter(i => i.status === 'sold'), dateRange, 'sale_date')
    : items.filter(i => i.status === 'sold');

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
      // Get all pallet items for counting
      const allPalletItems = items.filter((item) => item.pallet_id === pallet.id);
      // Get filtered sold items for this pallet
      const palletSoldItems = filteredSoldItems.filter((item) => item.pallet_id === pallet.id);

      totalItems += allPalletItems.length;

      if (hasDateRange) {
        // COGS model: Use item-level costs
        const cogsResult = calculateCOGS(palletSoldItems);
        totalProfit += cogsResult.netProfit;
        totalCost += cogsResult.totalCOGS + cogsResult.totalFees;
        totalSoldItems += palletSoldItems.length;
      } else {
        // All-time view: Use traditional pallet-based calculation
        const palletExpenses = expenses.filter(
          (exp) => exp.pallet_ids?.includes(pallet.id) || exp.pallet_id === pallet.id
        );

        // Calculate split amounts for multi-pallet expenses
        const splitExpenses: Expense[] = palletExpenses.map((exp) => ({
          ...exp,
          amount: exp.amount / (exp.pallet_ids?.length || 1),
        }));

        const result = calculatePalletProfit(pallet, allPalletItems, splitExpenses);
        totalProfit += result.netProfit;
        totalCost += result.totalCost;
        totalSoldItems += result.soldItemsCount;
      }

      // Sum days to sell for averaging
      const soldItemsForDays = palletSoldItems.filter(
        (item) => item.listing_date && item.sale_date
      );
      soldItemsForDays.forEach((item) => {
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
 *
 * When a date range is provided, uses the COGS model:
 * - Only counts revenue and costs for items sold within the date range
 *
 * @param pallets - All pallets
 * @param items - All items
 * @param expenses - All expenses (with pallet_ids)
 * @param dateRange - Optional date range to filter sold items by sale date
 * @returns Array of supplier comparisons sorted by total profit descending
 */
export function calculateSupplierComparison(
  pallets: Pallet[],
  items: Item[],
  expenses: ExpenseWithPallets[],
  dateRange?: DateRange
): SupplierComparison[] {
  const hasDateRange = dateRange?.start || dateRange?.end;

  // Filter sold items by sale date if dateRange provided
  const filteredSoldItems = hasDateRange
    ? filterByDateRange(items.filter(i => i.status === 'sold'), dateRange, 'sale_date')
    : items.filter(i => i.status === 'sold');

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
      // Get all pallet items for counting
      const allPalletItems = items.filter((item) => item.pallet_id === pallet.id);
      // Get filtered sold items for this pallet
      const palletSoldItems = filteredSoldItems.filter((item) => item.pallet_id === pallet.id);

      totalItems += allPalletItems.length;

      if (hasDateRange) {
        // COGS model: Use item-level costs
        const cogsResult = calculateCOGS(palletSoldItems);
        totalProfit += cogsResult.netProfit;
        totalCost += cogsResult.totalCOGS + cogsResult.totalFees;
        totalSoldItems += palletSoldItems.length;
      } else {
        // All-time view: Use traditional pallet-based calculation
        const palletExpenses = expenses.filter(
          (exp) => exp.pallet_ids?.includes(pallet.id) || exp.pallet_id === pallet.id
        );

        // Calculate split amounts for multi-pallet expenses
        const splitExpenses: Expense[] = palletExpenses.map((exp) => ({
          ...exp,
          amount: exp.amount / (exp.pallet_ids?.length || 1),
        }));

        const result = calculatePalletProfit(pallet, allPalletItems, splitExpenses);
        totalProfit += result.netProfit;
        totalCost += result.totalCost;
        totalSoldItems += result.soldItemsCount;
      }

      // Sum days to sell for averaging
      const soldItemsForDays = palletSoldItems.filter(
        (item) => item.listing_date && item.sale_date
      );
      soldItemsForDays.forEach((item) => {
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
 *
 * When a date range is provided, uses the COGS model:
 * - Only counts revenue and costs for items sold within the date range
 *
 * @param pallets - All pallets
 * @param items - All items
 * @param expenses - All expenses (with pallet_ids)
 * @param dateRange - Optional date range to filter sold items by sale date
 * @returns Array of pallet type comparisons sorted by total profit descending
 */
export function calculatePalletTypeComparison(
  pallets: Pallet[],
  items: Item[],
  expenses: ExpenseWithPallets[],
  dateRange?: DateRange
): PalletTypeComparison[] {
  const hasDateRange = dateRange?.start || dateRange?.end;

  // Filter sold items by sale date if dateRange provided
  const filteredSoldItems = hasDateRange
    ? filterByDateRange(items.filter(i => i.status === 'sold'), dateRange, 'sale_date')
    : items.filter(i => i.status === 'sold');

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
      // Get all pallet items for counting
      const allPalletItems = items.filter((item) => item.pallet_id === pallet.id);
      // Get filtered sold items for this pallet
      const palletSoldItems = filteredSoldItems.filter((item) => item.pallet_id === pallet.id);

      totalItems += allPalletItems.length;

      if (hasDateRange) {
        // COGS model: Use item-level costs
        const cogsResult = calculateCOGS(palletSoldItems);
        totalProfit += cogsResult.netProfit;
        totalCost += cogsResult.totalCOGS + cogsResult.totalFees;
        totalSoldItems += palletSoldItems.length;
      } else {
        // All-time view: Use traditional pallet-based calculation
        const palletExpenses = expenses.filter(
          (exp) => exp.pallet_ids?.includes(pallet.id) || exp.pallet_id === pallet.id
        );

        // Calculate split amounts for multi-pallet expenses
        const splitExpenses: Expense[] = palletExpenses.map((exp) => ({
          ...exp,
          amount: exp.amount / (exp.pallet_ids?.length || 1),
        }));

        const result = calculatePalletProfit(pallet, allPalletItems, splitExpenses);
        totalProfit += result.netProfit;
        totalCost += result.totalCost;
        totalSoldItems += result.soldItemsCount;
      }

      // Sum days to sell for averaging
      const soldItemsForDays = palletSoldItems.filter(
        (item) => item.listing_date && item.sale_date
      );
      soldItemsForDays.forEach((item) => {
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
