// Analytics Calculations Tests - Phase 9
import {
  filterByDateRange,
  calculateHeroMetrics,
  calculatePalletLeaderboard,
  calculateTypeComparison,
  getStaleItems,
  calculateProfitTrend,
  calculatePeriodSummary,
  getSourceTypeLabel,
} from '../analytics-calculations';
import type { Pallet, Item, Expense } from '@/src/types/database';
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
