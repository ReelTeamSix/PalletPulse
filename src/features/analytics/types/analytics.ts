// Analytics Types - Phase 9
// Type definitions for analytics calculations and components

import type { Item, Pallet, SourceType } from '@/src/types/database';
import type { DateRange } from '@/src/components/ui/DateRangeFilter';

// Hero metrics displayed at the top of analytics screen
export interface HeroMetrics {
  totalProfit: number;
  totalItemsSold: number;
  avgROI: number;
  activeInventoryValue: number;
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
