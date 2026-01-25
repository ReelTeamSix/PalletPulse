// Profit & Loss Calculation Utilities
// Comprehensive financial summary for tax preparation
import type { Item, Pallet, ExpenseCategory } from '@/src/types/database';
import type { ExpenseWithPallets } from '@/src/stores/expenses-store';
import type { MileageTripWithPallets } from '@/src/stores/mileage-store';

// ============================================================================
// Types
// ============================================================================

export interface ProfitLossSummary {
  // Period
  periodStart: string;
  periodEnd: string;

  // Revenue
  revenue: {
    grossSales: number;
    itemsSold: number;
    avgSalePrice: number;
  };

  // Cost of Goods Sold
  cogs: {
    palletPurchases: number;
    palletCount: number;
    individualItemPurchases: number;
    individualItemCount: number;
    salesTax: number;
    totalCOGS: number;
  };

  // Gross Profit
  grossProfit: number;
  grossMargin: number; // percentage

  // Selling Expenses (per-item costs)
  sellingExpenses: {
    platformFees: number;
    shippingCosts: number;
    totalSellingExpenses: number;
  };

  // Platform breakdown
  platformBreakdown: {
    platform: string;
    sales: number;
    fees: number;
    count: number;
  }[];

  // Operating Expenses (overhead)
  operatingExpenses: {
    byCategory: {
      category: ExpenseCategory;
      label: string;
      amount: number;
      count: number;
    }[];
    totalOperatingExpenses: number;
  };

  // Mileage Deductions
  mileageDeductions: {
    totalMiles: number;
    avgRate: number;
    totalDeduction: number;
    tripCount: number;
  };

  // Summary
  totalExpenses: number;
  netProfit: number;
  netMargin: number; // percentage
  effectiveTaxRate: number | null; // estimated if we have it
}

// ============================================================================
// Expense Category Labels
// ============================================================================

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
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

// ============================================================================
// Platform Labels
// ============================================================================

const PLATFORM_LABELS: Record<string, string> = {
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

// ============================================================================
// Main Calculation Function
// ============================================================================

export function calculateProfitLoss(
  items: Item[],
  pallets: Pallet[],
  expenses: ExpenseWithPallets[],
  mileageTrips: MileageTripWithPallets[],
  dateRange?: { start: string | null; end: string | null }
): ProfitLossSummary {
  // Filter by date range if provided
  const filteredItems = dateRange ? filterItemsByDate(items, dateRange) : items;
  const filteredPallets = dateRange ? filterPalletsByDate(pallets, dateRange) : pallets;
  const filteredExpenses = dateRange ? filterExpensesByDate(expenses, dateRange) : expenses;
  const filteredTrips = dateRange ? filterTripsByDate(mileageTrips, dateRange) : mileageTrips;

  // Determine period
  const periodStart = dateRange?.start || getEarliestDate(filteredItems, filteredPallets, filteredExpenses, filteredTrips);
  const periodEnd = dateRange?.end || new Date().toISOString().split('T')[0];

  // Calculate Revenue (only from sold items)
  const soldItems = filteredItems.filter(item => item.status === 'sold' && item.sale_price !== null);
  const grossSales = soldItems.reduce((sum, item) => sum + (item.sale_price || 0), 0);
  const avgSalePrice = soldItems.length > 0 ? grossSales / soldItems.length : 0;

  // Calculate COGS using accrual basis (cost of items SOLD, not purchased)
  // This matches the COGS model in analytics-calculations.ts

  // Pallet items sold: use allocated_cost
  const soldPalletItems = soldItems.filter(item => item.pallet_id !== null);
  const palletItemsCOGS = soldPalletItems.reduce(
    (sum, item) => sum + (item.allocated_cost ?? item.purchase_cost ?? 0),
    0
  );

  // Get unique pallets that contributed to sales (for counting and sales tax)
  const palletIdsWithSales = new Set(soldPalletItems.map(item => item.pallet_id));
  const palletsWithSales = pallets.filter(p => palletIdsWithSales.has(p.id));

  // Prorate sales tax based on portion of pallet items sold
  let proratedSalesTax = 0;
  palletsWithSales.forEach(pallet => {
    if (!pallet.sales_tax) return;
    const totalItemsInPallet = items.filter(i => i.pallet_id === pallet.id).length;
    const soldItemsFromPallet = soldPalletItems.filter(i => i.pallet_id === pallet.id).length;
    if (totalItemsInPallet > 0) {
      proratedSalesTax += (soldItemsFromPallet / totalItemsInPallet) * pallet.sales_tax;
    }
  });

  // Individual items sold (no pallet_id): use purchase_cost
  const soldIndividualItems = soldItems.filter(item => !item.pallet_id && item.purchase_cost !== null);
  const individualItemsCOGS = soldIndividualItems.reduce(
    (sum, item) => sum + (item.purchase_cost || 0),
    0
  );

  const totalCOGS = palletItemsCOGS + proratedSalesTax + individualItemsCOGS;

  // Gross Profit
  const grossProfit = grossSales - totalCOGS;
  const grossMargin = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0;

  // Selling Expenses (per-item costs from sold items)
  const platformFees = soldItems.reduce((sum, item) => sum + (item.platform_fee || 0), 0);
  const shippingCosts = soldItems.reduce((sum, item) => sum + (item.shipping_cost || 0), 0);
  const totalSellingExpenses = platformFees + shippingCosts;

  // Platform breakdown
  const platformMap = new Map<string, { sales: number; fees: number; count: number }>();
  soldItems.forEach(item => {
    const platform = item.platform || 'other';
    const existing = platformMap.get(platform) || { sales: 0, fees: 0, count: 0 };
    platformMap.set(platform, {
      sales: existing.sales + (item.sale_price || 0),
      fees: existing.fees + (item.platform_fee || 0),
      count: existing.count + 1,
    });
  });
  const platformBreakdown = Array.from(platformMap.entries())
    .map(([platform, data]) => ({
      platform: PLATFORM_LABELS[platform] || platform,
      ...data,
    }))
    .sort((a, b) => b.sales - a.sales);

  // Operating Expenses (overhead - exclude legacy categories that are now tracked differently)
  const relevantCategories: ExpenseCategory[] = ['supplies', 'storage', 'subscriptions', 'equipment', 'other'];
  const categoryMap = new Map<ExpenseCategory, { amount: number; count: number }>();

  filteredExpenses.forEach(expense => {
    if (relevantCategories.includes(expense.category)) {
      const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
      categoryMap.set(expense.category, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1,
      });
    }
  });

  const byCategory = relevantCategories
    .map(category => ({
      category,
      label: EXPENSE_CATEGORY_LABELS[category],
      amount: categoryMap.get(category)?.amount || 0,
      count: categoryMap.get(category)?.count || 0,
    }))
    .filter(c => c.amount > 0);

  const totalOperatingExpenses = byCategory.reduce((sum, c) => sum + c.amount, 0);

  // Mileage Deductions
  const totalMiles = filteredTrips.reduce((sum, trip) => sum + trip.miles, 0);
  const totalMileageDeduction = filteredTrips.reduce((sum, trip) => sum + (trip.miles * trip.mileage_rate), 0);
  const avgRate = filteredTrips.length > 0
    ? filteredTrips.reduce((sum, trip) => sum + trip.mileage_rate, 0) / filteredTrips.length
    : 0;

  // Total Expenses
  const totalExpenses = totalSellingExpenses + totalOperatingExpenses + totalMileageDeduction;

  // Net Profit
  const netProfit = grossProfit - totalExpenses;
  const netMargin = grossSales > 0 ? (netProfit / grossSales) * 100 : 0;

  return {
    periodStart,
    periodEnd,
    revenue: {
      grossSales,
      itemsSold: soldItems.length,
      avgSalePrice,
    },
    cogs: {
      palletPurchases: palletItemsCOGS,
      palletCount: soldPalletItems.length, // Count of pallet items sold
      individualItemPurchases: individualItemsCOGS,
      individualItemCount: soldIndividualItems.length, // Count of individual items sold
      salesTax: proratedSalesTax,
      totalCOGS,
    },
    grossProfit,
    grossMargin,
    sellingExpenses: {
      platformFees,
      shippingCosts,
      totalSellingExpenses,
    },
    platformBreakdown,
    operatingExpenses: {
      byCategory,
      totalOperatingExpenses,
    },
    mileageDeductions: {
      totalMiles,
      avgRate,
      totalDeduction: totalMileageDeduction,
      tripCount: filteredTrips.length,
    },
    totalExpenses,
    netProfit,
    netMargin,
    effectiveTaxRate: null, // Could be calculated based on user settings in future
  };
}

// ============================================================================
// Filter Helpers
// ============================================================================

function filterItemsByDate(items: Item[], dateRange: { start: string | null; end: string | null }): Item[] {
  return items.filter(item => {
    // Use sale_date for sold items, created_at for others
    const itemDate = item.status === 'sold' && item.sale_date
      ? item.sale_date
      : item.created_at.split('T')[0];

    if (dateRange.start && itemDate < dateRange.start) return false;
    if (dateRange.end && itemDate > dateRange.end) return false;
    return true;
  });
}

function filterPalletsByDate(pallets: Pallet[], dateRange: { start: string | null; end: string | null }): Pallet[] {
  return pallets.filter(pallet => {
    const palletDate = pallet.purchase_date;
    if (dateRange.start && palletDate < dateRange.start) return false;
    if (dateRange.end && palletDate > dateRange.end) return false;
    return true;
  });
}

function filterExpensesByDate(expenses: ExpenseWithPallets[], dateRange: { start: string | null; end: string | null }): ExpenseWithPallets[] {
  return expenses.filter(expense => {
    const expenseDate = expense.expense_date;
    if (dateRange.start && expenseDate < dateRange.start) return false;
    if (dateRange.end && expenseDate > dateRange.end) return false;
    return true;
  });
}

function filterTripsByDate(trips: MileageTripWithPallets[], dateRange: { start: string | null; end: string | null }): MileageTripWithPallets[] {
  return trips.filter(trip => {
    const tripDate = trip.trip_date;
    if (dateRange.start && tripDate < dateRange.start) return false;
    if (dateRange.end && tripDate > dateRange.end) return false;
    return true;
  });
}

function getEarliestDate(
  items: Item[],
  pallets: Pallet[],
  expenses: ExpenseWithPallets[],
  trips: MileageTripWithPallets[]
): string {
  const dates: string[] = [];

  if (pallets.length > 0) {
    dates.push(...pallets.map(p => p.purchase_date));
  }
  if (items.length > 0) {
    dates.push(...items.map(i => i.created_at.split('T')[0]));
  }
  if (expenses.length > 0) {
    dates.push(...expenses.map(e => e.expense_date));
  }
  if (trips.length > 0) {
    dates.push(...trips.map(t => t.trip_date));
  }

  if (dates.length === 0) {
    return new Date().toISOString().split('T')[0];
  }

  return dates.sort()[0];
}
