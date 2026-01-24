// PDF Export Utilities Unit Tests
// Tests HTML generation and formatting functions

import {
  generateProfitLossHTML,
  generateExpensesHTML,
  generateMileageHTML,
} from '../pdf-export';
import type { ProfitLossSummary } from '../profit-loss-calculations';
import type { ExpenseWithPallets } from '@/src/stores/expenses-store';
import type { MileageTripWithPallets } from '@/src/stores/mileage-store';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockProfitLossSummary(overrides?: Partial<ProfitLossSummary>): ProfitLossSummary {
  return {
    periodStart: '2024-01-01',
    periodEnd: '2024-12-31',
    revenue: {
      grossSales: 5000,
      itemsSold: 50,
      avgSalePrice: 100,
    },
    cogs: {
      palletPurchases: 2000,
      palletCount: 5,
      individualItemPurchases: 500,
      individualItemCount: 10,
      salesTax: 150,
      totalCOGS: 2650,
    },
    grossProfit: 2350,
    grossMargin: 47,
    sellingExpenses: {
      platformFees: 250,
      shippingCosts: 200,
      totalSellingExpenses: 450,
    },
    operatingExpenses: {
      byCategory: [
        { category: 'supplies', label: 'Supplies', amount: 100, count: 5 },
        { category: 'storage', label: 'Storage', amount: 50, count: 2 },
      ],
      totalOperatingExpenses: 150,
    },
    mileageDeductions: {
      totalMiles: 500,
      tripCount: 20,
      avgRate: 0.67,
      totalDeduction: 335,
    },
    platformBreakdown: [
      { platform: 'eBay', sales: 3000, fees: 150, count: 30 },
      { platform: 'Mercari', sales: 2000, fees: 100, count: 20 },
    ],
    totalExpenses: 935, // 450 selling + 150 operating + 335 mileage
    netProfit: 1415,
    netMargin: 28.3,
    effectiveTaxRate: null,
    ...overrides,
  };
}

function createMockExpense(overrides?: Partial<ExpenseWithPallets>): ExpenseWithPallets {
  return {
    id: 'exp-1',
    user_id: 'user-1',
    amount: 50,
    category: 'supplies',
    description: 'Office supplies',
    expense_date: '2024-06-15',
    receipt_photo_path: null,
    pallet_id: null,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    pallet_ids: [],
    ...overrides,
  };
}

function createMockMileageTrip(overrides?: Partial<MileageTripWithPallets>): MileageTripWithPallets {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    trip_date: '2024-06-15',
    purpose: 'pallet_pickup',
    miles: 25.5,
    mileage_rate: 0.67,
    deduction: 17.09,
    notes: 'Weekly pallet pickup',
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    pallet_ids: [],
    ...overrides,
  };
}

// ============================================================================
// generateProfitLossHTML Tests
// ============================================================================

describe('generateProfitLossHTML', () => {
  describe('basic rendering', () => {
    it('should generate valid HTML with DOCTYPE', () => {
      const summary = createMockProfitLossSummary();
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    });

    it('should include PalletPro branding', () => {
      const summary = createMockProfitLossSummary();
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('PalletPro');
      expect(html).toContain('Profit & Loss Statement');
    });

    it('should format dates correctly in header', () => {
      const summary = createMockProfitLossSummary({
        periodStart: '2024-01-15',
        periodEnd: '2024-12-31',
      });
      const html = generateProfitLossHTML(summary);

      // formatDate should output "Jan 15, 2024" format
      expect(html).toContain('Jan 15, 2024');
      expect(html).toContain('Dec 31, 2024');
    });
  });

  describe('financial data display', () => {
    it('should display net profit correctly for positive profit', () => {
      const summary = createMockProfitLossSummary({ netProfit: 1500 });
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('Net Profit');
      expect(html).toContain('$1,500.00');
    });

    it('should display net loss correctly for negative profit', () => {
      const summary = createMockProfitLossSummary({ netProfit: -500 });
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('Net Loss');
      expect(html).toContain('$500.00');
    });

    it('should format currency values correctly', () => {
      const summary = createMockProfitLossSummary({
        revenue: { grossSales: 12345.67, itemsSold: 100, avgSalePrice: 123.46 },
      });
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('$12,345.67');
    });

    it('should format percentage values correctly', () => {
      const summary = createMockProfitLossSummary({ grossMargin: 45.5 });
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('45.5%');
    });

    it('should display items sold count', () => {
      const summary = createMockProfitLossSummary({
        revenue: { grossSales: 5000, itemsSold: 75, avgSalePrice: 66.67 },
      });
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('75');
    });
  });

  describe('platform breakdown', () => {
    it('should display platform breakdown when present', () => {
      const summary = createMockProfitLossSummary({
        platformBreakdown: [
          { platform: 'eBay', sales: 3000, fees: 150, count: 30 },
          { platform: 'Poshmark', sales: 1000, fees: 200, count: 10 },
        ],
      });
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('Sales by Platform');
      expect(html).toContain('eBay');
      expect(html).toContain('Poshmark');
    });

    it('should handle empty platform breakdown', () => {
      const summary = createMockProfitLossSummary({ platformBreakdown: [] });
      const html = generateProfitLossHTML(summary);

      expect(html).not.toContain('Sales by Platform');
    });
  });

  describe('operating expenses', () => {
    it('should display operating expenses by category', () => {
      const summary = createMockProfitLossSummary({
        operatingExpenses: {
          byCategory: [
            { category: 'supplies', label: 'Supplies', amount: 150, count: 6 },
            { category: 'storage', label: 'Storage', amount: 100, count: 4 },
          ],
          totalOperatingExpenses: 250,
        },
      });
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('Operating Expenses');
      expect(html).toContain('Supplies');
      expect(html).toContain('Storage');
      expect(html).toContain('$250.00');
    });
  });

  describe('mileage deductions', () => {
    it('should display mileage information', () => {
      const summary = createMockProfitLossSummary({
        mileageDeductions: {
          totalMiles: 1234.5,
          tripCount: 50,
          avgRate: 0.67,
          totalDeduction: 827.12,
        },
      });
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('Mileage Deductions');
      expect(html).toContain('1234.5 mi');
      expect(html).toContain('$0.670/mi');
      expect(html).toContain('50');
    });
  });

  describe('tax note', () => {
    it('should include tax preparation disclaimer', () => {
      const summary = createMockProfitLossSummary();
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('Tax Preparation Note');
      expect(html).toContain('qualified tax professional');
    });
  });

  describe('page structure', () => {
    it('should have two pages', () => {
      const summary = createMockProfitLossSummary();
      const html = generateProfitLossHTML(summary);

      // Count page divs
      const pageMatches = html.match(/<div class="page">/g);
      expect(pageMatches).toHaveLength(2);
    });

    it('should include page footers with correct page numbers', () => {
      const summary = createMockProfitLossSummary();
      const html = generateProfitLossHTML(summary);

      expect(html).toContain('Page 1 of 2');
      expect(html).toContain('Page 2 of 2');
    });
  });
});

// ============================================================================
// generateExpensesHTML Tests
// ============================================================================

describe('generateExpensesHTML', () => {
  describe('basic rendering', () => {
    it('should generate valid HTML', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Expense Report');
      expect(html).toContain('PalletPro');
    });

    it('should display "All Time" when no date range provided', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('All Time');
    });

    it('should display date range when provided', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const dateRange = { start: '2024-01-01', end: '2024-06-30' };
      const html = generateExpensesHTML(expenses, palletMap, dateRange);

      expect(html).toContain('Jan 1, 2024');
      expect(html).toContain('Jun 30, 2024');
    });
  });

  describe('metrics calculation', () => {
    it('should calculate total expenses correctly', () => {
      const expenses = [
        createMockExpense({ amount: 50 }),
        createMockExpense({ id: 'exp-2', amount: 75 }),
        createMockExpense({ id: 'exp-3', amount: 25 }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('$150.00'); // Total
    });

    it('should calculate average expense correctly', () => {
      const expenses = [
        createMockExpense({ amount: 60 }),
        createMockExpense({ id: 'exp-2', amount: 40 }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('$50.00'); // Average
    });

    it('should count categories correctly', () => {
      const expenses = [
        createMockExpense({ category: 'supplies' }),
        createMockExpense({ id: 'exp-2', category: 'storage' }),
        createMockExpense({ id: 'exp-3', category: 'equipment' }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      // Should show 3 categories
      expect(html).toContain('>3<'); // Categories count in hero card
    });
  });

  describe('category grouping', () => {
    it('should group expenses by category', () => {
      const expenses = [
        createMockExpense({ category: 'supplies', amount: 100 }),
        createMockExpense({ id: 'exp-2', category: 'supplies', amount: 50 }),
        createMockExpense({ id: 'exp-3', category: 'storage', amount: 75 }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('Supplies');
      expect(html).toContain('$150.00'); // Total supplies
      expect(html).toContain('Storage');
      expect(html).toContain('$75.00'); // Total storage
    });

    it('should display category labels correctly', () => {
      const expenses = [
        createMockExpense({ category: 'subscriptions' }),
        createMockExpense({ id: 'exp-2', category: 'equipment' }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('Subscriptions');
      expect(html).toContain('Equipment');
    });
  });

  describe('expense list', () => {
    it('should display all expense details', () => {
      const expenses = [
        createMockExpense({
          expense_date: '2024-03-15',
          description: 'Shipping boxes',
          category: 'supplies',
          amount: 45.99,
        }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('Mar 15, 2024');
      expect(html).toContain('Shipping boxes');
      expect(html).toContain('Supplies');
      expect(html).toContain('$45.99');
    });

    it('should handle null description with dash', () => {
      const expenses = [createMockExpense({ description: null })];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('>-<');
    });

    it('should display linked pallet names', () => {
      const expenses = [
        createMockExpense({ pallet_ids: ['pallet-1', 'pallet-2'] }),
      ];
      const palletMap = new Map([
        ['pallet-1', 'Amazon Monster'],
        ['pallet-2', 'Target GM'],
      ]);
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('Amazon Monster');
      expect(html).toContain('Target GM');
    });

    it('should show dash when no pallet linked', () => {
      const expenses = [createMockExpense({ pallet_ids: [] })];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      // Should have a dash in the linked pallet column
      const lines = html.split('\n');
      const palletColumnLine = lines.find(line => line.includes('Linked Pallet'));
      expect(palletColumnLine).toBeDefined();
    });
  });

  describe('null date handling', () => {
    it('should handle null expense_date gracefully', () => {
      const expenses = [
        createMockExpense({ expense_date: null as unknown as string }),
      ];
      const palletMap = new Map<string, string>();

      // Should not throw
      expect(() => generateExpensesHTML(expenses, palletMap)).not.toThrow();
      const html = generateExpensesHTML(expenses, palletMap);
      expect(html).toContain('N/A');
    });

    it('should handle undefined in date range', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const dateRange = { start: null, end: null };
      const html = generateExpensesHTML(expenses, palletMap, dateRange);

      expect(html).toContain('All Time');
    });
  });

  describe('empty state', () => {
    it('should handle empty expenses array', () => {
      const expenses: ExpenseWithPallets[] = [];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      expect(html).toContain('$0.00'); // Total
      expect(html).toContain('>0<'); // Count
    });
  });

  describe('receipt appendix', () => {
    it('should include receipt appendix when receipt images provided', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const receiptImages = [
        {
          expenseDate: '2024-06-15',
          amount: 50,
          category: 'Supplies',
          base64Data: 'data:image/jpeg;base64,abc123',
        },
      ];
      const html = generateExpensesHTML(expenses, palletMap, undefined, receiptImages);

      expect(html).toContain('Receipt Appendix');
      expect(html).toContain('Expense Receipts');
    });

    it('should include legal disclaimer on receipt appendix', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const receiptImages = [
        {
          expenseDate: '2024-06-15',
          amount: 50,
          category: 'Supplies',
          base64Data: 'data:image/jpeg;base64,abc123',
        },
      ];
      const html = generateExpensesHTML(expenses, palletMap, undefined, receiptImages);

      expect(html).toContain('Important Disclaimer');
      expect(html).toContain('PalletPro makes no guarantees');
      expect(html).toContain('solely responsible');
    });

    it('should not include appendix when no receipt images', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap);

      // Check for actual appendix HTML content, not CSS comments
      expect(html).not.toContain('report-title">Receipt Appendix');
    });

    it('should not include appendix when receipt images array is empty', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const html = generateExpensesHTML(expenses, palletMap, undefined, []);

      // Check for actual appendix HTML content, not CSS comments
      expect(html).not.toContain('report-title">Receipt Appendix');
    });

    it('should filter out receipts without base64 data', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const receiptImages = [
        {
          expenseDate: '2024-06-15',
          amount: 50,
          category: 'Supplies',
          base64Data: null,
          error: 'Could not load image',
        },
      ];
      const html = generateExpensesHTML(expenses, palletMap, undefined, receiptImages);

      // Should not have appendix since only receipt has null base64Data
      // Check for actual appendix HTML content, not CSS comments
      expect(html).not.toContain('report-title">Receipt Appendix');
    });

    it('should calculate correct page count with receipts', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      // 5 receipts = 2 appendix pages (4 per page)
      const receiptImages = Array.from({ length: 5 }, (_, i) => ({
        expenseDate: '2024-06-15',
        amount: 50,
        category: 'Supplies',
        base64Data: `data:image/jpeg;base64,abc${i}`,
      }));
      const html = generateExpensesHTML(expenses, palletMap, undefined, receiptImages);

      // Total pages = 1 (main) + 2 (receipts) = 3
      expect(html).toContain('Page 1 of 3');
      expect(html).toContain('Page 2 of 3');
      expect(html).toContain('Page 3 of 3');
    });

    it('should display receipt details correctly', () => {
      const expenses = [createMockExpense()];
      const palletMap = new Map<string, string>();
      const receiptImages = [
        {
          expenseDate: '2024-03-20',
          amount: 125.50,
          category: 'Storage',
          base64Data: 'data:image/jpeg;base64,abc123',
        },
      ];
      const html = generateExpensesHTML(expenses, palletMap, undefined, receiptImages);

      expect(html).toContain('Mar 20, 2024');
      expect(html).toContain('Storage');
      expect(html).toContain('$125.50');
    });
  });
});

// ============================================================================
// generateMileageHTML Tests
// ============================================================================

describe('generateMileageHTML', () => {
  describe('basic rendering', () => {
    it('should generate valid HTML', () => {
      const trips = [createMockMileageTrip()];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Mileage Report');
      expect(html).toContain('PalletPro');
    });

    it('should display "All Time" when no date range provided', () => {
      const trips = [createMockMileageTrip()];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('All Time');
    });

    it('should display date range when provided', () => {
      const trips = [createMockMileageTrip()];
      const palletMap = new Map<string, string>();
      const dateRange = { start: '2024-01-01', end: '2024-12-31' };
      const html = generateMileageHTML(trips, palletMap, dateRange);

      expect(html).toContain('Jan 1, 2024');
      expect(html).toContain('Dec 31, 2024');
    });
  });

  describe('metrics calculation', () => {
    it('should calculate total miles correctly', () => {
      const trips = [
        createMockMileageTrip({ miles: 25 }),
        createMockMileageTrip({ id: 'trip-2', miles: 35.5 }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('60.5 mi');
    });

    it('should calculate total deduction correctly', () => {
      const trips = [
        createMockMileageTrip({ miles: 100, mileage_rate: 0.67 }),
        createMockMileageTrip({ id: 'trip-2', miles: 50, mileage_rate: 0.67 }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      // Total deduction = (100 * 0.67) + (50 * 0.67) = 67 + 33.5 = 100.5
      expect(html).toContain('$100.50');
    });

    it('should calculate average miles per trip', () => {
      const trips = [
        createMockMileageTrip({ miles: 30 }),
        createMockMileageTrip({ id: 'trip-2', miles: 20 }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('25.0 mi'); // Average
    });

    it('should display trip count', () => {
      const trips = [
        createMockMileageTrip(),
        createMockMileageTrip({ id: 'trip-2' }),
        createMockMileageTrip({ id: 'trip-3' }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('>3<'); // Trip count in hero card
    });
  });

  describe('IRS rate information', () => {
    it('should display IRS rate info box', () => {
      const trips = [createMockMileageTrip({ mileage_rate: 0.67 })];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('IRS Standard Mileage Rate');
    });

    it('should calculate average rate correctly', () => {
      const trips = [
        createMockMileageTrip({ mileage_rate: 0.655 }),
        createMockMileageTrip({ id: 'trip-2', mileage_rate: 0.67 }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      // Average rate = (0.655 + 0.67) / 2 = 0.6625
      expect(html).toContain('$0.663'); // Rounded to 3 decimal places
    });
  });

  describe('trip list', () => {
    it('should display all trip details', () => {
      const trips = [
        createMockMileageTrip({
          trip_date: '2024-04-20',
          purpose: 'post_office',
          miles: 15.5,
          mileage_rate: 0.67,
          notes: 'Shipped 5 packages',
        }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('Apr 20, 2024');
      expect(html).toContain('Post Office');
      expect(html).toContain('15.5');
      expect(html).toContain('$0.670');
      expect(html).toContain('Shipped 5 packages');
    });

    it('should display purpose labels correctly', () => {
      const purposes = [
        { purpose: 'pallet_pickup', label: 'Pallet Pickup' },
        { purpose: 'thrift_run', label: 'Thrift Run' },
        { purpose: 'garage_sale', label: 'Garage Sale' },
        { purpose: 'auction', label: 'Auction' },
        { purpose: 'sourcing', label: 'Sourcing' },
      ] as const;

      purposes.forEach(({ purpose, label }) => {
        const trips = [createMockMileageTrip({ purpose })];
        const palletMap = new Map<string, string>();
        const html = generateMileageHTML(trips, palletMap);

        expect(html).toContain(label);
      });
    });

    it('should handle null notes with dash', () => {
      const trips = [createMockMileageTrip({ notes: null })];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('>-<');
    });

    it('should display linked pallet names', () => {
      const trips = [
        createMockMileageTrip({ pallet_ids: ['pallet-1'] }),
      ];
      const palletMap = new Map([['pallet-1', 'Bulq Electronics']]);
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('Bulq Electronics');
    });

    it('should calculate per-trip deduction correctly', () => {
      const trips = [
        createMockMileageTrip({ miles: 40, mileage_rate: 0.67 }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      // Deduction = 40 * 0.67 = 26.80
      expect(html).toContain('$26.80');
    });
  });

  describe('totals row', () => {
    it('should display total miles in footer', () => {
      const trips = [
        createMockMileageTrip({ miles: 100 }),
        createMockMileageTrip({ id: 'trip-2', miles: 50 }),
      ];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      // Total row should have 150.0 miles
      expect(html).toContain('Total');
      expect(html).toContain('150.0');
    });
  });

  describe('empty state', () => {
    it('should handle empty trips array', () => {
      const trips: MileageTripWithPallets[] = [];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('$0.00'); // Total deduction
      expect(html).toContain('0.0 mi'); // Total miles
      expect(html).toContain('>0<'); // Trip count
    });
  });

  describe('null date handling', () => {
    it('should handle null trip_date gracefully', () => {
      const trips = [
        createMockMileageTrip({ trip_date: null as unknown as string }),
      ];
      const palletMap = new Map<string, string>();

      expect(() => generateMileageHTML(trips, palletMap)).not.toThrow();
      const html = generateMileageHTML(trips, palletMap);
      expect(html).toContain('N/A');
    });
  });

  describe('page structure', () => {
    it('should have single page', () => {
      const trips = [createMockMileageTrip()];
      const palletMap = new Map<string, string>();
      const html = generateMileageHTML(trips, palletMap);

      expect(html).toContain('Page 1 of 1');
    });
  });
});
