// Expenses Store - Zustand store for expense management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { Expense, ExpenseCategory } from '@/src/types/database';

export interface ExpenseInsert {
  pallet_id?: string | null;
  amount: number;
  category: ExpenseCategory;
  description?: string | null;
  expense_date?: string;
  receipt_photo_path?: string | null;
}

export interface ExpenseUpdate {
  pallet_id?: string | null;
  amount?: number;
  category?: ExpenseCategory;
  description?: string | null;
  expense_date?: string;
  receipt_photo_path?: string | null;
}

export interface ExpensesState {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  fetchExpenses: () => Promise<void>;
  fetchExpensesByPallet: (palletId: string) => Promise<Expense[]>;
  getExpenseById: (id: string) => Expense | undefined;
  getExpensesByPallet: (palletId: string) => Expense[];
  addExpense: (expense: ExpenseInsert) => Promise<{ success: boolean; data?: Expense; error?: string }>;
  updateExpense: (id: string, updates: ExpenseUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteExpense: (id: string) => Promise<{ success: boolean; error?: string }>;
  getTotalExpenses: () => number;
  getTotalExpensesByPallet: (palletId: string) => number;
  clearError: () => void;
  clearExpenses: () => void;
}

export const useExpensesStore = create<ExpensesState>()(
  persist(
    (set, get) => ({
      expenses: [],
      isLoading: false,
      error: null,

      fetchExpenses: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });
          if (error) throw error;
          set({ expenses: (data as Expense[]) || [], isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch expenses';
          set({ error: message, isLoading: false });
        }
      },

      fetchExpensesByPallet: async (palletId: string) => {
        try {
          const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('pallet_id', palletId)
            .order('expense_date', { ascending: false });
          if (error) throw error;
          return (data as Expense[]) || [];
        } catch (error) {
          return [];
        }
      },

      getExpenseById: (id: string) => get().expenses.find(e => e.id === id),
      getExpensesByPallet: (palletId: string) => get().expenses.filter(e => e.pallet_id === palletId),

      addExpense: async (expenseData: ExpenseInsert) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          const { data, error } = await supabase
            .from('expenses')
            .insert({ ...expenseData, user_id: user.id } as any)
            .select()
            .single();
          if (error) throw error;
          const expense = data as Expense;
          set(state => ({ expenses: [expense, ...state.expenses], isLoading: false }));
          return { success: true, data: expense };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add expense';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      updateExpense: async (id: string, updates: ExpenseUpdate) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('expenses')
            .update(updates as any)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          set(state => ({ expenses: state.expenses.map(e => e.id === id ? (data as Expense) : e), isLoading: false }));
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update expense';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      deleteExpense: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.from('expenses').delete().eq('id', id);
          if (error) throw error;
          set(state => ({ expenses: state.expenses.filter(e => e.id !== id), isLoading: false }));
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete expense';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      getTotalExpenses: () => get().expenses.reduce((sum, e) => sum + e.amount, 0),
      getTotalExpensesByPallet: (palletId: string) => 
        get().expenses.filter(e => e.pallet_id === palletId).reduce((sum, e) => sum + e.amount, 0),

      clearError: () => set({ error: null }),
      clearExpenses: () => set({ expenses: [], error: null }),
    }),
    {
      name: 'expenses-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ expenses: state.expenses }),
    }
  )
);
