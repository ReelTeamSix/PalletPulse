// Analytics Calculations Tests - Phase 9
import {
  filterByDateRange,
  calculateCOGS,
  calculateHeroMetrics,
  calculatePalletLeaderboard,
  calculateTypeComparison,
  calculateSupplierComparison,
  calculatePalletTypeComparison,
  calculateRetailMetrics,
  getStaleItems,
  calculateProfitTrend,
  calculatePeriodSummary,
  getSourceTypeLabel,
} from '../analytics-calculations';
import type { Pallet, Item } from '@/src/types/database';
import type { ExpenseWithPallets } from '@/src/stores/expenses-store';
import type { DateRange } from '@/src/components/ui/DateRangeFilter';

// ============================================================================
// Test Fixtures
// ============================================================================

const createPallet = (overrides: Partial<Pallet> = {}): Pallet => ({
  id: 'pallet-1',
  user_id: 'user-1',
  name: 'Test Pallet',
  supplier: 'Test Supplier',
  source_type: 'pallet',
  source_name: null,
  purchase_cost: 100,
  sales_tax: 10,
  purchase_date: '2024-01-01',
  status: 'completed',
  notes: null,
  version: 1,
  completion_prompt_dismissed: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  user_id: 'user-1',
  pallet_id: 'pallet-1',
  name: 'Test Item',
  description: null,
  quantity: 1,
  condition: 'new',
  retail_price: 50,
  listing_price: 40,
  sale_price: null,
  purchase_cost: null,
  allocated_cost: 27.5,
  storage_location: null,
  status: 'listed',
  listing_date: '2024-01-15',
  sale_date: null,
  sales_channel: null,
  barcode: null,
  source_type: 'pallet',
  source_name: null,
  notes: null,
  version: 1,
  platform: null,
  platform_fee: null,
  shipping_cost: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createExpense = (overrides: Partial<ExpenseWithPallets> = {}): ExpenseWithPallets => ({
  id: 'expense-1',
  user_id: 'user-1',
  pallet_id: 'pallet-1',
  amount: 20,
  category: 'supplies',
  description: 'Test expense',
  expense_date: '2024-01-10',
  receipt_photo_path: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  pallet_ids: ['pallet-1'],
  ...overrides,
});

// ============================================================================
// filterByDateRange Tests
// ============================================================================

describe('filterByDateRange', () => {
  const items = [
    { id: '1', sale_date: '2024-01-15' },
    { id: '2', sale_date: '2024-02-15' },
    { id: '3', sale_date: '2024-03-15' },
    { id: '4', sale_date: '2024-04-15' },
  ];

  it('should return all items when date range has null start and end', () => {
    const range: DateRange = { start: null, end: null, preset: 'custom' };
    const result = filterByDateRange(items, range, 'sale_date');
    expect(result).toHaveLength(4);
  });

  it('should filter items within date range', () => {
    const range: DateRange = {
      start: new Date(2024, 1, 1), // Feb 1
      end: new Date(2024, 2, 31),  // Mar 31
      preset: 'custom',
    };
    const result = filterByDateRange(items, range, 'sale_date');
    expect(result).toHaveLength(2);
    expect(result.map(i => i.id)).toEqual(['2', '3']);
  });

  it('should include boundary dates', () => {
    // Use a date range that spans a full day to avoid timezone issues
    const range: DateRange = {
      start: new Date(2024, 0, 14), // Jan 14
      end: new Date(2024, 0, 16),   // Jan 16
      preset: 'custom',
    };
    const result = filterByDateRange(items, range, 'sale_date');
    // Jan 15 is within Jan 14-16
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should return empty array when no items match', () => {
    const range: DateRange = {
      start: new Date(2023, 0, 1),
      end: new Date(2023, 11, 31),
      preset: 'custom',
    };
    const result = filterByDateRange(items, range, 'sale_date');
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// calculateCOGS Tests (Cost of Goods Sold Model)
// ============================================================================

describe('calculateCOGS', () => {
  it('should return zeros for empty array', () => {
    const result = calculateCOGS([]);
    expect(result).toEqual({
      totalRevenue: 0,
      totalCOGS: 0,
      totalFees: 0,
      netProfit: 0,
    });
  });

  it('should calculate revenue from sale prices', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', sale_price: 100 }),
      createItem({ id: 'i2', status: 'sold', sale_price: 150 }),
    ];

    const result = calculateCOGS(items);

    expect(result.totalRevenue).toBe(250);
  });

  it('should use allocated_cost when available', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', sale_price: 100, allocated_cost: 30, purchase_cost: 50 }),
      createItem({ id: 'i2', status: 'sold', sale_price: 150, allocated_cost: 45, purchase_cost: 60 }),
    ];

    const result = calculateCOGS(items);

    // Should use allocated_cost (30 + 45 = 75), not purchase_cost (50 + 60 = 110)
    expect(result.totalCOGS).toBe(75);
  });

  it('should fallback to purchase_cost when allocated_cost is null', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', sale_price: 100, allocated_cost: null, purchase_cost: 40 }),
      createItem({ id: 'i2', status: 'sold', sale_price: 150, allocated_cost: 25, purchase_cost: 50 }),
    ];

    const result = calculateCOGS(items);

    // i1: uses purchase_cost (40), i2: uses allocated_cost (25)
    expect(result.totalCOGS).toBe(65);
  });

  it('should include platform fees and shipping costs', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', sale_price: 100, allocated_cost: 30, platform_fee: 10, shipping_cost: 5 }),
      createItem({ id: 'i2', status: 'sold', sale_price: 150, allocated_cost: 45, platform_fee: 15, shipping_cost: 8 }),
    ];

    const result = calculateCOGS(items);

    expect(result.totalFees).toBe(38); // (10+5) + (15+8)
  });

  it('should calculate net profit correctly', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', sale_price: 100, allocated_cost: 30, platform_fee: 10, shipping_cost: 5 }),
    ];

    const result = calculateCOGS(items);

    // Revenue (100) - COGS (30) - Fees (15) = 55
    expect(result.netProfit).toBe(55);
  });

  it('should handle items with null sale_price by skipping them', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', sale_price: 100, allocated_cost: 30 }),
      createItem({ id: 'i2', status: 'listed', sale_price: null, allocated_cost: 40 }), // Not sold
    ];

    const result = calculateCOGS(items);

    // Only the sold item with sale_price should be counted
    expect(result.totalRevenue).toBe(100);
    expect(result.totalCOGS).toBe(30);
  });

  it('should handle missing costs gracefully (default to 0)', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', sale_price: 100, allocated_cost: null, purchase_cost: null }),
    ];

    const result = calculateCOGS(items);

    expect(result.totalCOGS).toBe(0);
    expect(result.netProfit).toBe(100);
  });
});

// ============================================================================
// COGS Model Integration Tests
// ============================================================================

describe('COGS Model Integration', () => {
  // These tests verify the Matching Principle:
  // When a date range is provided, only the costs of items sold within that period
  // should be counted, not the full pallet cost.

  describe('calculateHeroMetrics with date range (COGS model)', () => {
    it('should use item-level costs when date range is provided', () => {
      const pallets = [createPallet({ id: 'p1', purchase_cost: 200, sales_tax: 0 })];
      const items = [
        // Sold in January - should be included
        createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 100, allocated_cost: 50, sale_date: '2024-01-15' }),
        // Sold in March - should be excluded
        createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 150, allocated_cost: 50, sale_date: '2024-03-15' }),
        // Not sold - should not affect profit
        createItem({ id: 'i3', pallet_id: 'p1', status: 'listed', listing_price: 60, allocated_cost: 50 }),
      ];

      const dateRange: DateRange = {
        start: new Date(2024, 0, 1), // Jan 1
        end: new Date(2024, 0, 31),  // Jan 31
        preset: 'custom',
      };

      const result = calculateHeroMetrics(pallets, items, [], dateRange);

      // COGS model: Only January sale counted
      // Revenue: 100, COGS: 50, Profit: 50
      // NOT full pallet cost of 200
      expect(result.totalProfit).toBe(50);
      expect(result.totalItemsSold).toBe(1);
    });

    it('should use traditional pallet cost when no date range provided', () => {
      const pallets = [createPallet({ id: 'p1', purchase_cost: 200, sales_tax: 0 })];
      const items = [
        createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 100, allocated_cost: 50, sale_date: '2024-01-15' }),
        createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 150, allocated_cost: 50, sale_date: '2024-03-15' }),
      ];

      const result = calculateHeroMetrics(pallets, items, []);

      // Traditional model: Full pallet cost
      // Revenue: 250, Pallet Cost: 200, Profit: 50
      expect(result.totalProfit).toBe(50);
      expect(result.totalItemsSold).toBe(2);
    });

    it('should prevent false negative ROI for future quarters', () => {
      // This test verifies the fix for the -100% ROI bug
      // When filtering to a period with no sales, we should get 0 profit, not negative
      const pallets = [createPallet({ id: 'p1', purchase_cost: 200, sales_tax: 0 })];
      const items = [
        createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 100, allocated_cost: 50, sale_date: '2024-01-15' }),
        createItem({ id: 'i2', pallet_id: 'p1', status: 'listed', allocated_cost: 75 }),
        createItem({ id: 'i3', pallet_id: 'p1', status: 'listed', allocated_cost: 75 }),
      ];

      // Filter to Q2 (no sales)
      const dateRange: DateRange = {
        start: new Date(2024, 3, 1), // Apr 1
        end: new Date(2024, 5, 30),  // Jun 30
        preset: 'q2',
      };

      const result = calculateHeroMetrics(pallets, items, [], dateRange);

      // No sales in Q2 = no revenue, no COGS, zero profit (NOT -200)
      expect(result.totalProfit).toBe(0);
      expect(result.avgROI).toBe(0);
      expect(result.totalItemsSold).toBe(0);
    });
  });

  describe('calculatePalletLeaderboard with date range (COGS model)', () => {
    it('should use COGS for pallet profit when date range is provided', () => {
      const pallets = [createPallet({ id: 'p1', name: 'Test Pallet', purchase_cost: 200, sales_tax: 0 })];
      const items = [
        createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 100, allocated_cost: 50, sale_date: '2024-01-15' }),
        createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 150, allocated_cost: 50, sale_date: '2024-03-15' }),
      ];

      const dateRange: DateRange = {
        start: new Date(2024, 0, 1),
        end: new Date(2024, 0, 31),
        preset: 'custom',
      };

      const result = calculatePalletLeaderboard(pallets, items, [], dateRange);

      // COGS model for January
      expect(result[0].profit).toBe(50); // 100 - 50
      expect(result[0].soldCount).toBe(1);
      expect(result[0].itemCount).toBe(2); // Total items in pallet
    });

    it('should calculate ROI correctly with COGS model', () => {
      const pallets = [createPallet({ id: 'p1', name: 'Test Pallet', purchase_cost: 200, sales_tax: 0 })];
      const items = [
        createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 100, allocated_cost: 40, sale_date: '2024-01-15' }),
      ];

      const dateRange: DateRange = {
        start: new Date(2024, 0, 1),
        end: new Date(2024, 0, 31),
        preset: 'custom',
      };

      const result = calculatePalletLeaderboard(pallets, items, [], dateRange);

      // Profit: 100 - 40 = 60, Cost: 40, ROI: 150%
      expect(result[0].profit).toBe(60);
      expect(result[0].roi).toBe(150);
    });
  });

  describe('calculateSupplierComparison with date range (COGS model)', () => {
    it('should use COGS for supplier metrics when date range is provided', () => {
      const pallets = [
        createPallet({ id: 'p1', supplier: 'Bulq', purchase_cost: 200, sales_tax: 0 }),
        createPallet({ id: 'p2', supplier: 'Bulq', purchase_cost: 150, sales_tax: 0 }),
      ];
      const items = [
        createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 120, allocated_cost: 60, sale_date: '2024-01-15' }),
        createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 100, allocated_cost: 50, sale_date: '2024-03-15' }),
      ];

      const dateRange: DateRange = {
        start: new Date(2024, 0, 1),
        end: new Date(2024, 0, 31),
        preset: 'custom',
      };

      const result = calculateSupplierComparison(pallets, items, [], dateRange);

      const bulq = result.find(s => s.supplier === 'Bulq');
      // Only January sale: Revenue 120, COGS 60, Profit 60
      expect(bulq!.totalProfit).toBe(60);
      expect(bulq!.totalItemsSold).toBe(1);
    });
  });

  describe('calculateTypeComparison with date range (COGS model)', () => {
    it('should use COGS for type metrics when date range is provided', () => {
      const pallets = [
        createPallet({ id: 'p1', source_type: 'pallet', purchase_cost: 200, sales_tax: 0 }),
      ];
      const items = [
        createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 100, allocated_cost: 40, sale_date: '2024-01-15' }),
        createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 150, allocated_cost: 60, sale_date: '2024-03-15' }),
      ];

      const dateRange: DateRange = {
        start: new Date(2024, 0, 1),
        end: new Date(2024, 0, 31),
        preset: 'custom',
      };

      const result = calculateTypeComparison(pallets, items, [], dateRange);

      const palletType = result.find(t => t.sourceType === 'pallet');
      // Only January sale: Revenue 100, COGS 40, Profit 60
      expect(palletType!.totalProfit).toBe(60);
    });
  });

  describe('calculatePalletTypeComparison with date range (COGS model)', () => {
    it('should use COGS for pallet type metrics when date range is provided', () => {
      const pallets = [
        createPallet({ id: 'p1', source_name: 'Amazon Monster', purchase_cost: 300, sales_tax: 0 }),
      ];
      const items = [
        createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 80, allocated_cost: 30, sale_date: '2024-01-15' }),
        createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 120, allocated_cost: 50, sale_date: '2024-02-15' }),
        createItem({ id: 'i3', pallet_id: 'p1', status: 'listed', allocated_cost: 70 }),
      ];

      const dateRange: DateRange = {
        start: new Date(2024, 0, 1),
        end: new Date(2024, 0, 31),
        preset: 'custom',
      };

      const result = calculatePalletTypeComparison(pallets, items, [], dateRange);

      const amazonMonster = result.find(t => t.palletType === 'Amazon Monster');
      // Only January sale: Revenue 80, COGS 30, Profit 50
      expect(amazonMonster!.totalProfit).toBe(50);
      expect(amazonMonster!.totalItemsSold).toBe(1);
    });

    it('should use traditional model when no date range', () => {
      const pallets = [
        createPallet({ id: 'p1', source_name: 'Amazon Monster', purchase_cost: 100, sales_tax: 0 }),
      ];
      const items = [
        createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 80, allocated_cost: 30, sale_date: '2024-01-15' }),
        createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 120, allocated_cost: 50, sale_date: '2024-02-15' }),
      ];

      const result = calculatePalletTypeComparison(pallets, items, []);

      const amazonMonster = result.find(t => t.palletType === 'Amazon Monster');
      // Traditional: Revenue 200, Pallet Cost 100, Profit 100
      expect(amazonMonster!.totalProfit).toBe(100);
      expect(amazonMonster!.totalItemsSold).toBe(2);
    });
  });
});

// ============================================================================
// calculateHeroMetrics Tests
// ============================================================================

describe('calculateHeroMetrics', () => {
  it('should return zeros for empty data', () => {
    const result = calculateHeroMetrics([], [], []);
    expect(result).toEqual({
      totalProfit: 0,
      totalItemsSold: 0,
      avgROI: 0,
      activeInventoryValue: 0,
    });
  });

  it('should calculate metrics correctly with sold items', () => {
    const pallets = [createPallet({ id: 'p1', purchase_cost: 100, sales_tax: 0 })];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 50, allocated_cost: 25, sale_date: '2024-01-20' }),
      createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 80, allocated_cost: 25, sale_date: '2024-01-21' }),
      createItem({ id: 'i3', pallet_id: 'p1', status: 'listed', listing_price: 60, allocated_cost: 25 }),
      createItem({ id: 'i4', pallet_id: 'p1', status: 'listed', listing_price: 40, allocated_cost: 25 }),
    ];
    const expenses: ExpenseWithPallets[] = [];

    const result = calculateHeroMetrics(pallets, items, expenses);

    // Revenue: 50 + 80 = 130
    // Cost: pallet cost 100 + 0 tax = 100
    // Profit: 130 - 100 = 30
    expect(result.totalItemsSold).toBe(2);
    expect(result.activeInventoryValue).toBe(100); // 60 + 40 listing prices
    expect(result.totalProfit).toBe(30);
  });

  it('should handle individual items without pallet', () => {
    const items = [
      createItem({
        id: 'i1',
        pallet_id: null,
        status: 'sold',
        sale_price: 100,
        purchase_cost: 40,
        allocated_cost: null,
        sale_date: '2024-01-20',
      }),
    ];

    const result = calculateHeroMetrics([], items, []);

    expect(result.totalItemsSold).toBe(1);
    expect(result.totalProfit).toBe(60); // 100 - 40
  });

  it('should include platform fees and shipping in profit calculation', () => {
    const items = [
      createItem({
        id: 'i1',
        pallet_id: null,
        status: 'sold',
        sale_price: 100,
        purchase_cost: 40,
        allocated_cost: null,
        platform_fee: 10,
        shipping_cost: 5,
        sale_date: '2024-01-20',
      }),
    ];

    const result = calculateHeroMetrics([], items, []);

    expect(result.totalProfit).toBe(45); // 100 - 40 - 10 - 5
  });

  it('should filter pallet profits by date range correctly', () => {
    // This test verifies the fix for date range filtering in pallet profit calculation
    const pallets = [createPallet({ id: 'p1', purchase_cost: 100, sales_tax: 0 })];
    const items = [
      // Item sold in January (within date range)
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 80, allocated_cost: 50, sale_date: '2024-01-15' }),
      // Item sold in March (outside date range)
      createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 120, allocated_cost: 50, sale_date: '2024-03-15' }),
      // Unsold item (should be included for inventory value)
      createItem({ id: 'i3', pallet_id: 'p1', status: 'listed', listing_price: 60, allocated_cost: 25 }),
    ];

    // Filter to January only
    const dateRange: DateRange = {
      start: new Date(2024, 0, 1), // Jan 1
      end: new Date(2024, 0, 31),  // Jan 31
      preset: 'custom',
    };

    const result = calculateHeroMetrics(pallets, items, [], dateRange);

    // Only January sale should be counted
    expect(result.totalItemsSold).toBe(1);
    // Active inventory should still include the listed item
    expect(result.activeInventoryValue).toBe(60);
  });

  it('should only count sold items within date range for totalItemsSold', () => {
    // Note: allocated_cost: null forces fallback to purchase_cost for COGS model
    const items = [
      createItem({ id: 'i1', pallet_id: null, status: 'sold', sale_price: 50, purchase_cost: 20, allocated_cost: null, sale_date: '2024-01-15' }),
      createItem({ id: 'i2', pallet_id: null, status: 'sold', sale_price: 60, purchase_cost: 30, allocated_cost: null, sale_date: '2024-02-15' }),
      createItem({ id: 'i3', pallet_id: null, status: 'sold', sale_price: 70, purchase_cost: 35, allocated_cost: null, sale_date: '2024-03-15' }),
    ];

    const dateRange: DateRange = {
      start: new Date(2024, 0, 1),  // Jan 1
      end: new Date(2024, 1, 28),   // Feb 28
      preset: 'custom',
    };

    const result = calculateHeroMetrics([], items, [], dateRange);

    // Only Jan and Feb sales should be counted
    expect(result.totalItemsSold).toBe(2);
    // Profit (COGS model): (50-20) + (60-30) = 60
    expect(result.totalProfit).toBe(60);
  });
});

// ============================================================================
// calculatePalletLeaderboard Tests
// ============================================================================

describe('calculatePalletLeaderboard', () => {
  it('should return empty array for no pallets', () => {
    const result = calculatePalletLeaderboard([], [], []);
    expect(result).toHaveLength(0);
  });

  it('should sort pallets by profit descending', () => {
    const pallets = [
      createPallet({ id: 'p1', name: 'Low Profit', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', name: 'High Profit', purchase_cost: 50, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 120, allocated_cost: 100 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 150, allocated_cost: 50 }),
    ];

    const result = calculatePalletLeaderboard(pallets, items, []);

    expect(result[0].name).toBe('High Profit'); // 150 - 50 = 100 profit
    expect(result[1].name).toBe('Low Profit');  // 120 - 100 = 20 profit
    expect(result[0].profit).toBe(100);
    expect(result[1].profit).toBe(20);
  });

  it('should calculate sell-through rate correctly', () => {
    const pallets = [createPallet({ id: 'p1', purchase_cost: 100 })];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 50 }),
      createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 60 }),
      createItem({ id: 'i3', pallet_id: 'p1', status: 'listed' }),
      createItem({ id: 'i4', pallet_id: 'p1', status: 'listed' }),
    ];

    const result = calculatePalletLeaderboard(pallets, items, []);

    expect(result[0].soldCount).toBe(2);
    expect(result[0].itemCount).toBe(4);
    expect(result[0].sellThroughRate).toBe(50); // 2/4 = 50%
  });

  it('should handle multi-pallet expenses correctly', () => {
    const pallets = [
      createPallet({ id: 'p1', name: 'Pallet 1', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', name: 'Pallet 2', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 150 }),
    ];
    const expenses = [
      createExpense({ id: 'e1', amount: 40, pallet_ids: ['p1', 'p2'] }),
    ];

    const result = calculatePalletLeaderboard(pallets, items, expenses);

    // Each pallet gets $20 of the $40 expense
    // p1: 150 - 100 - 20 = 30 profit
    // p2: 150 - 100 - 20 = 30 profit
    expect(result[0].profit).toBe(30);
    expect(result[1].profit).toBe(30);
  });
});

// ============================================================================
// calculateTypeComparison Tests
// ============================================================================

describe('calculateTypeComparison', () => {
  it('should return empty array for no pallets', () => {
    const result = calculateTypeComparison([], [], []);
    expect(result).toHaveLength(0);
  });

  it('should aggregate metrics by source type', () => {
    const pallets = [
      createPallet({ id: 'p1', source_type: 'pallet', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', source_type: 'pallet', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p3', source_type: 'thrift', purchase_cost: 20, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 180 }),
      createItem({ id: 'i3', pallet_id: 'p3', status: 'sold', sale_price: 50 }),
    ];

    const result = calculateTypeComparison(pallets, items, []);

    expect(result).toHaveLength(2);
    // Thrift has higher ROI: (50-20)/20 = 150%
    // Pallet: (150+180 - 200)/200 = 65%
    expect(result[0].sourceType).toBe('thrift');
    expect(result[0].palletCount).toBe(1);
    expect(result[1].sourceType).toBe('pallet');
    expect(result[1].palletCount).toBe(2);
  });

  it('should calculate avg profit per pallet', () => {
    const pallets = [
      createPallet({ id: 'p1', source_type: 'pallet', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', source_type: 'pallet', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 200 }),
    ];

    const result = calculateTypeComparison(pallets, items, []);

    // Total profit: 50 + 100 = 150
    // Avg profit per pallet: 150 / 2 = 75
    expect(result[0].avgProfitPerPallet).toBe(75);
  });
});

// ============================================================================
// getStaleItems Tests
// ============================================================================

describe('getStaleItems', () => {
  // Mock current date for consistent testing
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 2, 15)); // March 15, 2024
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should return empty array when no stale items', () => {
    const items = [
      createItem({ id: 'i1', status: 'listed', listing_date: '2024-03-01' }),
    ];
    const result = getStaleItems(items, [], 30);
    expect(result).toHaveLength(0);
  });

  it('should identify stale items correctly', () => {
    const items = [
      createItem({ id: 'i1', status: 'listed', listing_date: '2024-02-01', name: 'Stale Item' }),
      createItem({ id: 'i2', status: 'listed', listing_date: '2024-03-10', name: 'Fresh Item' }),
    ];
    const result = getStaleItems(items, [], 30);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Stale Item');
    expect(result[0].daysListed).toBeGreaterThanOrEqual(30);
  });

  it('should not include sold items', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', listing_date: '2024-01-01' }),
    ];
    const result = getStaleItems(items, [], 30);
    expect(result).toHaveLength(0);
  });

  it('should sort by days listed descending', () => {
    const items = [
      createItem({ id: 'i1', status: 'listed', listing_date: '2024-02-10', name: 'Newer' }),
      createItem({ id: 'i2', status: 'listed', listing_date: '2024-01-01', name: 'Oldest' }),
      createItem({ id: 'i3', status: 'listed', listing_date: '2024-02-01', name: 'Middle' }),
    ];
    const result = getStaleItems(items, [], 30);

    expect(result[0].name).toBe('Oldest');
    expect(result[1].name).toBe('Middle');
    expect(result[2].name).toBe('Newer');
  });

  it('should include pallet name when available', () => {
    const pallets = [createPallet({ id: 'p1', name: 'Amazon Returns' })];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'listed', listing_date: '2024-01-01' }),
    ];
    const result = getStaleItems(items, pallets, 30);

    expect(result[0].palletName).toBe('Amazon Returns');
  });
});

// ============================================================================
// calculateProfitTrend Tests
// ============================================================================

describe('calculateProfitTrend', () => {
  it('should return empty array for no sold items', () => {
    const items = [createItem({ status: 'listed' })];
    const result = calculateProfitTrend(items, 'monthly');
    expect(result).toHaveLength(0);
  });

  it('should group by month correctly', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', sale_price: 50, allocated_cost: 20, sale_date: '2024-01-15' }),
      createItem({ id: 'i2', status: 'sold', sale_price: 60, allocated_cost: 25, sale_date: '2024-01-20' }),
      createItem({ id: 'i3', status: 'sold', sale_price: 70, allocated_cost: 30, sale_date: '2024-02-10' }),
    ];

    const result = calculateProfitTrend(items, 'monthly');

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2024-01-01');
    expect(result[0].itemsSold).toBe(2);
    expect(result[0].profit).toBe(65); // (50-20) + (60-25)
    expect(result[1].date).toBe('2024-02-01');
    expect(result[1].itemsSold).toBe(1);
    expect(result[1].profit).toBe(40); // 70-30
  });

  it('should sort data points chronologically', () => {
    const items = [
      createItem({ id: 'i1', status: 'sold', sale_price: 50, sale_date: '2024-03-15' }),
      createItem({ id: 'i2', status: 'sold', sale_price: 60, sale_date: '2024-01-10' }),
    ];

    const result = calculateProfitTrend(items, 'monthly');

    expect(result[0].date).toBe('2024-01-01');
    expect(result[1].date).toBe('2024-03-01');
  });
});

// ============================================================================
// calculatePeriodSummary Tests
// ============================================================================

describe('calculatePeriodSummary', () => {
  it('should return zeros for no sold items in range', () => {
    const items = [createItem({ status: 'listed' })];
    const range: DateRange = {
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 31),
      preset: 'custom',
    };

    const result = calculatePeriodSummary(items, range);

    expect(result.itemsSold).toBe(0);
    expect(result.revenue).toBe(0);
    expect(result.profit).toBe(0);
    expect(result.avgSalePrice).toBe(0);
  });

  it('should calculate summary correctly', () => {
    const items = [
      createItem({
        id: 'i1',
        status: 'sold',
        sale_price: 100,
        allocated_cost: 30,
        sale_date: '2024-01-15',
      }),
      createItem({
        id: 'i2',
        status: 'sold',
        sale_price: 80,
        allocated_cost: 40,
        sale_date: '2024-01-20',
      }),
    ];
    const range: DateRange = {
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 31),
      preset: 'custom',
    };

    const result = calculatePeriodSummary(items, range);

    expect(result.itemsSold).toBe(2);
    expect(result.revenue).toBe(180); // 100 + 80
    expect(result.profit).toBe(110); // (100-30) + (80-40)
    expect(result.avgSalePrice).toBe(90); // 180 / 2
  });
});

// ============================================================================
// getSourceTypeLabel Tests
// ============================================================================

describe('getSourceTypeLabel', () => {
  it('should return correct labels', () => {
    expect(getSourceTypeLabel('pallet')).toBe('Pallet');
    expect(getSourceTypeLabel('thrift')).toBe('Thrift Store');
    expect(getSourceTypeLabel('garage_sale')).toBe('Garage Sale');
    expect(getSourceTypeLabel('retail_arbitrage')).toBe('Retail Arbitrage');
    expect(getSourceTypeLabel('mystery_box')).toBe('Mystery Box');
    expect(getSourceTypeLabel('other')).toBe('Other');
  });
});

// ============================================================================
// calculateSupplierComparison Tests
// ============================================================================

describe('calculateSupplierComparison', () => {
  it('should return empty array for no pallets', () => {
    const result = calculateSupplierComparison([], [], []);
    expect(result).toHaveLength(0);
  });

  it('should group pallets by supplier', () => {
    const pallets = [
      createPallet({ id: 'p1', supplier: 'Bulq', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', supplier: 'Bulq', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p3', supplier: '888Lots', purchase_cost: 50, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 180 }),
      createItem({ id: 'i3', pallet_id: 'p3', status: 'sold', sale_price: 100 }),
    ];

    const result = calculateSupplierComparison(pallets, items, []);

    expect(result).toHaveLength(2);

    // 888Lots has higher ROI: (100-50)/50 = 100%
    // Bulq: (150+180 - 200)/200 = 65%
    const bulq = result.find(s => s.supplier === 'Bulq');
    const lots888 = result.find(s => s.supplier === '888Lots');

    expect(bulq).toBeDefined();
    expect(lots888).toBeDefined();
    expect(bulq!.palletCount).toBe(2);
    expect(lots888!.palletCount).toBe(1);
  });

  it('should sort by total profit descending', () => {
    const pallets = [
      createPallet({ id: 'p1', supplier: 'LowProfit', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', supplier: 'HighProfit', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 120 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 250 }),
    ];

    const result = calculateSupplierComparison(pallets, items, []);

    expect(result[0].supplier).toBe('HighProfit');
    expect(result[0].totalProfit).toBe(150); // 250 - 100
    expect(result[1].supplier).toBe('LowProfit');
    expect(result[1].totalProfit).toBe(20); // 120 - 100
  });

  it('should calculate avg profit per pallet correctly', () => {
    const pallets = [
      createPallet({ id: 'p1', supplier: 'TestSupplier', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', supplier: 'TestSupplier', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 200 }),
    ];

    const result = calculateSupplierComparison(pallets, items, []);

    // Total profit: 50 + 100 = 150
    // Avg profit per pallet: 150 / 2 = 75
    expect(result[0].avgProfitPerPallet).toBe(75);
  });

  it('should handle pallets with null/empty supplier', () => {
    const pallets = [
      createPallet({ id: 'p1', supplier: null, purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', supplier: '', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p3', supplier: 'Bulq', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i3', pallet_id: 'p3', status: 'sold', sale_price: 150 }),
    ];

    const result = calculateSupplierComparison(pallets, items, []);

    // Should have 2 groups: "Unknown" (for null/empty) and "Bulq"
    expect(result).toHaveLength(2);
    const unknown = result.find(s => s.supplier === 'Unknown');
    expect(unknown).toBeDefined();
    expect(unknown!.palletCount).toBe(2);
  });

  it('should calculate sell-through rate correctly', () => {
    const pallets = [createPallet({ id: 'p1', supplier: 'Bulq', purchase_cost: 100 })];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 50 }),
      createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 60 }),
      createItem({ id: 'i3', pallet_id: 'p1', status: 'listed' }),
      createItem({ id: 'i4', pallet_id: 'p1', status: 'listed' }),
    ];

    const result = calculateSupplierComparison(pallets, items, []);

    expect(result[0].totalItemsSold).toBe(2);
    expect(result[0].sellThroughRate).toBe(50); // 2/4 = 50%
  });

  it('should handle expenses correctly', () => {
    const pallets = [
      createPallet({ id: 'p1', supplier: 'Bulq', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 200 }),
    ];
    const expenses = [
      createExpense({ id: 'e1', amount: 30, pallet_ids: ['p1'] }),
    ];

    const result = calculateSupplierComparison(pallets, items, expenses);

    // Profit: 200 - 100 - 30 = 70
    expect(result[0].totalProfit).toBe(70);
  });
});

// ============================================================================
// calculatePalletTypeComparison Tests
// ============================================================================

describe('calculatePalletTypeComparison', () => {
  it('should return empty array for no pallets', () => {
    const result = calculatePalletTypeComparison([], [], []);
    expect(result).toHaveLength(0);
  });

  it('should group pallets by source_name', () => {
    const pallets = [
      createPallet({ id: 'p1', source_name: 'Amazon Monster', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', source_name: 'Amazon Monster', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p3', source_name: 'Target GM', purchase_cost: 50, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 180 }),
      createItem({ id: 'i3', pallet_id: 'p3', status: 'sold', sale_price: 100 }),
    ];

    const result = calculatePalletTypeComparison(pallets, items, []);

    expect(result).toHaveLength(2);

    const amazonMonster = result.find(p => p.palletType === 'Amazon Monster');
    const targetGM = result.find(p => p.palletType === 'Target GM');

    expect(amazonMonster).toBeDefined();
    expect(targetGM).toBeDefined();
    expect(amazonMonster!.palletCount).toBe(2);
    expect(targetGM!.palletCount).toBe(1);
  });

  it('should sort by total profit descending', () => {
    const pallets = [
      createPallet({ id: 'p1', source_name: 'LowProfit Type', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', source_name: 'HighProfit Type', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 120 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 250 }),
    ];

    const result = calculatePalletTypeComparison(pallets, items, []);

    expect(result[0].palletType).toBe('HighProfit Type');
    expect(result[0].totalProfit).toBe(150); // 250 - 100
    expect(result[1].palletType).toBe('LowProfit Type');
    expect(result[1].totalProfit).toBe(20); // 120 - 100
  });

  it('should handle pallets with null/empty source_name', () => {
    const pallets = [
      createPallet({ id: 'p1', source_name: null, purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', source_name: '', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p3', source_name: 'Amazon Monster', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i3', pallet_id: 'p3', status: 'sold', sale_price: 150 }),
    ];

    const result = calculatePalletTypeComparison(pallets, items, []);

    // Should have 2 groups: "Unspecified" (for null/empty) and "Amazon Monster"
    expect(result).toHaveLength(2);
    const unspecified = result.find(p => p.palletType === 'Unspecified');
    expect(unspecified).toBeDefined();
    expect(unspecified!.palletCount).toBe(2);
  });

  it('should track mystery box indicator based on source_type', () => {
    const pallets = [
      createPallet({ id: 'p1', source_name: 'Target Mystery', source_type: 'mystery_box', purchase_cost: 50 }),
      createPallet({ id: 'p2', source_name: 'Amazon Monster', source_type: 'pallet', purchase_cost: 100 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 80 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 150 }),
    ];

    const result = calculatePalletTypeComparison(pallets, items, []);

    const mysteryBox = result.find(p => p.palletType === 'Target Mystery');
    const pallet = result.find(p => p.palletType === 'Amazon Monster');

    expect(mysteryBox!.isMysteryBox).toBe(true);
    expect(pallet!.isMysteryBox).toBe(false);
  });

  it('should calculate sell-through rate correctly', () => {
    const pallets = [createPallet({ id: 'p1', source_name: 'Test Type', purchase_cost: 100 })];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 50 }),
      createItem({ id: 'i2', pallet_id: 'p1', status: 'sold', sale_price: 60 }),
      createItem({ id: 'i3', pallet_id: 'p1', status: 'listed' }),
      createItem({ id: 'i4', pallet_id: 'p1', status: 'listed' }),
    ];

    const result = calculatePalletTypeComparison(pallets, items, []);

    expect(result[0].totalItemsSold).toBe(2);
    expect(result[0].sellThroughRate).toBe(50); // 2/4 = 50%
  });

  it('should handle mixed source_types within same source_name', () => {
    // Edge case: same source_name but different source_types
    // Should group by source_name and use majority/first source_type
    const pallets = [
      createPallet({ id: 'p1', source_name: 'Target Mix', source_type: 'pallet', purchase_cost: 100, sales_tax: 0 }),
      createPallet({ id: 'p2', source_name: 'Target Mix', source_type: 'mystery_box', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 150 }),
      createItem({ id: 'i2', pallet_id: 'p2', status: 'sold', sale_price: 150 }),
    ];

    const result = calculatePalletTypeComparison(pallets, items, []);

    expect(result).toHaveLength(1);
    expect(result[0].palletType).toBe('Target Mix');
    expect(result[0].palletCount).toBe(2);
    // isMysteryBox is true if ANY pallet in the group is a mystery box
    expect(result[0].isMysteryBox).toBe(true);
  });

  it('should handle expenses correctly', () => {
    const pallets = [
      createPallet({ id: 'p1', source_name: 'Amazon Monster', purchase_cost: 100, sales_tax: 0 }),
    ];
    const items = [
      createItem({ id: 'i1', pallet_id: 'p1', status: 'sold', sale_price: 200 }),
    ];
    const expenses = [
      createExpense({ id: 'e1', amount: 30, pallet_ids: ['p1'] }),
    ];

    const result = calculatePalletTypeComparison(pallets, items, expenses);

    // Profit: 200 - 100 - 30 = 70
    expect(result[0].totalProfit).toBe(70);
  });
});

// ============================================================================
// calculateRetailMetrics Tests
// ============================================================================

describe('calculateRetailMetrics', () => {
  it('should return null when no items have retail prices', () => {
    const items = [
      createItem({ id: 'i1', retail_price: null }),
      createItem({ id: 'i2', retail_price: null }),
    ];

    const result = calculateRetailMetrics(items, 100);

    expect(result).toBeNull();
  });

  it('should return null when all retail prices are zero', () => {
    const items = [
      createItem({ id: 'i1', retail_price: 0 }),
      createItem({ id: 'i2', retail_price: 0 }),
    ];

    const result = calculateRetailMetrics(items, 100);

    expect(result).toBeNull();
  });

  it('should calculate total retail value correctly', () => {
    const items = [
      createItem({ id: 'i1', retail_price: 100 }),
      createItem({ id: 'i2', retail_price: 150 }),
      createItem({ id: 'i3', retail_price: 50 }),
    ];

    const result = calculateRetailMetrics(items, 100);

    expect(result).not.toBeNull();
    expect(result!.totalRetailValue).toBe(300);
  });

  it('should calculate retail recovery rate for sold items', () => {
    const items = [
      createItem({ id: 'i1', retail_price: 100, status: 'sold', sale_price: 80 }),
      createItem({ id: 'i2', retail_price: 100, status: 'sold', sale_price: 60 }),
      createItem({ id: 'i3', retail_price: 100, status: 'listed' }), // Not sold
    ];

    const result = calculateRetailMetrics(items, 100);

    // Sold items: 80 + 60 = 140 sale total, 100 + 100 = 200 retail total
    // Recovery rate: (140 / 200) * 100 = 70%
    expect(result).not.toBeNull();
    expect(result!.retailRecoveryRate).toBe(70);
  });

  it('should calculate cost per dollar retail correctly', () => {
    const items = [
      createItem({ id: 'i1', retail_price: 200 }),
      createItem({ id: 'i2', retail_price: 300 }),
    ];

    // $100 cost / $500 retail = $0.20 per dollar
    const result = calculateRetailMetrics(items, 100);

    expect(result).not.toBeNull();
    expect(result!.costPerDollarRetail).toBe(0.2);
  });

  it('should ignore items without retail prices in calculations', () => {
    const items = [
      createItem({ id: 'i1', retail_price: 200 }),
      createItem({ id: 'i2', retail_price: null }), // Should be ignored
      createItem({ id: 'i3', retail_price: 100 }),
    ];

    const result = calculateRetailMetrics(items, 150);

    expect(result).not.toBeNull();
    expect(result!.totalRetailValue).toBe(300);
    expect(result!.costPerDollarRetail).toBe(0.5); // 150 / 300
  });

  it('should handle edge case of zero retail recovery when no sold items', () => {
    const items = [
      createItem({ id: 'i1', retail_price: 100, status: 'listed' }),
      createItem({ id: 'i2', retail_price: 100, status: 'unlisted' }),
    ];

    const result = calculateRetailMetrics(items, 100);

    expect(result).not.toBeNull();
    expect(result!.retailRecoveryRate).toBe(0);
  });
});
