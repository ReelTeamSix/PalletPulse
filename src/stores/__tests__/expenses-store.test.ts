// Expenses Store Tests
import { useExpensesStore } from '../expenses-store';
import { supabase } from '@/src/lib/supabase';

// Mock Supabase
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const mockExpense = {
  id: 'expense-1',
  user_id: 'user-123',
  pallet_id: 'pallet-1',
  amount: 25.50,
  category: 'supplies' as const,
  description: 'Packing tape and boxes',
  expense_date: '2024-01-15',
  receipt_photo_path: null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

const mockExpense2 = {
  ...mockExpense,
  id: 'expense-2',
  pallet_id: 'pallet-2',
  amount: 50.00,
  category: 'gas' as const,
  description: 'Fuel for pickup',
};

const mockExpense3 = {
  ...mockExpense,
  id: 'expense-3',
  pallet_id: 'pallet-1',
  amount: 10.00,
  category: 'fees' as const,
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
    it('should fetch expenses successfully', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [mockExpense], error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await useExpensesStore.getState().fetchExpenses();

      const state = useExpensesStore.getState();
      expect(state.expenses).toHaveLength(1);
      expect(state.expenses[0].amount).toBe(25.50);
      expect(state.isLoading).toBe(false);
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

  describe('fetchExpensesByPallet', () => {
    it('should fetch expenses for specific pallet', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockExpense], error: null }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const expenses = await useExpensesStore.getState().fetchExpensesByPallet('pallet-1');

      expect(expenses).toHaveLength(1);
      expect(expenses[0].pallet_id).toBe('pallet-1');
    });

    it('should return empty array on error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: new Error('Error') }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const expenses = await useExpensesStore.getState().fetchExpensesByPallet('pallet-1');

      expect(expenses).toEqual([]);
    });
  });

  describe('addExpense', () => {
    it('should add expense successfully', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockExpense, error: null }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

      const result = await useExpensesStore.getState().addExpense({
        amount: 25.50,
        category: 'supplies',
        pallet_id: 'pallet-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExpense);
      expect(useExpensesStore.getState().expenses).toHaveLength(1);
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

    it('should update expense successfully', async () => {
      const updatedExpense = { ...mockExpense, amount: 30.00, description: 'Updated' };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: updatedExpense, error: null }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useExpensesStore.getState().updateExpense('expense-1', {
        amount: 30.00,
        description: 'Updated',
      });

      expect(result.success).toBe(true);
      expect(useExpensesStore.getState().expenses[0].amount).toBe(30.00);
    });
  });

  describe('deleteExpense', () => {
    beforeEach(() => {
      useExpensesStore.setState({ expenses: [mockExpense] });
    });

    it('should delete expense successfully', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

      const result = await useExpensesStore.getState().deleteExpense('expense-1');

      expect(result.success).toBe(true);
      expect(useExpensesStore.getState().expenses).toHaveLength(0);
    });
  });

  describe('expense totals', () => {
    beforeEach(() => {
      useExpensesStore.setState({ expenses: [mockExpense, mockExpense2, mockExpense3] });
    });

    it('getTotalExpenses should sum all expenses', () => {
      const total = useExpensesStore.getState().getTotalExpenses();
      expect(total).toBe(85.50); // 25.50 + 50.00 + 10.00
    });

    it('getTotalExpensesByPallet should sum pallet expenses', () => {
      const total = useExpensesStore.getState().getTotalExpensesByPallet('pallet-1');
      expect(total).toBe(35.50); // 25.50 + 10.00
    });

    it('getTotalExpensesByPallet should return 0 for pallet with no expenses', () => {
      const total = useExpensesStore.getState().getTotalExpensesByPallet('non-existent');
      expect(total).toBe(0);
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      useExpensesStore.setState({ expenses: [mockExpense, mockExpense2, mockExpense3] });
    });

    it('getExpenseById should return expense when found', () => {
      const expense = useExpensesStore.getState().getExpenseById('expense-1');
      expect(expense).toEqual(mockExpense);
    });

    it('getExpenseById should return undefined when not found', () => {
      const expense = useExpensesStore.getState().getExpenseById('non-existent');
      expect(expense).toBeUndefined();
    });

    it('getExpensesByPallet should return expenses for pallet', () => {
      const expenses = useExpensesStore.getState().getExpensesByPallet('pallet-1');
      expect(expenses).toHaveLength(2);
      expect(expenses.every(e => e.pallet_id === 'pallet-1')).toBe(true);
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
});
