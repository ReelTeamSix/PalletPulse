import {
  generateInsights,
  calculateAverageDaysToSell,
  Insight,
} from '../insights-engine';
import { Item, Pallet } from '@/src/types/database';

// Helper to create mock items
function createMockItem(overrides: Partial<Item> = {}): Item {
  return {
    id: `item-${Math.random().toString(36).substr(2, 9)}`,
    user_id: 'user-1',
    name: 'Test Item',
    status: 'unlisted',
    condition: 'good',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Item;
}

// Helper to create mock pallets
function createMockPallet(overrides: Partial<Pallet> = {}): Pallet {
  return {
    id: `pallet-${Math.random().toString(36).substr(2, 9)}`,
    user_id: 'user-1',
    name: 'Test Pallet',
    purchase_cost: 100,
    purchase_date: '2026-01-01',
    status: 'processed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Pallet;
}

// Helper to get date string N days ago
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

describe('insights-engine', () => {
  describe('generateInsights', () => {
    it('should return empty array for empty data', () => {
      const insights = generateInsights({ pallets: [], items: [] });
      expect(insights).toEqual([]);
    });

    it('should return max 3 insights', () => {
      // Create data that would trigger many insights
      const items: Item[] = [
        // First sale - triggers first-sale insight
        createMockItem({
          status: 'sold',
          sale_date: daysAgo(1),
          sale_price: 50,
          purchase_cost: 20,
        }),
      ];

      const insights = generateInsights({ pallets: [], items });
      expect(insights.length).toBeLessThanOrEqual(3);
    });

    it('should sort insights by priority (highest first)', () => {
      // Create scenario with multiple insights
      const pallet = createMockPallet({ id: 'p1', name: 'Great Pallet' });
      const items: Item[] = [
        // Multiple sold items from same pallet for best-source
        createMockItem({
          status: 'sold',
          pallet_id: 'p1',
          allocated_cost: 10,
          sale_price: 50,
          sale_date: daysAgo(5),
          listing_date: daysAgo(10),
        }),
        createMockItem({
          status: 'sold',
          pallet_id: 'p1',
          allocated_cost: 10,
          sale_price: 40,
          sale_date: daysAgo(3),
          listing_date: daysAgo(8),
        }),
        createMockItem({
          status: 'sold',
          pallet_id: 'p1',
          allocated_cost: 10,
          sale_price: 45,
          sale_date: daysAgo(1),
          listing_date: daysAgo(6),
        }),
        // Stale item
        createMockItem({
          status: 'listed',
          listing_date: daysAgo(35),
        }),
      ];

      const insights = generateInsights({ pallets: [pallet], items });

      // Should be sorted by priority
      for (let i = 1; i < insights.length; i++) {
        expect(insights[i - 1].priority).toBeGreaterThanOrEqual(insights[i].priority);
      }
    });
  });

  describe('first sale insight', () => {
    it('should show first sale insight for exactly 1 sale', () => {
      const items: Item[] = [
        createMockItem({
          status: 'sold',
          sale_date: daysAgo(1),
          sale_price: 50,
          purchase_cost: 20,
        }),
      ];

      const insights = generateInsights({ pallets: [], items });
      const firstSaleInsight = insights.find(i => i.id === 'first-sale');

      expect(firstSaleInsight).toBeDefined();
      expect(firstSaleInsight!.type).toBe('success');
      expect(firstSaleInsight!.message).toContain('$30.00'); // profit
    });

    it('should NOT show first sale insight for 0 or 2+ sales', () => {
      const items: Item[] = [
        createMockItem({ status: 'sold', sale_date: daysAgo(1) }),
        createMockItem({ status: 'sold', sale_date: daysAgo(2) }),
      ];

      const insights = generateInsights({ pallets: [], items });
      const firstSaleInsight = insights.find(i => i.id === 'first-sale');

      expect(firstSaleInsight).toBeUndefined();
    });
  });

  describe('stale inventory insight', () => {
    it('should warn about items listed 30+ days', () => {
      const items: Item[] = [
        createMockItem({
          status: 'listed',
          listing_date: daysAgo(35),
        }),
        createMockItem({
          status: 'listed',
          listing_date: daysAgo(40),
        }),
      ];

      const insights = generateInsights({ pallets: [], items });
      const staleInsight = insights.find(i => i.id === 'stale-inventory');

      expect(staleInsight).toBeDefined();
      expect(staleInsight!.type).toBe('warning');
      expect(staleInsight!.message).toContain('2 items');
    });

    it('should NOT warn about items listed < 30 days', () => {
      const items: Item[] = [
        createMockItem({
          status: 'listed',
          listing_date: daysAgo(20),
        }),
      ];

      const insights = generateInsights({ pallets: [], items });
      const staleInsight = insights.find(i => i.id === 'stale-inventory');

      expect(staleInsight).toBeUndefined();
    });

    it('should use custom threshold', () => {
      const items: Item[] = [
        createMockItem({
          status: 'listed',
          listing_date: daysAgo(15),
        }),
      ];

      const insights = generateInsights({
        pallets: [],
        items,
        staleThresholdDays: 10,
      });
      const staleInsight = insights.find(i => i.id === 'stale-inventory');

      expect(staleInsight).toBeDefined();
      expect(staleInsight!.message).toContain('10+ days');
    });
  });

  describe('best source insight', () => {
    it('should identify best performing source by ROI', () => {
      const pallet1 = createMockPallet({ id: 'p1', name: 'Great Pallet' });
      const pallet2 = createMockPallet({ id: 'p2', name: 'Okay Pallet' });

      const items: Item[] = [
        // Great Pallet: 200% ROI (cost 10, revenue 30)
        createMockItem({
          status: 'sold',
          pallet_id: 'p1',
          allocated_cost: 10,
          sale_price: 30,
          sale_date: daysAgo(5),
        }),
        createMockItem({
          status: 'sold',
          pallet_id: 'p1',
          allocated_cost: 10,
          sale_price: 30,
          sale_date: daysAgo(3),
        }),
        // Okay Pallet: 50% ROI (cost 20, revenue 30)
        createMockItem({
          status: 'sold',
          pallet_id: 'p2',
          allocated_cost: 20,
          sale_price: 30,
          sale_date: daysAgo(4),
        }),
        createMockItem({
          status: 'sold',
          pallet_id: 'p2',
          allocated_cost: 20,
          sale_price: 30,
          sale_date: daysAgo(2),
        }),
      ];

      const insights = generateInsights({ pallets: [pallet1, pallet2], items });
      const bestSourceInsight = insights.find(i => i.id === 'best-source');

      expect(bestSourceInsight).toBeDefined();
      expect(bestSourceInsight!.message).toContain('Great Pallet');
      expect(bestSourceInsight!.message).toContain('200%');
    });

    it('should require at least 3 sold items to show insight', () => {
      const pallet = createMockPallet({ id: 'p1', name: 'Test Pallet' });
      const items: Item[] = [
        createMockItem({
          status: 'sold',
          pallet_id: 'p1',
          allocated_cost: 10,
          sale_price: 50,
          sale_date: daysAgo(1),
        }),
        createMockItem({
          status: 'sold',
          pallet_id: 'p1',
          allocated_cost: 10,
          sale_price: 50,
          sale_date: daysAgo(2),
        }),
      ];

      const insights = generateInsights({ pallets: [pallet], items });
      const bestSourceInsight = insights.find(i => i.id === 'best-source');

      expect(bestSourceInsight).toBeUndefined();
    });
  });

  describe('quick flips insight', () => {
    it('should celebrate items sold within 7 days', () => {
      const items: Item[] = [
        createMockItem({
          status: 'sold',
          listing_date: daysAgo(10),
          sale_date: daysAgo(5), // 5 days to sell
          sale_price: 50,
        }),
        createMockItem({
          status: 'sold',
          listing_date: daysAgo(8),
          sale_date: daysAgo(5), // 3 days to sell
          sale_price: 40,
        }),
      ];

      const insights = generateInsights({ pallets: [], items });
      const quickFlipInsight = insights.find(i => i.id === 'quick-flips');

      expect(quickFlipInsight).toBeDefined();
      expect(quickFlipInsight!.type).toBe('success');
      expect(quickFlipInsight!.message).toContain('2 items');
    });

    it('should NOT show for items that took > 7 days to sell', () => {
      const items: Item[] = [
        createMockItem({
          status: 'sold',
          listing_date: daysAgo(50),
          sale_date: daysAgo(5), // 45 days to sell
          sale_price: 50,
        }),
      ];

      const insights = generateInsights({ pallets: [], items });
      const quickFlipInsight = insights.find(i => i.id === 'quick-flips');

      expect(quickFlipInsight).toBeUndefined();
    });
  });

  describe('unlisted items insight', () => {
    it('should remind about 5+ unlisted items', () => {
      const items: Item[] = Array(6).fill(null).map(() =>
        createMockItem({ status: 'unlisted' })
      );

      const insights = generateInsights({ pallets: [], items });
      const unlistedInsight = insights.find(i => i.id === 'unlisted-items');

      expect(unlistedInsight).toBeDefined();
      expect(unlistedInsight!.message).toContain('6 items');
    });

    it('should NOT show for < 5 unlisted items', () => {
      const items: Item[] = Array(4).fill(null).map(() =>
        createMockItem({ status: 'unlisted' })
      );

      const insights = generateInsights({ pallets: [], items });
      const unlistedInsight = insights.find(i => i.id === 'unlisted-items');

      expect(unlistedInsight).toBeUndefined();
    });
  });

  describe('milestone insights', () => {
    it('should celebrate 10 sales milestone', () => {
      const items: Item[] = Array(12).fill(null).map(() =>
        createMockItem({ status: 'sold', sale_date: daysAgo(1) })
      );

      const insights = generateInsights({ pallets: [], items });
      const milestoneInsight = insights.find(i => i.id === 'milestone-10');

      expect(milestoneInsight).toBeDefined();
      expect(milestoneInsight!.message).toContain('12 items');
    });

    it('should celebrate 50 sales milestone', () => {
      const items: Item[] = Array(52).fill(null).map(() =>
        createMockItem({ status: 'sold', sale_date: daysAgo(1) })
      );

      const insights = generateInsights({ pallets: [], items });
      const milestoneInsight = insights.find(i => i.id === 'milestone-50');

      expect(milestoneInsight).toBeDefined();
    });

    it('should NOT show milestone insight outside milestone range', () => {
      const items: Item[] = Array(20).fill(null).map(() =>
        createMockItem({ status: 'sold', sale_date: daysAgo(1) })
      );

      const insights = generateInsights({ pallets: [], items });
      const milestoneInsight = insights.find(i => i.id?.startsWith('milestone'));

      expect(milestoneInsight).toBeUndefined();
    });
  });

  describe('calculateAverageDaysToSell', () => {
    it('should calculate average days to sell', () => {
      const items: Item[] = [
        createMockItem({
          status: 'sold',
          listing_date: daysAgo(10),
          sale_date: daysAgo(5), // 5 days
        }),
        createMockItem({
          status: 'sold',
          listing_date: daysAgo(20),
          sale_date: daysAgo(5), // 15 days
        }),
      ];

      const avg = calculateAverageDaysToSell(items);
      expect(avg).toBe(10); // (5 + 15) / 2
    });

    it('should return null for items without dates', () => {
      const items: Item[] = [
        createMockItem({ status: 'sold' }),
      ];

      const avg = calculateAverageDaysToSell(items);
      expect(avg).toBeNull();
    });

    it('should return null for empty array', () => {
      const avg = calculateAverageDaysToSell([]);
      expect(avg).toBeNull();
    });
  });
});
