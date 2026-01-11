// Expense Form Schema Tests
import {
  expenseFormSchema,
  ExpenseFormData,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  getDefaultExpenseFormValues,
  getLocalDateString,
  formatExpenseDate,
  getCategoryLabel,
  getCategoryColor,
  formatExpenseAmount,
  parseCurrencyInput,
  groupExpensesByCategory,
  calculateTotalByCategory,
  calculateTotalExpenses,
  filterExpensesByDateRange,
  filterExpensesByCategory,
  getUniquePalletIds,
  isLinkedToPallet,
  sortExpensesByDate,
  sortExpensesByAmount,
} from './expense-form-schema';
import { ExpenseCategory } from '@/src/types/database';

describe('expenseFormSchema', () => {
  const validExpense: ExpenseFormData = {
    amount: 50.00,
    category: 'supplies',
    description: 'Packing tape and boxes',
    expense_date: '2024-01-15',
    pallet_id: null,
    receipt_photo_path: null,
  };

  describe('amount validation', () => {
    it('should accept valid positive amount', () => {
      const result = expenseFormSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it('should accept amount at maximum limit', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        amount: 999999.99,
      });
      expect(result.success).toBe(true);
    });

    it('should reject zero amount', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        amount: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('greater than zero');
      }
    });

    it('should reject negative amount', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        amount: -10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject amount exceeding maximum', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        amount: 1000000,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('exceed');
      }
    });

    it('should reject non-numeric amount', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        amount: 'fifty' as any,
      });
      expect(result.success).toBe(false);
    });

    it('should accept decimal amounts', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        amount: 19.99,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('category validation', () => {
    it('should accept all valid categories', () => {
      for (const category of EXPENSE_CATEGORIES) {
        const result = expenseFormSchema.safeParse({
          ...validExpense,
          category,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid category', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        category: 'invalid' as any,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty category', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        category: '' as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('description validation', () => {
    it('should accept valid description', () => {
      const result = expenseFormSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it('should accept null description', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept undefined description', () => {
      const expense = { ...validExpense };
      delete (expense as any).description;
      const result = expenseFormSchema.safeParse(expense);
      expect(result.success).toBe(true);
    });

    it('should transform empty string to null', () => {
      const result = expenseFormSchema.parse({
        ...validExpense,
        description: '',
      });
      expect(result.description).toBeNull();
    });

    it('should transform whitespace-only string to null', () => {
      const result = expenseFormSchema.parse({
        ...validExpense,
        description: '   ',
      });
      expect(result.description).toBeNull();
    });

    it('should trim description whitespace', () => {
      const result = expenseFormSchema.parse({
        ...validExpense,
        description: '  Packing supplies  ',
      });
      expect(result.description).toBe('Packing supplies');
    });

    it('should reject description exceeding 500 characters', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        description: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should accept description at 500 characters', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        description: 'a'.repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('expense_date validation', () => {
    it('should accept valid date format', () => {
      const result = expenseFormSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it('should accept today date', () => {
      const today = getLocalDateString();
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        expense_date: today,
      });
      expect(result.success).toBe(true);
    });

    it('should accept past date', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        expense_date: '2020-01-01',
      });
      expect(result.success).toBe(true);
    });

    it('should reject future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        expense_date: getLocalDateString(futureDate),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('future');
      }
    });

    it('should reject invalid date format (MM-DD-YYYY)', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        expense_date: '01-15-2024',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format (no dashes)', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        expense_date: '20240115',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format (with time)', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        expense_date: '2024-01-15T10:30:00',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('pallet_id validation', () => {
    it('should accept null pallet_id', () => {
      const result = expenseFormSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it('should accept valid UUID pallet_id', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        pallet_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid pallet_id format', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        pallet_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should transform empty string to null', () => {
      const result = expenseFormSchema.parse({
        ...validExpense,
        pallet_id: '',
      });
      expect(result.pallet_id).toBeNull();
    });
  });

  describe('receipt_photo_path validation', () => {
    it('should accept null receipt_photo_path', () => {
      const result = expenseFormSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it('should accept valid photo path', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        receipt_photo_path: '/photos/receipt-123.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('should transform empty string to null', () => {
      const result = expenseFormSchema.parse({
        ...validExpense,
        receipt_photo_path: '',
      });
      expect(result.receipt_photo_path).toBeNull();
    });

    it('should reject path exceeding 1000 characters', () => {
      const result = expenseFormSchema.safeParse({
        ...validExpense,
        receipt_photo_path: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('getLocalDateString', () => {
  it('should return current date in YYYY-MM-DD format', () => {
    const result = getLocalDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return specified date in YYYY-MM-DD format', () => {
    const date = new Date(2024, 0, 15); // January 15, 2024
    const result = getLocalDateString(date);
    expect(result).toBe('2024-01-15');
  });

  it('should pad single digit months and days', () => {
    const date = new Date(2024, 4, 5); // May 5, 2024
    const result = getLocalDateString(date);
    expect(result).toBe('2024-05-05');
  });
});

describe('getDefaultExpenseFormValues', () => {
  it('should return default values with today date', () => {
    const today = getLocalDateString();
    const result = getDefaultExpenseFormValues();

    expect(result.amount).toBe(0);
    expect(result.category).toBe('other');
    expect(result.description).toBeNull();
    expect(result.expense_date).toBe(today);
    expect(result.pallet_id).toBeNull();
    expect(result.receipt_photo_path).toBeNull();
  });

  it('should set pallet_id when provided', () => {
    const palletId = '123e4567-e89b-12d3-a456-426614174000';
    const result = getDefaultExpenseFormValues(palletId);
    expect(result.pallet_id).toBe(palletId);
  });

  it('should handle null pallet_id', () => {
    const result = getDefaultExpenseFormValues(null);
    expect(result.pallet_id).toBeNull();
  });

  it('should handle undefined pallet_id', () => {
    const result = getDefaultExpenseFormValues(undefined);
    expect(result.pallet_id).toBeNull();
  });
});

describe('formatExpenseDate', () => {
  it('should format date string for display', () => {
    const result = formatExpenseDate('2024-01-15');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should handle different months', () => {
    const result = formatExpenseDate('2024-12-25');
    expect(result).toContain('Dec');
    expect(result).toContain('25');
  });
});

describe('getCategoryLabel', () => {
  it('should return label for each category', () => {
    expect(getCategoryLabel('supplies')).toBe('Supplies');
    expect(getCategoryLabel('gas')).toBe('Gas');
    expect(getCategoryLabel('mileage')).toBe('Mileage');
    expect(getCategoryLabel('storage')).toBe('Storage');
    expect(getCategoryLabel('fees')).toBe('Fees');
    expect(getCategoryLabel('shipping')).toBe('Shipping');
    expect(getCategoryLabel('other')).toBe('Other');
  });
});

describe('getCategoryColor', () => {
  it('should return color for each category', () => {
    expect(getCategoryColor('supplies')).toBe('#2196F3');
    expect(getCategoryColor('gas')).toBe('#FF9800');
    expect(getCategoryColor('mileage')).toBe('#9C27B0');
    expect(getCategoryColor('storage')).toBe('#4CAF50');
    expect(getCategoryColor('fees')).toBe('#F44336');
    expect(getCategoryColor('shipping')).toBe('#00BCD4');
    expect(getCategoryColor('other')).toBe('#9E9E9E');
  });
});

describe('formatExpenseAmount', () => {
  it('should format amount as USD currency', () => {
    expect(formatExpenseAmount(50)).toBe('$50.00');
  });

  it('should format decimal amounts', () => {
    expect(formatExpenseAmount(19.99)).toBe('$19.99');
  });

  it('should format zero', () => {
    expect(formatExpenseAmount(0)).toBe('$0.00');
  });

  it('should format large amounts with commas', () => {
    expect(formatExpenseAmount(1234.56)).toBe('$1,234.56');
  });

  it('should handle negative amounts', () => {
    const result = formatExpenseAmount(-50);
    expect(result).toContain('50.00');
  });
});

describe('parseCurrencyInput', () => {
  it('should parse plain number string', () => {
    expect(parseCurrencyInput('50')).toBe(50);
  });

  it('should parse decimal string', () => {
    expect(parseCurrencyInput('19.99')).toBe(19.99);
  });

  it('should remove dollar sign', () => {
    expect(parseCurrencyInput('$50.00')).toBe(50);
  });

  it('should remove commas', () => {
    expect(parseCurrencyInput('1,234.56')).toBe(1234.56);
  });

  it('should remove spaces', () => {
    expect(parseCurrencyInput('$ 50 .00')).toBe(50);
  });

  it('should return 0 for invalid input', () => {
    expect(parseCurrencyInput('abc')).toBe(0);
  });

  it('should return 0 for empty string', () => {
    expect(parseCurrencyInput('')).toBe(0);
  });

  it('should round to 2 decimal places', () => {
    expect(parseCurrencyInput('19.999')).toBe(20);
  });
});

describe('groupExpensesByCategory', () => {
  const expenses = [
    { category: 'supplies' as ExpenseCategory, amount: 50 },
    { category: 'gas' as ExpenseCategory, amount: 30 },
    { category: 'supplies' as ExpenseCategory, amount: 25 },
    { category: 'storage' as ExpenseCategory, amount: 100 },
  ];

  it('should group expenses by category', () => {
    const result = groupExpensesByCategory(expenses);

    expect(result.supplies).toHaveLength(2);
    expect(result.gas).toHaveLength(1);
    expect(result.storage).toHaveLength(1);
    expect(result.fees).toHaveLength(0);
  });

  it('should return empty arrays for unused categories', () => {
    const result = groupExpensesByCategory(expenses);

    expect(result.mileage).toHaveLength(0);
    expect(result.shipping).toHaveLength(0);
    expect(result.other).toHaveLength(0);
  });

  it('should handle empty array', () => {
    const result = groupExpensesByCategory([]);

    for (const category of EXPENSE_CATEGORIES) {
      expect(result[category]).toHaveLength(0);
    }
  });
});

describe('calculateTotalByCategory', () => {
  const expenses = [
    { category: 'supplies' as ExpenseCategory, amount: 50 },
    { category: 'gas' as ExpenseCategory, amount: 30 },
    { category: 'supplies' as ExpenseCategory, amount: 25 },
    { category: 'storage' as ExpenseCategory, amount: 100 },
  ];

  it('should calculate totals by category', () => {
    const result = calculateTotalByCategory(expenses);

    expect(result.supplies).toBe(75);
    expect(result.gas).toBe(30);
    expect(result.storage).toBe(100);
  });

  it('should return 0 for unused categories', () => {
    const result = calculateTotalByCategory(expenses);

    expect(result.mileage).toBe(0);
    expect(result.fees).toBe(0);
    expect(result.shipping).toBe(0);
    expect(result.other).toBe(0);
  });

  it('should handle empty array', () => {
    const result = calculateTotalByCategory([]);

    for (const category of EXPENSE_CATEGORIES) {
      expect(result[category]).toBe(0);
    }
  });
});

describe('calculateTotalExpenses', () => {
  it('should sum all expense amounts', () => {
    const expenses = [
      { amount: 50 },
      { amount: 30 },
      { amount: 25 },
    ];
    expect(calculateTotalExpenses(expenses)).toBe(105);
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotalExpenses([])).toBe(0);
  });

  it('should handle single expense', () => {
    expect(calculateTotalExpenses([{ amount: 99.99 }])).toBe(99.99);
  });
});

describe('filterExpensesByDateRange', () => {
  const expenses = [
    { expense_date: '2024-01-01' },
    { expense_date: '2024-01-15' },
    { expense_date: '2024-02-01' },
    { expense_date: '2024-03-01' },
  ];

  it('should filter expenses within date range', () => {
    const result = filterExpensesByDateRange(expenses, '2024-01-01', '2024-01-31');
    expect(result).toHaveLength(2);
  });

  it('should include boundary dates', () => {
    const result = filterExpensesByDateRange(expenses, '2024-01-01', '2024-01-01');
    expect(result).toHaveLength(1);
  });

  it('should return empty array if no expenses in range', () => {
    const result = filterExpensesByDateRange(expenses, '2024-04-01', '2024-04-30');
    expect(result).toHaveLength(0);
  });

  it('should handle empty expenses array', () => {
    const result = filterExpensesByDateRange([], '2024-01-01', '2024-12-31');
    expect(result).toHaveLength(0);
  });
});

describe('filterExpensesByCategory', () => {
  const expenses = [
    { category: 'supplies' as ExpenseCategory },
    { category: 'gas' as ExpenseCategory },
    { category: 'supplies' as ExpenseCategory },
  ];

  it('should filter expenses by category', () => {
    const result = filterExpensesByCategory(expenses, 'supplies');
    expect(result).toHaveLength(2);
  });

  it('should return empty array for unmatched category', () => {
    const result = filterExpensesByCategory(expenses, 'storage');
    expect(result).toHaveLength(0);
  });
});

describe('getUniquePalletIds', () => {
  it('should return unique pallet IDs', () => {
    const expenses = [
      { pallet_id: 'pallet-1' },
      { pallet_id: 'pallet-2' },
      { pallet_id: 'pallet-1' },
      { pallet_id: null },
    ];
    const result = getUniquePalletIds(expenses);
    expect(result).toHaveLength(2);
    expect(result).toContain('pallet-1');
    expect(result).toContain('pallet-2');
  });

  it('should exclude null pallet IDs', () => {
    const expenses = [
      { pallet_id: null },
      { pallet_id: null },
    ];
    const result = getUniquePalletIds(expenses);
    expect(result).toHaveLength(0);
  });

  it('should handle empty array', () => {
    const result = getUniquePalletIds([]);
    expect(result).toHaveLength(0);
  });
});

describe('isLinkedToPallet', () => {
  it('should return true when pallet_id is set', () => {
    expect(isLinkedToPallet({ pallet_id: 'pallet-1' })).toBe(true);
  });

  it('should return false when pallet_id is null', () => {
    expect(isLinkedToPallet({ pallet_id: null })).toBe(false);
  });
});

describe('sortExpensesByDate', () => {
  const expenses = [
    { expense_date: '2024-02-01' },
    { expense_date: '2024-01-01' },
    { expense_date: '2024-03-01' },
  ];

  it('should sort by date descending by default', () => {
    const result = sortExpensesByDate(expenses);
    expect(result[0].expense_date).toBe('2024-03-01');
    expect(result[1].expense_date).toBe('2024-02-01');
    expect(result[2].expense_date).toBe('2024-01-01');
  });

  it('should sort by date ascending when specified', () => {
    const result = sortExpensesByDate(expenses, true);
    expect(result[0].expense_date).toBe('2024-01-01');
    expect(result[1].expense_date).toBe('2024-02-01');
    expect(result[2].expense_date).toBe('2024-03-01');
  });

  it('should not mutate original array', () => {
    const original = [...expenses];
    sortExpensesByDate(expenses);
    expect(expenses).toEqual(original);
  });
});

describe('sortExpensesByAmount', () => {
  const expenses = [
    { amount: 50 },
    { amount: 100 },
    { amount: 25 },
  ];

  it('should sort by amount descending by default', () => {
    const result = sortExpensesByAmount(expenses);
    expect(result[0].amount).toBe(100);
    expect(result[1].amount).toBe(50);
    expect(result[2].amount).toBe(25);
  });

  it('should sort by amount ascending when specified', () => {
    const result = sortExpensesByAmount(expenses, true);
    expect(result[0].amount).toBe(25);
    expect(result[1].amount).toBe(50);
    expect(result[2].amount).toBe(100);
  });

  it('should not mutate original array', () => {
    const original = [...expenses];
    sortExpensesByAmount(expenses);
    expect(expenses).toEqual(original);
  });
});

describe('EXPENSE_CATEGORIES constant', () => {
  it('should contain all expected categories', () => {
    expect(EXPENSE_CATEGORIES).toContain('supplies');
    expect(EXPENSE_CATEGORIES).toContain('gas');
    expect(EXPENSE_CATEGORIES).toContain('mileage');
    expect(EXPENSE_CATEGORIES).toContain('storage');
    expect(EXPENSE_CATEGORIES).toContain('fees');
    expect(EXPENSE_CATEGORIES).toContain('shipping');
    expect(EXPENSE_CATEGORIES).toContain('other');
  });

  it('should have 7 categories', () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(7);
  });
});

describe('EXPENSE_CATEGORY_LABELS constant', () => {
  it('should have label for each category', () => {
    for (const category of EXPENSE_CATEGORIES) {
      expect(EXPENSE_CATEGORY_LABELS[category]).toBeDefined();
      expect(typeof EXPENSE_CATEGORY_LABELS[category]).toBe('string');
    }
  });
});

describe('EXPENSE_CATEGORY_COLORS constant', () => {
  it('should have color for each category', () => {
    for (const category of EXPENSE_CATEGORIES) {
      expect(EXPENSE_CATEGORY_COLORS[category]).toBeDefined();
      expect(EXPENSE_CATEGORY_COLORS[category]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
