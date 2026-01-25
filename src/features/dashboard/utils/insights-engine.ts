/**
 * Smart Insights Engine
 *
 * Rules-based insights generator that analyzes user data
 * and provides actionable tips for the dashboard.
 */

import { Pallet, Item } from '@/src/types/database';

export type InsightType = 'success' | 'warning' | 'info' | 'tip';
export type InsightIcon = 'trophy' | 'alert-circle' | 'trending-up' | 'time' | 'bulb' | 'cart' | 'cash' | 'flash';

// Navigation target for insights
export interface InsightNavigation {
  type: 'item' | 'pallet' | 'inventory';
  id?: string; // Item or pallet ID
}

export interface Insight {
  id: string;
  type: InsightType;
  icon: InsightIcon;
  title: string;
  message: string;
  priority: number; // Higher = more important, shown first
  navigation?: InsightNavigation; // Where to navigate when tapped
}

interface InsightsInput {
  pallets: Pallet[];
  items: Item[];
  staleThresholdDays?: number;
}

/**
 * Generate smart insights based on user's data
 * Uses rotation to show varied insights each time
 */
export function generateInsights(input: InsightsInput): Insight[] {
  const { pallets, items, staleThresholdDays = 30 } = input;

  // Calculate basic stats
  const soldItems = items.filter(i => i.status === 'sold');
  const listedItems = items.filter(i => i.status === 'listed');
  const unlistedItems = items.filter(i => i.status === 'unlisted');

  // High priority insights (always shown if available)
  const priorityInsights: Insight[] = [];

  // First sale and milestones are always priority
  const firstSaleInsight = getFirstSaleInsight(soldItems);
  if (firstSaleInsight) priorityInsights.push(firstSaleInsight);

  const milestoneInsight = getMilestoneInsight(soldItems);
  if (milestoneInsight) priorityInsights.push(milestoneInsight);

  // Stale inventory warning is high priority
  const staleInsight = getStaleInventoryInsight(listedItems, staleThresholdDays);
  if (staleInsight) priorityInsights.push(staleInsight);

  // Rotating insights pool (varies each render)
  const rotatingInsights: Insight[] = [];

  // Best individual item
  const bestItemInsight = getBestIndividualItemInsight(soldItems);
  if (bestItemInsight) rotatingInsights.push(bestItemInsight);

  // Best pallet (specific)
  const bestPalletInsight = getBestPalletInsight(soldItems, pallets);
  if (bestPalletInsight) rotatingInsights.push(bestPalletInsight);

  // Best supplier
  const bestSupplierInsight = getBestSupplierInsight(soldItems, pallets);
  if (bestSupplierInsight) rotatingInsights.push(bestSupplierInsight);

  // Best pallet type/source
  const bestSourceTypeInsight = getBestSourceTypeInsight(soldItems, pallets, items);
  if (bestSourceTypeInsight) rotatingInsights.push(bestSourceTypeInsight);

  // Fastest flip (specific item)
  const fastestFlipInsight = getFastestFlipInsight(soldItems);
  if (fastestFlipInsight) rotatingInsights.push(fastestFlipInsight);

  // Quick flips summary
  const quickFlipInsight = getQuickFlipInsight(soldItems);
  if (quickFlipInsight) rotatingInsights.push(quickFlipInsight);

  // Unlisted items reminder
  const unlistedInsight = getUnlistedItemsInsight(unlistedItems);
  if (unlistedInsight) rotatingInsights.push(unlistedInsight);

  // Rotate the insights pool based on current time (changes every few hours)
  const rotationSeed = Math.floor(Date.now() / (1000 * 60 * 60 * 3)); // Changes every 3 hours
  const shuffledRotating = shuffleWithSeed(rotatingInsights, rotationSeed);

  // Combine priority + rotated insights, sort by priority, take top 3
  const allInsights = [...priorityInsights, ...shuffledRotating];

  return allInsights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

/**
 * Shuffle array with a seed for consistent rotation
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;

  for (let i = result.length - 1; i > 0; i--) {
    // Simple seeded random
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    const j = currentSeed % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Best individual item (non-pallet) by ROI
 */
function getBestIndividualItemInsight(soldItems: Item[]): Insight | null {
  const individualItems = soldItems.filter(item => !item.pallet_id && item.purchase_cost && item.purchase_cost > 0);

  if (individualItems.length === 0) return null;

  let bestItem: Item | null = null;
  let bestROI = -Infinity;

  for (const item of individualItems) {
    const salePrice = item.sale_price ?? 0;
    const cost = item.purchase_cost ?? 0;
    const platformFee = item.platform_fee ?? 0;
    const shippingCost = item.shipping_cost ?? 0;
    const totalCost = cost + platformFee + shippingCost;

    if (totalCost > 0) {
      const roi = ((salePrice - totalCost) / totalCost) * 100;
      if (roi > bestROI) {
        bestROI = roi;
        bestItem = item;
      }
    }
  }

  if (bestItem && bestROI > 20) {
    return {
      id: 'best-individual-item',
      type: 'success',
      icon: 'trophy',
      title: 'Top Find',
      message: `${bestItem.name} had ${Math.round(bestROI)}% ROI`,
      priority: 75,
      navigation: { type: 'item', id: bestItem.id },
    };
  }

  return null;
}

/**
 * Best pallet by ROI (specific pallet)
 * Uses COGS model: ROI based on allocated_cost of sold items, not full pallet cost
 */
function getBestPalletInsight(soldItems: Item[], pallets: Pallet[]): Insight | null {
  if (pallets.length === 0) return null;

  // Group sold items by pallet, tracking allocated costs (COGS model)
  const palletStats: Record<string, { revenue: number; allocatedCost: number; fees: number; count: number }> = {};

  soldItems.forEach(item => {
    if (!item.pallet_id) return;
    if (!palletStats[item.pallet_id]) {
      palletStats[item.pallet_id] = { revenue: 0, allocatedCost: 0, fees: 0, count: 0 };
    }
    palletStats[item.pallet_id].revenue += item.sale_price ?? 0;
    // Use allocated_cost (COGS) instead of full pallet cost
    palletStats[item.pallet_id].allocatedCost += item.allocated_cost ?? item.purchase_cost ?? 0;
    palletStats[item.pallet_id].fees += (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
    palletStats[item.pallet_id].count += 1;
  });

  let bestPallet: Pallet | null = null;
  let bestROI = -Infinity;

  for (const [palletId, stats] of Object.entries(palletStats)) {
    if (stats.count < 2) continue; // Need at least 2 sales

    const pallet = pallets.find(p => p.id === palletId);
    if (!pallet) continue;

    // COGS model: use allocated cost of sold items + fees
    const totalCost = stats.allocatedCost + stats.fees;
    if (totalCost > 0) {
      const profit = stats.revenue - totalCost;
      const roi = (profit / totalCost) * 100;
      if (roi > bestROI) {
        bestROI = roi;
        bestPallet = pallet;
      }
    }
  }

  if (bestPallet && bestROI > 0) {
    return {
      id: 'best-pallet',
      type: 'success',
      icon: 'trophy',
      title: 'Best Pallet',
      message: `${bestPallet.name} has ${Math.round(bestROI)}% ROI`,
      priority: 78,
      navigation: { type: 'pallet', id: bestPallet.id },
    };
  }

  return null;
}

/**
 * Best supplier by average ROI across all their pallets
 * Uses COGS model: ROI based on allocated_cost of sold items
 */
function getBestSupplierInsight(soldItems: Item[], pallets: Pallet[]): Insight | null {
  // Group pallets by supplier
  const supplierPallets: Record<string, Pallet[]> = {};
  pallets.forEach(pallet => {
    if (!pallet.supplier) return;
    if (!supplierPallets[pallet.supplier]) {
      supplierPallets[pallet.supplier] = [];
    }
    supplierPallets[pallet.supplier].push(pallet);
  });

  if (Object.keys(supplierPallets).length === 0) return null;

  // Calculate ROI per supplier using COGS model
  let bestSupplier = '';
  let bestROI = -Infinity;

  Object.entries(supplierPallets).forEach(([supplier, supplierPalletList]) => {
    let totalRevenue = 0;
    let totalAllocatedCost = 0;
    let totalFees = 0;
    let soldCount = 0;

    supplierPalletList.forEach(pallet => {
      const palletItems = soldItems.filter(item => item.pallet_id === pallet.id);
      palletItems.forEach(item => {
        totalRevenue += item.sale_price ?? 0;
        // Use allocated_cost (COGS) instead of full pallet cost
        totalAllocatedCost += item.allocated_cost ?? item.purchase_cost ?? 0;
        totalFees += (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
        soldCount += 1;
      });
    });

    const totalCost = totalAllocatedCost + totalFees;
    if (soldCount >= 3 && totalCost > 0) {
      const roi = ((totalRevenue - totalCost) / totalCost) * 100;
      if (roi > bestROI) {
        bestROI = roi;
        bestSupplier = supplier;
      }
    }
  });

  if (bestSupplier && bestROI > 0) {
    return {
      id: 'best-supplier',
      type: 'success',
      icon: 'trophy',
      title: 'Top Supplier',
      message: `${bestSupplier} pallets avg ${Math.round(bestROI)}% ROI`,
      priority: 76,
      navigation: { type: 'inventory' },
    };
  }

  return null;
}

/**
 * Best pallet type/source (e.g., "Amazon Medium", "Target") by ROI
 * Uses COGS model: ROI based on allocated_cost of sold items
 * Shows average retail value per pallet (what the community cares about)
 */
function getBestSourceTypeInsight(soldItems: Item[], pallets: Pallet[], allItems: Item[]): Insight | null {
  // Group pallets by source_name
  const sourceTypes: Record<string, { pallets: Pallet[]; revenue: number; allocatedCost: number; fees: number; retailValue: number; soldCount: number; totalItems: number }> = {};

  pallets.forEach(pallet => {
    const sourceName = pallet.source_name || pallet.source_type || 'Unknown';
    if (!sourceTypes[sourceName]) {
      sourceTypes[sourceName] = { pallets: [], revenue: 0, allocatedCost: 0, fees: 0, retailValue: 0, soldCount: 0, totalItems: 0 };
    }
    sourceTypes[sourceName].pallets.push(pallet);
  });

  // Calculate stats for each source type using COGS model
  Object.values(sourceTypes).forEach(source => {
    source.pallets.forEach(pallet => {
      // Get ALL items from this pallet (not just sold) for retail value
      const palletAllItems = allItems.filter(item => item.pallet_id === pallet.id);
      const palletSoldItems = soldItems.filter(item => item.pallet_id === pallet.id);

      // Sum retail values from all items
      palletAllItems.forEach(item => {
        source.retailValue += item.retail_price ?? 0;
        source.totalItems += 1;
      });

      // Use allocated_cost (COGS) for sold items instead of full pallet cost
      palletSoldItems.forEach(item => {
        source.revenue += item.sale_price ?? 0;
        source.allocatedCost += item.allocated_cost ?? item.purchase_cost ?? 0;
        source.fees += (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
        source.soldCount += 1;
      });
    });
  });

  let bestSource = '';
  let bestROI = -Infinity;
  let avgRetailPerPallet = 0;

  Object.entries(sourceTypes).forEach(([sourceName, stats]) => {
    const totalCost = stats.allocatedCost + stats.fees;
    if (stats.soldCount >= 3 && totalCost > 0) {
      const roi = ((stats.revenue - totalCost) / totalCost) * 100;
      if (roi > bestROI) {
        bestROI = roi;
        bestSource = sourceName;
        // Average retail value per pallet
        avgRetailPerPallet = stats.pallets.length > 0 ? stats.retailValue / stats.pallets.length : 0;
      }
    }
  });

  if (bestSource && bestSource !== 'Unknown' && bestROI > 0 && avgRetailPerPallet > 0) {
    return {
      id: 'best-source-type',
      type: 'success',
      icon: 'trending-up',
      title: 'Best Source',
      message: `${bestSource} pallets avg $${Math.round(avgRetailPerPallet)} retail, ${Math.round(bestROI)}% ROI`,
      priority: 74,
      navigation: { type: 'inventory' },
    };
  }

  return null;
}

/**
 * Fastest flip - item that sold quickest
 */
function getFastestFlipInsight(soldItems: Item[]): Insight | null {
  // Look at recent sales (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSales = soldItems.filter(item => {
    if (!item.sale_date || !item.listing_date) return false;
    return new Date(item.sale_date) >= thirtyDaysAgo;
  });

  if (recentSales.length === 0) return null;

  let fastestItem: Item | null = null;
  let fastestDays = Infinity;

  for (const item of recentSales) {
    const listingDate = new Date(item.listing_date!);
    const saleDate = new Date(item.sale_date!);
    const daysToSell = Math.floor((saleDate.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToSell < fastestDays) {
      fastestDays = daysToSell;
      fastestItem = item;
    }
  }

  if (fastestItem && fastestDays <= 3) {
    const dayText = fastestDays === 0 ? 'same day' : fastestDays === 1 ? '1 day' : `${fastestDays} days`;
    return {
      id: 'fastest-flip',
      type: 'success',
      icon: 'flash',
      title: 'Speed Sell',
      message: `${fastestItem.name} sold in ${dayText}!`,
      priority: 72,
      navigation: { type: 'item', id: fastestItem.id },
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
