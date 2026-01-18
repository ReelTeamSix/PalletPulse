/**
 * Smart Insights Engine
 *
 * Rules-based insights generator that analyzes user data
 * and provides actionable tips for the dashboard.
 */

import { Pallet, Item } from '@/src/types/database';

export type InsightType = 'success' | 'warning' | 'info' | 'tip';
export type InsightIcon = 'trophy' | 'alert-circle' | 'trending-up' | 'time' | 'bulb' | 'cart' | 'cash';

export interface Insight {
  id: string;
  type: InsightType;
  icon: InsightIcon;
  title: string;
  message: string;
  priority: number; // Higher = more important, shown first
}

interface InsightsInput {
  pallets: Pallet[];
  items: Item[];
  staleThresholdDays?: number;
}

/**
 * Generate smart insights based on user's data
 */
export function generateInsights(input: InsightsInput): Insight[] {
  const { pallets, items, staleThresholdDays = 30 } = input;
  const insights: Insight[] = [];

  // Calculate basic stats
  const soldItems = items.filter(i => i.status === 'sold');
  const listedItems = items.filter(i => i.status === 'listed');
  const unlistedItems = items.filter(i => i.status === 'unlisted');

  // Insight: Best performing source by ROI
  const bestSourceInsight = getBestSourceInsight(soldItems, pallets);
  if (bestSourceInsight) {
    insights.push(bestSourceInsight);
  }

  // Insight: Stale inventory warning
  const staleInsight = getStaleInventoryInsight(listedItems, staleThresholdDays);
  if (staleInsight) {
    insights.push(staleInsight);
  }

  // Insight: Quick flip celebration
  const quickFlipInsight = getQuickFlipInsight(soldItems);
  if (quickFlipInsight) {
    insights.push(quickFlipInsight);
  }

  // Insight: Unlisted items reminder
  const unlistedInsight = getUnlistedItemsInsight(unlistedItems);
  if (unlistedInsight) {
    insights.push(unlistedInsight);
  }

  // Insight: First sale celebration
  const firstSaleInsight = getFirstSaleInsight(soldItems);
  if (firstSaleInsight) {
    insights.push(firstSaleInsight);
  }

  // Insight: Milestone celebrations
  const milestoneInsight = getMilestoneInsight(soldItems);
  if (milestoneInsight) {
    insights.push(milestoneInsight);
  }

  // Sort by priority (highest first) and limit to top 3
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

/**
 * Find the best performing source by average ROI
 */
function getBestSourceInsight(soldItems: Item[], pallets: Pallet[]): Insight | null {
  if (soldItems.length < 3) {
    return null; // Need at least 3 sales to make meaningful comparison
  }

  // Group items by source (pallet name or "Individual")
  const sourceStats: Record<string, { revenue: number; cost: number; count: number }> = {};

  soldItems.forEach(item => {
    let sourceName = 'Individual';
    if (item.pallet_id) {
      const pallet = pallets.find(p => p.id === item.pallet_id);
      if (pallet) {
        sourceName = pallet.name;
      }
    }

    if (!sourceStats[sourceName]) {
      sourceStats[sourceName] = { revenue: 0, cost: 0, count: 0 };
    }

    sourceStats[sourceName].revenue += item.sale_price ?? 0;
    sourceStats[sourceName].cost += item.allocated_cost ?? item.purchase_cost ?? 0;
    sourceStats[sourceName].count += 1;
  });

  // Find source with best ROI (min 2 items)
  let bestSource = '';
  let bestROI = -Infinity;

  Object.entries(sourceStats).forEach(([source, stats]) => {
    if (stats.count >= 2 && stats.cost > 0) {
      const roi = ((stats.revenue - stats.cost) / stats.cost) * 100;
      if (roi > bestROI) {
        bestROI = roi;
        bestSource = source;
      }
    }
  });

  if (bestSource && bestROI > 0) {
    return {
      id: 'best-source',
      type: 'success',
      icon: 'trophy',
      title: 'Top Performer',
      message: `${bestSource} has your best ROI at ${Math.round(bestROI)}%`,
      priority: 80,
    };
  }

  return null;
}

/**
 * Check for stale inventory (items listed > threshold days)
 */
function getStaleInventoryInsight(listedItems: Item[], thresholdDays: number): Insight | null {
  const now = new Date();
  const staleItems = listedItems.filter(item => {
    if (!item.listing_date) return false;
    const listingDate = new Date(item.listing_date);
    const daysSinceListed = Math.floor((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceListed >= thresholdDays;
  });

  if (staleItems.length === 0) {
    return null;
  }

  return {
    id: 'stale-inventory',
    type: 'warning',
    icon: 'time',
    title: 'Stale Inventory',
    message: `${staleItems.length} item${staleItems.length > 1 ? 's' : ''} listed ${thresholdDays}+ days — consider repricing`,
    priority: 90,
  };
}

/**
 * Celebrate quick flips (items sold within 7 days of listing)
 */
function getQuickFlipInsight(soldItems: Item[]): Insight | null {
  // Look at recent sales (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSales = soldItems.filter(item => {
    if (!item.sale_date) return false;
    return new Date(item.sale_date) >= thirtyDaysAgo;
  });

  const quickFlips = recentSales.filter(item => {
    if (!item.listing_date || !item.sale_date) return false;
    const listingDate = new Date(item.listing_date);
    const saleDate = new Date(item.sale_date);
    const daysToSell = Math.floor((saleDate.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysToSell <= 7;
  });

  if (quickFlips.length === 0) {
    return null;
  }

  // Calculate average days to sell for quick flips
  const avgDays = quickFlips.reduce((sum, item) => {
    const listingDate = new Date(item.listing_date!);
    const saleDate = new Date(item.sale_date!);
    return sum + Math.floor((saleDate.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
  }, 0) / quickFlips.length;

  return {
    id: 'quick-flips',
    type: 'success',
    icon: 'trending-up',
    title: 'Quick Flips',
    message: `${quickFlips.length} item${quickFlips.length > 1 ? 's' : ''} sold within a week — avg ${Math.round(avgDays)} days`,
    priority: 70,
  };
}

/**
 * Remind about unlisted items
 */
function getUnlistedItemsInsight(unlistedItems: Item[]): Insight | null {
  if (unlistedItems.length >= 5) {
    return {
      id: 'unlisted-items',
      type: 'tip',
      icon: 'cart',
      title: 'Ready to List',
      message: `${unlistedItems.length} items waiting to be listed`,
      priority: 60,
    };
  }

  return null;
}

/**
 * Celebrate first sale
 */
function getFirstSaleInsight(soldItems: Item[]): Insight | null {
  if (soldItems.length !== 1) {
    return null; // Only show for exactly 1 sale
  }

  const item = soldItems[0];
  const profit = (item.sale_price ?? 0) - (item.allocated_cost ?? item.purchase_cost ?? 0);

  return {
    id: 'first-sale',
    type: 'success',
    icon: 'trophy',
    title: 'First Sale!',
    message: profit >= 0
      ? `Congrats on your first sale! You made $${profit.toFixed(2)}`
      : `Your first sale is in the books!`,
    priority: 100, // Highest priority
  };
}

/**
 * Celebrate milestones (10, 25, 50, 100 sales)
 */
function getMilestoneInsight(soldItems: Item[]): Insight | null {
  const count = soldItems.length;
  const milestones = [100, 50, 25, 10];

  for (const milestone of milestones) {
    if (count >= milestone && count < milestone + 5) {
      return {
        id: `milestone-${milestone}`,
        type: 'success',
        icon: 'trophy',
        title: `${milestone} Sales!`,
        message: `You've sold ${count} items — keep it up!`,
        priority: 95,
      };
    }
  }

  return null;
}

/**
 * Calculate average days to sell for sold items
 */
export function calculateAverageDaysToSell(soldItems: Item[]): number | null {
  const itemsWithDates = soldItems.filter(item => item.listing_date && item.sale_date);

  if (itemsWithDates.length === 0) {
    return null;
  }

  const totalDays = itemsWithDates.reduce((sum, item) => {
    const listingDate = new Date(item.listing_date!);
    const saleDate = new Date(item.sale_date!);
    return sum + Math.floor((saleDate.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
  }, 0);

  return totalDays / itemsWithDates.length;
}

/**
 * User journey stage for contextual empty states
 */
export type UserStage =
  | 'new_user'           // No pallets or items
  | 'has_inventory'      // Has items but none listed
  | 'has_listings'       // Has listed items but no sales
  | 'making_sales'       // Has sales, insights will appear naturally
  | 'established';       // 10+ sales, full insights available

/**
 * Determine user's current stage in their journey
 */
export function getUserStage(input: InsightsInput): UserStage {
  const { pallets, items } = input;

  const totalItems = items.length;
  const listedItems = items.filter(i => i.status === 'listed').length;
  const soldItems = items.filter(i => i.status === 'sold').length;

  if (pallets.length === 0 && totalItems === 0) {
    return 'new_user';
  }

  if (soldItems >= 10) {
    return 'established';
  }

  if (soldItems > 0) {
    return 'making_sales';
  }

  if (listedItems > 0) {
    return 'has_listings';
  }

  return 'has_inventory';
}

/**
 * Empty state content based on user stage
 */
export interface EmptyStateContent {
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
}

/**
 * Get contextual empty state content based on user's journey stage
 */
export function getEmptyStateContent(stage: UserStage): EmptyStateContent {
  switch (stage) {
    case 'new_user':
      return {
        title: 'Welcome!',
        message: 'Add your first pallet or item to start tracking profits.',
        actionLabel: 'Add Pallet',
        actionRoute: '/pallets/new',
      };

    case 'has_inventory':
      return {
        title: 'Ready to sell?',
        message: 'List your items to start making sales and unlock insights.',
        actionLabel: 'View Inventory',
        actionRoute: '/(tabs)/inventory',
      };

    case 'has_listings':
      return {
        title: 'Looking good!',
        message: 'Once you make a few sales, I\'ll show you trends and tips.',
      };

    case 'making_sales':
      return {
        title: 'Keep it up!',
        message: 'A few more sales and I\'ll have insights about your best sources and strategies.',
      };

    case 'established':
    default:
      return {
        title: 'All caught up!',
        message: 'No new insights right now. Keep selling and check back soon.',
      };
  }
}
