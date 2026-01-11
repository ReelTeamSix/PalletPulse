// Profit Utilities Tests
import {
  calculateItemProfit,
  calculateItemProfitFromValues,
  calculateItemROI,
  calculateItemROIFromValues,
  allocateCosts,
  estimateAllocatedCost,
  calculatePalletProfit,
  calculateSimplePalletProfit,
  calculatePalletROI,
  formatCurrency,
  formatProfit,
  formatROI,
  getROIColor,
  isItemStale,
  getDaysSinceListed,
  getDaysToSell,
  calculateAverageDaysToSell,
  type PalletProfitResult,
  type CostAllocationOptions,
} from '../profit-utils';
import type { Item, Pallet, Expense } from '@/src/types/database';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  user_id: 'user-1',
  pallet_id: 'pallet-1',
  name: 'Test Item',
  description: null,
  quantity: 1,
  condition: 'used_good',
  retail_price: 100,
  listing_price: 50,
  sale_price: null,
  purchase_cost: null,
  allocated_cost: 25,
  storage_location: 'Garage',
  status: 'listed',
  listing_date: '2025-01-01',
  sale_date: null,
  sales_channel: null,
  barcode: null,
  source_type: 'pallet',
  source_name: null,
  notes: null,
  version: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const createMockPallet = (overrides: Partial<Pallet> = {}): Pallet => ({
  id: 'pallet-1',
  user_id: 'user-1',
  name: 'Test Pallet',
  supplier: 'GRPL',
  source_type: 'pallet',
  source_name: 'Amazon Monster',
  purchase_cost: 500,
  sales_tax: 30,
  purchase_date: '2025-01-01',
  status: 'processing',
  notes: null,
  version: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const createMockExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'expense-1',
  user_id: 'user-1',
  pallet_id: 'pallet-1',
  amount: 50,
  category: 'supplies',
  description: 'Test expense',
  expense_date: '2025-01-01',
  receipt_photo_path: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

// ============================================================================
// calculateItemProfit Tests
// ============================================================================

describe('calculateItemProfit', () => {
  it('should return 0 when sale_price is null', () => {
    const item = createMockItem({ sale_price: null });
    expect(calculateItemProfit(item)).toBe(0);
  });

  it('should calculate profit using allocated_cost when available', () => {
    const item = createMockItem({
      sale_price: 100,
      allocated_cost: 25,
      purchase_cost: 50,
    });
    expect(calculateItemProfit(item)).toBe(75);
  });

  it('should fall back to purchase_cost when allocated_cost is null', () => {
    const item = createMockItem({
      sale_price: 100,
      allocated_cost: null,
      purchase_cost: 30,
    });
    expect(calculateItemProfit(item)).toBe(70);
  });

  it('should return sale_price when both costs are null', () => {
    const item = createMockItem({
      sale_price: 100,
      allocated_cost: null,
      purchase_cost: null,
    });
    expect(calculateItemProfit(item)).toBe(100);
  });

  it('should handle negative profit (loss)', () => {
    const item = createMockItem({
      sale_price: 20,
      allocated_cost: 50,
    });
    expect(calculateItemProfit(item)).toBe(-30);
  });

  it('should handle zero profit', () => {
    const item = createMockItem({
      sale_price: 50,
      allocated_cost: 50,
    });
    expect(calculateItemProfit(item)).toBe(0);
  });
});

describe('calculateItemProfitFromValues', () => {
  it('should return 0 when salePrice is null', () => {
    expect(calculateItemProfitFromValues(null, 25, 30)).toBe(0);
  });

  it('should prioritize allocatedCost over purchaseCost', () => {
    expect(calculateItemProfitFromValues(100, 25, 50)).toBe(75);
  });

  it('should use purchaseCost when allocatedCost is null', () => {
    expect(calculateItemProfitFromValues(100, null, 30)).toBe(70);
  });

  it('should return salePrice when both costs are null', () => {
    expect(calculateItemProfitFromValues(100, null, null)).toBe(100);
  });
});

// ============================================================================
// calculateItemROI Tests
// ============================================================================

describe('calculateItemROI', () => {
  it('should return 0 when sale_price is null', () => {
    const item = createMockItem({ sale_price: null });
    expect(calculateItemROI(item)).toBe(0);
  });

  it('should calculate ROI correctly', () => {
    const item = createMockItem({
      sale_price: 150,
      allocated_cost: 100,
    });
    expect(calculateItemROI(item)).toBe(50); // 50% ROI
  });

  it('should return 100 when cost is 0 and sale is positive', () => {
    const item = createMockItem({
      sale_price: 50,
      allocated_cost: 0,
      purchase_cost: null,
    });
    expect(calculateItemROI(item)).toBe(100);
  });

  it('should return 0 when cost is 0 and sale is 0', () => {
    const item = createMockItem({
      sale_price: 0,
      allocated_cost: 0,
      purchase_cost: null,
    });
    expect(calculateItemROI(item)).toBe(0);
  });

  it('should handle negative ROI', () => {
    const item = createMockItem({
      sale_price: 50,
      allocated_cost: 100,
    });
    expect(calculateItemROI(item)).toBe(-50); // -50% ROI
  });

  it('should calculate correct 200% ROI', () => {
    const item = createMockItem({
      sale_price: 300,
      allocated_cost: 100,
    });
    expect(calculateItemROI(item)).toBe(200);
  });
});

describe('calculateItemROIFromValues', () => {
  it('should return 0 when salePrice is null', () => {
    expect(calculateItemROIFromValues(null, 100, 100)).toBe(0);
  });

  it('should calculate correctly', () => {
    expect(calculateItemROIFromValues(200, 100, null)).toBe(100);
  });
});

// ============================================================================
// allocateCosts Tests
// ============================================================================

describe('allocateCosts', () => {
  it('should return empty array for empty items', () => {
    const pallet = createMockPallet();
    expect(allocateCosts(pallet, [])).toEqual([]);
  });

  it('should allocate cost evenly to all items', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 0 });
    const items = [
      createMockItem({ id: 'item-1' }),
      createMockItem({ id: 'item-2' }),
      createMockItem({ id: 'item-3' }),
      createMockItem({ id: 'item-4' }),
    ];

    const result = allocateCosts(pallet, items);

    expect(result.length).toBe(4);
    result.forEach(item => {
      expect(item.calculated_allocated_cost).toBe(25); // 100 / 4
    });
  });

  it('should include sales tax in allocation', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 20 });
    const items = [
      createMockItem({ id: 'item-1' }),
      createMockItem({ id: 'item-2' }),
    ];

    const result = allocateCosts(pallet, items);

    result.forEach(item => {
      expect(item.calculated_allocated_cost).toBe(60); // (100 + 20) / 2
    });
  });

  it('should exclude unsellable items by default', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 0 });
    const items = [
      createMockItem({ id: 'item-1', condition: 'new' }),
      createMockItem({ id: 'item-2', condition: 'unsellable' }),
    ];

    const result = allocateCosts(pallet, items);

    const sellableItem = result.find(i => i.id === 'item-1');
    const unsellableItem = result.find(i => i.id === 'item-2');

    expect(sellableItem?.calculated_allocated_cost).toBe(100); // Full cost
    expect(unsellableItem?.calculated_allocated_cost).toBe(0);
  });

  it('should include unsellable items when option is true', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 0 });
    const items = [
      createMockItem({ id: 'item-1', condition: 'new' }),
      createMockItem({ id: 'item-2', condition: 'unsellable' }),
    ];

    const result = allocateCosts(pallet, items, { includeUnsellable: true });

    result.forEach(item => {
      expect(item.calculated_allocated_cost).toBe(50); // 100 / 2
    });
  });

  it('should handle all unsellable items', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 0 });
    const items = [
      createMockItem({ id: 'item-1', condition: 'unsellable' }),
      createMockItem({ id: 'item-2', condition: 'unsellable' }),
    ];

    const result = allocateCosts(pallet, items);

    result.forEach(item => {
      expect(item.calculated_allocated_cost).toBe(0);
    });
  });

  it('should handle single item', () => {
    const pallet = createMockPallet({ purchase_cost: 500, sales_tax: 30 });
    const items = [createMockItem({ id: 'item-1' })];

    const result = allocateCosts(pallet, items);

    expect(result[0].calculated_allocated_cost).toBe(530);
  });

  it('should handle null sales_tax', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: null });
    const items = [
      createMockItem({ id: 'item-1' }),
      createMockItem({ id: 'item-2' }),
    ];

    const result = allocateCosts(pallet, items);

    result.forEach(item => {
      expect(item.calculated_allocated_cost).toBe(50);
    });
  });
});

describe('estimateAllocatedCost', () => {
  it('should calculate cost per item', () => {
    expect(estimateAllocatedCost(100, 0, 4, false, 0)).toBe(25);
  });

  it('should include sales tax', () => {
    expect(estimateAllocatedCost(100, 20, 4, false, 0)).toBe(30);
  });

  it('should handle null sales tax', () => {
    expect(estimateAllocatedCost(100, null, 4, false, 0)).toBe(25);
  });

  it('should exclude unsellable items from division', () => {
    expect(estimateAllocatedCost(100, 0, 4, false, 1)).toBe(33.333333333333336);
  });

  it('should include unsellable when option is true', () => {
    expect(estimateAllocatedCost(100, 0, 4, true, 1)).toBe(25);
  });

  it('should return 0 for zero items', () => {
    expect(estimateAllocatedCost(100, 0, 0, false, 0)).toBe(0);
  });

  it('should return 0 when all items are unsellable', () => {
    expect(estimateAllocatedCost(100, 0, 2, false, 2)).toBe(0);
  });
});

// ============================================================================
// calculatePalletProfit Tests
// ============================================================================

describe('calculatePalletProfit', () => {
  it('should handle null pallet', () => {
    const result = calculatePalletProfit(null, [], []);

    expect(result.totalRevenue).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.netProfit).toBe(0);
    expect(result.roi).toBe(0);
  });

  it('should calculate revenue from sold items', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 0 });
    const items = [
      createMockItem({ id: '1', status: 'sold', sale_price: 50 }),
      createMockItem({ id: '2', status: 'sold', sale_price: 75 }),
      createMockItem({ id: '3', status: 'listed', sale_price: null }),
    ];

    const result = calculatePalletProfit(pallet, items, []);

    expect(result.totalRevenue).toBe(125); // 50 + 75
    expect(result.soldItemsCount).toBe(2);
  });

  it('should include expenses in cost', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 10 });
    const expenses = [
      createMockExpense({ amount: 20 }),
      createMockExpense({ amount: 30 }),
    ];

    const result = calculatePalletProfit(pallet, [], expenses);

    expect(result.totalCost).toBe(160); // 100 + 10 + 20 + 30
    expect(result.expenses).toBe(50);
  });

  it('should calculate net profit correctly', () => {
    const pallet = createMockPallet({ purchase_cost: 500, sales_tax: 30 });
    const items = [
      createMockItem({ status: 'sold', sale_price: 200 }),
      createMockItem({ status: 'sold', sale_price: 300 }),
      createMockItem({ status: 'sold', sale_price: 250 }),
    ];
    const expenses = [createMockExpense({ amount: 50 })];

    const result = calculatePalletProfit(pallet, items, expenses);

    expect(result.totalRevenue).toBe(750);
    expect(result.totalCost).toBe(580); // 500 + 30 + 50
    expect(result.netProfit).toBe(170); // 750 - 580
  });

  it('should calculate ROI correctly', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 0 });
    const items = [createMockItem({ status: 'sold', sale_price: 200 })];

    const result = calculatePalletProfit(pallet, items, []);

    expect(result.roi).toBe(100); // 100% ROI
  });

  it('should handle negative profit', () => {
    const pallet = createMockPallet({ purchase_cost: 500, sales_tax: 0 });
    const items = [createMockItem({ status: 'sold', sale_price: 100 })];

    const result = calculatePalletProfit(pallet, items, []);

    expect(result.netProfit).toBe(-400);
    expect(result.roi).toBe(-80); // -80% ROI
  });

  it('should count unsold items', () => {
    const pallet = createMockPallet();
    const items = [
      createMockItem({ id: '1', status: 'sold', sale_price: 50 }),
      createMockItem({ id: '2', status: 'listed' }),
      createMockItem({ id: '3', status: 'unlisted' }),
    ];

    const result = calculatePalletProfit(pallet, items, []);

    expect(result.totalItemsCount).toBe(3);
    expect(result.soldItemsCount).toBe(1);
    expect(result.unsoldItemsCount).toBe(2);
  });

  it('should calculate unsold value using listing_price', () => {
    const pallet = createMockPallet();
    const items = [
      createMockItem({ status: 'listed', listing_price: 50, retail_price: 100 }),
      createMockItem({ status: 'listed', listing_price: 75, retail_price: 150 }),
    ];

    const result = calculatePalletProfit(pallet, items, []);

    expect(result.unsoldValue).toBe(125); // 50 + 75
  });

  it('should fall back to retail_price for unsold value', () => {
    const pallet = createMockPallet();
    const items = [
      createMockItem({ status: 'listed', listing_price: null, retail_price: 100 }),
    ];

    const result = calculatePalletProfit(pallet, items, []);

    expect(result.unsoldValue).toBe(100);
  });

  it('should handle no sold items with positive ROI for zero cost', () => {
    const pallet = createMockPallet({ purchase_cost: 0, sales_tax: 0 });
    const items = [createMockItem({ status: 'sold', sale_price: 100 })];

    const result = calculatePalletProfit(pallet, items, []);

    expect(result.netProfit).toBe(100);
    expect(result.roi).toBe(100);
  });

  it('should handle pallet with no items', () => {
    const pallet = createMockPallet({ purchase_cost: 500, sales_tax: 30 });

    const result = calculatePalletProfit(pallet, [], []);

    expect(result.totalRevenue).toBe(0);
    expect(result.totalCost).toBe(530);
    expect(result.netProfit).toBe(-530);
    expect(result.totalItemsCount).toBe(0);
  });
});

describe('calculateSimplePalletProfit', () => {
  it('should return net profit', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 0 });
    const items = [createMockItem({ status: 'sold', sale_price: 150 })];

    expect(calculateSimplePalletProfit(pallet, items, [])).toBe(50);
  });
});

describe('calculatePalletROI', () => {
  it('should return ROI percentage', () => {
    const pallet = createMockPallet({ purchase_cost: 100, sales_tax: 0 });
    const items = [createMockItem({ status: 'sold', sale_price: 150 })];

    expect(calculatePalletROI(pallet, items, [])).toBe(50);
  });
});

// ============================================================================
// Formatting Tests
// ============================================================================

describe('formatCurrency', () => {
  it('should format positive numbers', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should format negative numbers', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
  });

  it('should handle small decimals', () => {
    expect(formatCurrency(0.1)).toBe('$0.10');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('should round to 2 decimal places', () => {
    expect(formatCurrency(12.999)).toBe('$13.00');
  });
});

describe('formatProfit', () => {
  it('should format positive profit', () => {
    const result = formatProfit(100);
    expect(result.value).toBe('$100.00');
    expect(result.color).toBe('#2E7D32');
    expect(result.isPositive).toBe(true);
  });

  it('should format negative profit', () => {
    const result = formatProfit(-50);
    expect(result.value).toBe('-$50.00');
    expect(result.color).toBe('#D32F2F');
    expect(result.isPositive).toBe(false);
  });

  it('should treat zero as positive', () => {
    const result = formatProfit(0);
    expect(result.isPositive).toBe(true);
  });
});

describe('formatROI', () => {
  it('should format positive ROI with plus sign', () => {
    expect(formatROI(50.5)).toBe('+50.5%');
  });

  it('should format negative ROI', () => {
    expect(formatROI(-25.3)).toBe('-25.3%');
  });

  it('should format zero ROI', () => {
    expect(formatROI(0)).toBe('+0.0%');
  });

  it('should round to 1 decimal place', () => {
    expect(formatROI(33.333)).toBe('+33.3%');
  });
});

describe('getROIColor', () => {
  it('should return green for high positive ROI', () => {
    expect(getROIColor(50)).toBe('#2E7D32');
  });

  it('should return light green for moderate positive ROI', () => {
    expect(getROIColor(10)).toBe('#4CAF50');
  });

  it('should return grey for zero ROI', () => {
    expect(getROIColor(0)).toBe('#9E9E9E');
  });

  it('should return orange for slight loss', () => {
    expect(getROIColor(-10)).toBe('#FFA000');
  });

  it('should return red for significant loss', () => {
    expect(getROIColor(-30)).toBe('#D32F2F');
  });

  it('should handle edge case at 20%', () => {
    expect(getROIColor(20)).toBe('#4CAF50');
  });

  it('should handle edge case at 21%', () => {
    expect(getROIColor(21)).toBe('#2E7D32');
  });
});

// ============================================================================
// Analysis Helpers Tests
// ============================================================================

describe('isItemStale', () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const twentyDaysAgo = new Date(today);
  twentyDaysAgo.setDate(today.getDate() - 20);

  it('should return false for sold items', () => {
    const item = createMockItem({
      status: 'sold',
      listing_date: thirtyDaysAgo.toISOString().split('T')[0],
    });
    expect(isItemStale(item)).toBe(false);
  });

  it('should return false for items without listing_date', () => {
    const item = createMockItem({ listing_date: null });
    expect(isItemStale(item)).toBe(false);
  });

  it('should return true for items listed 30+ days ago', () => {
    const item = createMockItem({
      status: 'listed',
      listing_date: thirtyDaysAgo.toISOString().split('T')[0],
    });
    expect(isItemStale(item)).toBe(true);
  });

  it('should return false for items listed less than 30 days ago', () => {
    const item = createMockItem({
      status: 'listed',
      listing_date: twentyDaysAgo.toISOString().split('T')[0],
    });
    expect(isItemStale(item)).toBe(false);
  });

  it('should use custom threshold', () => {
    const item = createMockItem({
      status: 'listed',
      listing_date: twentyDaysAgo.toISOString().split('T')[0],
    });
    expect(isItemStale(item, 15)).toBe(true);
  });
});

describe('getDaysSinceListed', () => {
  it('should return null when no listing_date', () => {
    const item = createMockItem({ listing_date: null });
    expect(getDaysSinceListed(item)).toBe(null);
  });

  it('should return 0 for today', () => {
    const today = new Date().toISOString().split('T')[0];
    const item = createMockItem({ listing_date: today });
    expect(getDaysSinceListed(item)).toBe(0);
  });

  it('should calculate days correctly', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const item = createMockItem({
      listing_date: tenDaysAgo.toISOString().split('T')[0],
    });
    expect(getDaysSinceListed(item)).toBe(10);
  });
});

describe('getDaysToSell', () => {
  it('should return null for unsold items', () => {
    const item = createMockItem({ status: 'listed' });
    expect(getDaysToSell(item)).toBe(null);
  });

  it('should return null when listing_date is missing', () => {
    const item = createMockItem({
      status: 'sold',
      listing_date: null,
      sale_date: '2025-01-15',
    });
    expect(getDaysToSell(item)).toBe(null);
  });

  it('should return null when sale_date is missing', () => {
    const item = createMockItem({
      status: 'sold',
      listing_date: '2025-01-01',
      sale_date: null,
    });
    expect(getDaysToSell(item)).toBe(null);
  });

  it('should calculate days correctly', () => {
    const item = createMockItem({
      status: 'sold',
      listing_date: '2025-01-01',
      sale_date: '2025-01-08',
    });
    expect(getDaysToSell(item)).toBe(7);
  });

  it('should return 0 for same-day sale', () => {
    const item = createMockItem({
      status: 'sold',
      listing_date: '2025-01-01',
      sale_date: '2025-01-01',
    });
    expect(getDaysToSell(item)).toBe(0);
  });
});

describe('calculateAverageDaysToSell', () => {
  it('should return null for empty array', () => {
    expect(calculateAverageDaysToSell([])).toBe(null);
  });

  it('should return null when no sold items', () => {
    const items = [
      createMockItem({ status: 'listed' }),
      createMockItem({ status: 'unlisted' }),
    ];
    expect(calculateAverageDaysToSell(items)).toBe(null);
  });

  it('should calculate average correctly', () => {
    const items = [
      createMockItem({
        id: '1',
        status: 'sold',
        listing_date: '2025-01-01',
        sale_date: '2025-01-08', // 7 days
      }),
      createMockItem({
        id: '2',
        status: 'sold',
        listing_date: '2025-01-01',
        sale_date: '2025-01-04', // 3 days
      }),
    ];
    expect(calculateAverageDaysToSell(items)).toBe(5); // (7 + 3) / 2
  });

  it('should exclude items without dates', () => {
    const items = [
      createMockItem({
        id: '1',
        status: 'sold',
        listing_date: '2025-01-01',
        sale_date: '2025-01-05', // 4 days
      }),
      createMockItem({
        id: '2',
        status: 'sold',
        listing_date: null,
        sale_date: '2025-01-10',
      }),
    ];
    expect(calculateAverageDaysToSell(items)).toBe(4);
  });
});
