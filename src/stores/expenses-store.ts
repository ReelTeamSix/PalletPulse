// Expenses Store - Zustand store for expense management
// Updated for Phase 8D: Multi-pallet linking via expense_pallets junction table
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { Expense, ExpenseCategory, ExpensePallet } from '@/src/types/database';

// Extended expense type with pallet_ids from junction table
export interface ExpenseWithPallets extends Expense {
  pallet_ids: string[];
}

export interface ExpenseInsert {
  pallet_id?: string | null; // Legacy single pallet (backward compat)
  pallet_ids?: string[]; // Phase 8D: Multi-pallet support
  amount: number;
  category: ExpenseCategory;
  description?: string | null;
  expense_date?: string;
  receipt_photo_path?: string | null;
}

export interface ExpenseUpdate {
  pallet_id?: string | null;
  pallet_ids?: string[]; // Phase 8D: Multi-pallet support
  amount?: number;
  category?: ExpenseCategory;
  description?: string | null;
  expense_date?: string;
  receipt_photo_path?: string | null;
}

export interface ExpensesState {
  expenses: ExpenseWithPallets[];
  isLoading: boolean;
  error: string | null;
  fetchExpenses: () => Promise<void>;
  fetchExpensesByPallet: (palletId: string) => Promise<ExpenseWithPallets[]>;
  getExpenseById: (id: string) => ExpenseWithPallets | undefined;
  getExpensesByPallet: (palletId: string) => ExpenseWithPallets[];
  addExpense: (expense: ExpenseInsert) => Promise<{ success: boolean; data?: ExpenseWithPallets; error?: string }>;
  updateExpense: (id: string, updates: ExpenseUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteExpense: (id: string) => Promise<{ success: boolean; error?: string }>;
  getTotalExpenses: () => number;
  getTotalExpensesByPallet: (palletId: string) => number;
  // Phase 8D: Get split amount per pallet
  getSplitAmountByPallet: (expenseId: string, palletId: string) => number;
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
          // Fetch expenses
          const { data: expensesData, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });
          if (expensesError) throw expensesError;

          // Fetch expense-pallet links
          const { data: linksData, error: linksError } = await supabase
            .from('expense_pallets')
            .select('*');
          if (linksError) throw linksError;

          // Map pallet_ids to each expense
          const expenses: ExpenseWithPallets[] = (expensesData || []).map((expense: Expense) => {
            const links = (linksData || []).filter((l: ExpensePallet) => l.expense_id === expense.id);
            const palletIdsFromJunction = links.map((l: ExpensePallet) => l.pallet_id);
            // Include legacy pallet_id if not in junction table
            const allPalletIds = expense.pallet_id && !palletIdsFromJunction.includes(expense.pallet_id)
              ? [expense.pallet_id, ...palletIdsFromJunction]
              : palletIdsFromJunction;
            return { ...expense, pallet_ids: allPalletIds };
          });

          set({ expenses, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch expenses';
          set({ error: message, isLoading: false });
        }
      },

      fetchExpensesByPallet: async (palletId: string) => {
        try {
          // Query via junction table first
          const { data: linksData, error: linksError } = await supabase
            .from('expense_pallets')
            .select('expense_id')
            .eq('pallet_id', palletId);
          if (linksError) throw linksError;

          const expenseIdsFromJunction = (linksData || []).map((l: { expense_id: string }) => l.expense_id);

          // Also query legacy pallet_id field
          const { data: legacyData, error: legacyError } = await supabase
            .from('expenses')
            .select('id')
            .eq('pallet_id', palletId);
          if (legacyError) throw legacyError;

          const legacyIds = (legacyData || []).map((e: { id: string }) => e.id);

          // Combine unique expense IDs
          const allExpenseIds = [...new Set([...expenseIdsFromJunction, ...legacyIds])];

          if (allExpenseIds.length === 0) return [];

          // Fetch the actual expenses
          const { data: expensesData, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .in('id', allExpenseIds)
            .order('expense_date', { ascending: false });
          if (expensesError) throw expensesError;

          // Add pallet_ids from local store (if available) or infer from query
          const localExpenses = get().expenses;
          return (expensesData || []).map((expense: Expense) => {
            const localExpense = localExpenses.find(e => e.id === expense.id);
            return localExpense || { ...expense, pallet_ids: [palletId] };
          });
        } catch {
          return [];
        }
      },

      getExpenseById: (id: string) => get().expenses.find(e => e.id === id),

      getExpensesByPallet: (palletId: string) => {
        // Check both junction-based pallet_ids and legacy pallet_id
        return get().expenses.filter(e =>
          e.pallet_ids.includes(palletId) || e.pallet_id === palletId
        );
      },

      addExpense: async (expenseData: ExpenseInsert) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Extract pallet_ids for junction table
          const { pallet_ids, ...expenseFields } = expenseData;

          // Insert expense (without pallet_ids)
          const { data, error } = await supabase
            .from('expenses')
            .insert({ ...expenseFields, user_id: user.id } as any)
            .select()
            .single();
          if (error) throw error;

          const expense = data as Expense;
          const palletIdsArray = pallet_ids || [];

          // Insert junction table records if pallet_ids provided
          if (palletIdsArray.length > 0) {
            const junctionRecords = palletIdsArray.map(pallet_id => ({
              expense_id: expense.id,
              pallet_id,
            }));

            const { error: junctionError } = await supabase
              .from('expense_pallets')
              .insert(junctionRecords);

            if (junctionError) {
              // Log but don't fail the entire operation
              // eslint-disable-next-line no-console -- intentional error logging
              console.error('Failed to insert expense_pallets:', junctionError);
            }
          }

          const expenseWithPallets: ExpenseWithPallets = {
            ...expense,
            pallet_ids: palletIdsArray,
          };

          set(state => ({
            expenses: [expenseWithPallets, ...state.expenses],
            isLoading: false
          }));
          return { success: true, data: expenseWithPallets };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add expense';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      updateExpense: async (id: string, updates: ExpenseUpdate) => {
        set({ isLoading: true, error: null });
        try {
          // Extract pallet_ids for junction table
          const { pallet_ids, ...expenseUpdates } = updates;

          // Update expense
          const { data, error } = await supabase
            .from('expenses')
            .update(expenseUpdates as any)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;

          // Update junction table if pallet_ids provided
          if (pallet_ids !== undefined) {
            // Delete existing links
            const { error: deleteError } = await supabase
              .from('expense_pallets')
              .delete()
              .eq('expense_id', id);

            if (deleteError) {
              // eslint-disable-next-line no-console -- intentional error logging
              console.error('Failed to delete expense_pallets:', deleteError);
            }

            // Insert new links
            if (pallet_ids.length > 0) {
              const junctionRecords = pallet_ids.map(pallet_id => ({
                expense_id: id,
                pallet_id,
              }));

              const { error: insertError } = await supabase
                .from('expense_pallets')
                .insert(junctionRecords);

              if (insertError) {
                // eslint-disable-next-line no-console -- intentional error logging
                console.error('Failed to insert expense_pallets:', insertError);
              }
            }
          }

          const updatedExpense = data as Expense;
          const updatedPalletIds = pallet_ids !== undefined
            ? pallet_ids
            : get().expenses.find(e => e.id === id)?.pallet_ids || [];

          set(state => ({
            expenses: state.expenses.map(e =>
              e.id === id
                ? { ...updatedExpense, pallet_ids: updatedPalletIds }
                : e
            ),
            isLoading: false
          }));
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
          // Junction table records will be deleted via CASCADE
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

      getTotalExpensesByPallet: (palletId: string) => {
        // Sum expenses linked to this pallet (split if multi-pallet)
        return get().expenses
          .filter(e => e.pallet_ids.includes(palletId) || e.pallet_id === palletId)
          .reduce((sum, e) => {
            // If expense is linked to multiple pallets, split the amount
            const palletCount = e.pallet_ids.length || 1;
            return sum + (e.amount / palletCount);
          }, 0);
      },

      // Phase 8D: Get split amount for a specific expense/pallet
      getSplitAmountByPallet: (expenseId: string, palletId: string) => {
        const expense = get().expenses.find(e => e.id === expenseId);
        if (!expense) return 0;
        if (!expense.pallet_ids.includes(palletId) && expense.pallet_id !== palletId) return 0;
        const palletCount = expense.pallet_ids.length || 1;
        return expense.amount / palletCount;
      },

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
