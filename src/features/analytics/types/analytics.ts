// Analytics Types - Phase 9
// Type definitions for analytics calculations and components

import type { SourceType } from '@/src/types/database';
import type { DateRange } from '@/src/components/ui/DateRangeFilter';

// Hero metrics displayed at the top of analytics screen
export interface HeroMetrics {
  totalProfit: number;
  totalItemsSold: number;
  avgROI: number;
  activeInventoryValue: number;
}

// Retail value metrics for deal quality analysis
export interface RetailMetrics {
  totalRetailValue: number;      // Σ item.retail_price
  retailRecoveryRate: number;    // (Σ sale_price / Σ retail_price) × 100
  costPerDollarRetail: number;   // purchase_cost / total_retail_value (lower = better deal)
}

// Individual pallet analytics for leaderboard
export interface PalletAnalytics {
  id: string;
  name: string;
  sourceType: SourceType;
  sourceName: string | null;
  profit: number;
  roi: number;
  totalCost: number;
  totalRevenue: number;
  itemCount: number;
  soldCount: number;
  avgDaysToSell: number | null;
  sellThroughRate: number;
  // Retail metrics
  retailMetrics: RetailMetrics | null;
}

// Aggregated metrics by pallet source type
export interface TypeComparison {
  sourceType: SourceType;
  avgROI: number;
  avgProfitPerPallet: number;
  avgItemsPerPallet: number;
  avgDaysToSell: number | null;
  sellThroughRate: number;
  palletCount: number;
  totalProfit: number;
  totalCost: number;
}

// Aggregated metrics by supplier (vendor)
export interface SupplierComparison {
  supplier: string;
  totalProfit: number;
  totalCost: number;
  avgROI: number;
  avgProfitPerPallet: number;
  palletCount: number;
  totalItemsSold: number;
  avgDaysToSell: number | null;
  sellThroughRate: number;
}

// Aggregated metrics by pallet type (source_name)
export interface PalletTypeComparison {
  palletType: string;
  isMysteryBox: boolean;
  totalProfit: number;
  totalCost: number;
  avgROI: number;
  avgProfitPerPallet: number;
  palletCount: number;
  totalItemsSold: number;
  avgDaysToSell: number | null;
  sellThroughRate: number;
}

// Stale item for attention list
export interface StaleItem {
  id: string;
  name: string;
  palletId: string | null;
  palletName: string | null;
  daysListed: number;
  listingPrice: number | null;
}

// Trend data point for charts
export interface TrendDataPoint {
  date: string;
  profit: number;
  revenue: number;
  itemsSold: number;
}

// Analytics filter state
export interface AnalyticsFilters {
  dateRange: DateRange;
  sourceType?: SourceType;
}

// CSV export data structure
export interface ExportData {
  palletPerformance: PalletAnalytics[];
  itemSales: {
    id: string;
    name: string;
    palletName: string | null;
    salePrice: number;
    cost: number;
    profit: number;
    saleDate: string;
    daysToSell: number | null;
    platform: string | null;
  }[];
  expenseReport: {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    date: string;
    palletNames: string[];
  }[];
}
