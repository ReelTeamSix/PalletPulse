// Expenses Store Tests - Updated for Phase 8D Multi-Pallet Support
import { useExpensesStore, ExpenseWithPallets } from '../expenses-store';
import { supabase } from '@/src/lib/supabase';

// Mock Supabase
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

// Mock expense with multi-pallet support
const mockExpense: ExpenseWithPallets = {
  id: 'expense-1',
  user_id: 'user-123',
  pallet_id: null, // Legacy field
  amount: 25.50,
  category: 'supplies' as const,
  description: 'Packing tape and boxes',
  expense_date: '2024-01-15',
  receipt_photo_path: null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  pallet_ids: ['pallet-1'], // Phase 8D: Multi-pallet support
};

const mockExpense2: ExpenseWithPallets = {
  ...mockExpense,
  id: 'expense-2',
  pallet_id: null,
  amount: 50.00,
  category: 'storage' as const,
  description: 'Storage unit rent',
  pallet_ids: ['pallet-2'],
};

const mockExpense3: ExpenseWithPallets = {
  ...mockExpense,
  id: 'expense-3',
  pallet_id: null,
  amount: 10.00,
  category: 'equipment' as const,
  pallet_ids: ['pallet-1'],
};

// Multi-pallet expense (shared between 2 pallets)
const mockMultiPalletExpense: ExpenseWithPallets = {
  ...mockExpense,
  id: 'expense-4',
  pallet_id: null,
  amount: 60.00,
  category: 'storage' as const,
  description: 'Storage shared between pallets',
  pallet_ids: ['pallet-1', 'pallet-2'],
};

// Legacy expense with pallet_id but no pallet_ids
const mockLegacyExpense: ExpenseWithPallets = {
  ...mockExpense,
  id: 'expense-5',
  pallet_id: 'pallet-3',
  amount: 15.00,
  category: 'supplies' as const,
  description: 'Legacy expense',
  pallet_ids: [],
};

describe('ExpensesStore', () => {
  beforeEach(() => {
    useExpensesStore.setState({
      expenses: [],
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct initial state', () => {
      const state = useExpensesStore.getState();
      expect(state.expenses).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe('fetchExpenses', () => {
    it('should fetch expenses and expense_pallets successfully', async () => {
      // Mock expenses query
      const mockExpensesSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [{ ...mockExpense, pallet_ids: undefined }],
          error: null,
        }),
      });

      // Mock expense_pallets query
      const mockLinksSelect = jest.fn().mockResolvedValue({
        data: [{ expense_id: 'expense-1', pallet_id: 'pallet-1' }],
        error: null,
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockExpensesSelect })
        .mockReturnValueOnce({ select: mockLinksSelect });

      await useExpensesStore.getState().fetchExpenses();

      const state = useExpensesStore.getState();
      expect(state.expenses).toHaveLength(1);
      expect(state.expenses[0].amount).toBe(25.50);
      expect(state.expenses[0].pallet_ids).toEqual(['pallet-1']);
      expect(state.isLoading).toBe(false);
    });

    it('should include legacy pallet_id in pallet_ids if not in junction table', async () => {
      // Mock expenses query with legacy pallet_id
      const mockExpensesSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [{ ...mockLegacyExpense, pallet_ids: undefined }],
          error: null,
        }),
      });

      // Mock empty expense_pallets (no junction records)
      const mockLinksSelect = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockExpensesSelect })
        .mockReturnValueOnce({ select: mockLinksSelect });

      await useExpensesStore.getState().fetchExpenses();

      const state = useExpensesStore.getState();
      expect(state.expenses[0].pallet_ids).toEqual(['pallet-3']);
    });

    it('should handle fetch error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await useExpensesStore.getState().fetchExpenses();

      const state = useExpensesStore.getState();
      expect(state.expenses).toHaveLength(0);
      expect(state.error).toBe('Network error');
    });
  });

  describe('addExpense', () => {
    it('should add expense with pallet_ids successfully', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...mockExpense, pallet_ids: undefined },
            error: null,
          }),
        }),
      });

      // Mock junction table insert
      const mockJunctionInsert = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ insert: mockJunctionInsert });

      const result = await useExpensesStore.getState().addExpense({
        amount: 25.50,
        category: 'supplies',
        pallet_ids: ['pallet-1'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.pallet_ids).toEqual(['pallet-1']);
      expect(useExpensesStore.getState().expenses).toHaveLength(1);
    });

    it('should add expense with multiple pallets', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...mockMultiPalletExpense, pallet_ids: undefined },
            error: null,
          }),
        }),
      });

      const mockJunctionInsert = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ insert: mockJunctionInsert });

      const result = await useExpensesStore.getState().addExpense({
        amount: 60.00,
        category: 'storage',
        pallet_ids: ['pallet-1', 'pallet-2'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.pallet_ids).toEqual(['pallet-1', 'pallet-2']);
    });

    it('should fail when not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await useExpensesStore.getState().addExpense({
        amount: 25.50,
        category: 'supplies',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });
  });

  describe('updateExpense', () => {
    beforeEach(() => {
      useExpensesStore.setState({ expenses: [mockExpense] });
    });

    it('should update expense and pallet links', async () => {
      const updatedExpense = { ...mockExpense, amount: 30.00 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...updatedExpense, pallet_ids: undefined },
              error: null,
            }),
          }),
        }),
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const mockJunctionInsert = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ update: mockUpdate })
        .mockReturnValueOnce({ delete: mockDelete })
        .mockReturnValueOnce({ insert: mockJunctionInsert });

      const result = await useExpensesStore.getState().updateExpense('expense-1', {
        amount: 30.00,
        pallet_ids: ['pallet-2', 'pallet-3'],
      });

      expect(result.success).toBe(true);
      const updated = useExpensesStore.getState().expenses[0];
      expect(updated.amount).toBe(30.00);
      expect(updated.pallet_ids).toEqual(['pallet-2', 'pallet-3']);
    });
  });

  describe('deleteExpense', () => {
    beforeEach(() => {
      useExpensesStore.setState({ expenses: [mockExpense] });
    });

    it('should delete expense successfully (junction records cascade)', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

      const result = await useExpensesStore.getState().deleteExpense('expense-1');

      expect(result.success).toBe(true);
      expect(useExpensesStore.getState().expenses).toHaveLength(0);
    });
  });

  describe('expense totals with multi-pallet', () => {
    beforeEach(() => {
      useExpensesStore.setState({
        expenses: [mockExpense, mockExpense2, mockExpense3, mockMultiPalletExpense],
      });
    });

    it('getTotalExpenses should sum all expenses', () => {
      const total = useExpensesStore.getState().getTotalExpenses();
      expect(total).toBe(145.50); // 25.50 + 50.00 + 10.00 + 60.00
    });

    it('getTotalExpensesByPallet should split multi-pallet expenses', () => {
      // pallet-1: 25.50 + 10.00 + (60.00 / 2) = 65.50
      const totalPallet1 = useExpensesStore.getState().getTotalExpensesByPallet('pallet-1');
      expect(totalPallet1).toBe(65.50);
    });

    it('getTotalExpensesByPallet should include split for second pallet', () => {
      // pallet-2: 50.00 + (60.00 / 2) = 80.00
      const totalPallet2 = useExpensesStore.getState().getTotalExpensesByPallet('pallet-2');
      expect(totalPallet2).toBe(80.00);
    });

    it('getTotalExpensesByPallet should return 0 for pallet with no expenses', () => {
      const total = useExpensesStore.getState().getTotalExpensesByPallet('non-existent');
      expect(total).toBe(0);
    });
  });

  describe('getSplitAmountByPallet', () => {
    beforeEach(() => {
      useExpensesStore.setState({
        expenses: [mockExpense, mockMultiPalletExpense],
      });
    });

    it('should return full amount for single-pallet expense', () => {
      const amount = useExpensesStore.getState().getSplitAmountByPallet('expense-1', 'pallet-1');
      expect(amount).toBe(25.50);
    });

    it('should return split amount for multi-pallet expense', () => {
      const amount = useExpensesStore.getState().getSplitAmountByPallet('expense-4', 'pallet-1');
      expect(amount).toBe(30.00); // 60.00 / 2
    });

    it('should return 0 for expense not linked to pallet', () => {
      const amount = useExpensesStore.getState().getSplitAmountByPallet('expense-1', 'pallet-2');
      expect(amount).toBe(0);
    });

    it('should return 0 for non-existent expense', () => {
      const amount = useExpensesStore.getState().getSplitAmountByPallet('non-existent', 'pallet-1');
      expect(amount).toBe(0);
    });
  });

  describe('getExpensesByPallet with multi-pallet', () => {
    beforeEach(() => {
      useExpensesStore.setState({
        expenses: [mockExpense, mockExpense2, mockMultiPalletExpense, mockLegacyExpense],
      });
    });

    it('should return expenses linked via pallet_ids', () => {
      const expenses = useExpensesStore.getState().getExpensesByPallet('pallet-1');
      expect(expenses).toHaveLength(2);
      expect(expenses.map(e => e.id)).toContain('expense-1');
      expect(expenses.map(e => e.id)).toContain('expense-4');
    });

    it('should return expenses linked via legacy pallet_id', () => {
      const expenses = useExpensesStore.getState().getExpensesByPallet('pallet-3');
      expect(expenses).toHaveLength(1);
      expect(expenses[0].id).toBe('expense-5');
    });

    it('should return multi-pallet expense for both linked pallets', () => {
      const expensesPallet1 = useExpensesStore.getState().getExpensesByPallet('pallet-1');
      const expensesPallet2 = useExpensesStore.getState().getExpensesByPallet('pallet-2');

      expect(expensesPallet1.map(e => e.id)).toContain('expense-4');
      expect(expensesPallet2.map(e => e.id)).toContain('expense-4');
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      useExpensesStore.setState({ expenses: [mockExpense, mockExpense2, mockExpense3] });
    });

    it('getExpenseById should return expense when found', () => {
      const expense = useExpensesStore.getState().getExpenseById('expense-1');
      expect(expense?.id).toBe('expense-1');
    });

    it('getExpenseById should return undefined when not found', () => {
      const expense = useExpensesStore.getState().getExpenseById('non-existent');
      expect(expense).toBeUndefined();
    });

    it('clearError should reset error', () => {
      useExpensesStore.setState({ error: 'Some error' });
      useExpensesStore.getState().clearError();
      expect(useExpensesStore.getState().error).toBe(null);
    });

    it('clearExpenses should reset all state', () => {
      useExpensesStore.setState({ error: 'Error' });
      useExpensesStore.getState().clearExpenses();

      const state = useExpensesStore.getState();
      expect(state.expenses).toEqual([]);
      expect(state.error).toBe(null);
    });
  });

  describe('backward compatibility', () => {
    it('should handle expense with only legacy pallet_id', () => {
      useExpensesStore.setState({
        expenses: [mockLegacyExpense],
      });

      const expenses = useExpensesStore.getState().getExpensesByPallet('pallet-3');
      expect(expenses).toHaveLength(1);

      const total = useExpensesStore.getState().getTotalExpensesByPallet('pallet-3');
      expect(total).toBe(15.00);
    });

    it('should handle expense with empty pallet_ids array', () => {
      const expenseNoPallets: ExpenseWithPallets = {
        ...mockExpense,
        id: 'expense-6',
        pallet_id: null,
        pallet_ids: [],
      };

      useExpensesStore.setState({ expenses: [expenseNoPallets] });

      const expenses = useExpensesStore.getState().getExpensesByPallet('pallet-1');
      expect(expenses).toHaveLength(0);
    });
  });
});
