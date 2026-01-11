// Pallets Store - Zustand store for pallet management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { Pallet, PalletStatus, SourceType } from '@/src/types/database';

export interface PalletInsert {
  name: string;
  supplier?: string | null;
  source_type?: SourceType;
  source_name?: string | null;
  purchase_cost: number;
  sales_tax?: number | null;
  purchase_date?: string;
  status?: PalletStatus;
  notes?: string | null;
}

export interface PalletUpdate {
  name?: string;
  supplier?: string | null;
  source_type?: SourceType;
  source_name?: string | null;
  purchase_cost?: number;
  sales_tax?: number | null;
  purchase_date?: string;
  status?: PalletStatus;
  notes?: string | null;
}

export interface PalletsState {
  pallets: Pallet[];
  isLoading: boolean;
  error: string | null;
  selectedPalletId: string | null;
  fetchPallets: () => Promise<void>;
  getPalletById: (id: string) => Pallet | undefined;
  addPallet: (pallet: PalletInsert) => Promise<{ success: boolean; data?: Pallet; error?: string }>;
  updatePallet: (id: string, updates: PalletUpdate) => Promise<{ success: boolean; error?: string }>;
  deletePallet: (id: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedPallet: (id: string | null) => void;
  clearError: () => void;
  clearPallets: () => void;
}

export const usePalletsStore = create<PalletsState>()(
  persist(
    (set, get) => ({
      pallets: [],
      isLoading: false,
      error: null,
      selectedPalletId: null,

      fetchPallets: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('pallets')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          set({ pallets: (data as Pallet[]) || [], isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch pallets';
          set({ error: message, isLoading: false });
        }
      },

      getPalletById: (id: string) => get().pallets.find(p => p.id === id),

      addPallet: async (palletData: PalletInsert) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          const { data, error } = await supabase
            .from('pallets')
            .insert({ ...palletData, user_id: user.id } as any)
            .select()
            .single();
          if (error) throw error;
          const pallet = data as Pallet;
          set(state => ({ pallets: [pallet, ...state.pallets], isLoading: false }));
          return { success: true, data: pallet };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add pallet';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      updatePallet: async (id: string, updates: PalletUpdate) => {
        set({ isLoading: true, error: null });
        try {
          const currentPallet = get().pallets.find(p => p.id === id);
          if (!currentPallet) throw new Error('Pallet not found');
          const { data, error } = await supabase
            .from('pallets')
            .update({ ...updates, version: currentPallet.version + 1 } as any)
            .eq('id', id)
            .eq('version', currentPallet.version)
            .select()
            .single();
          if (error) throw error;
          set(state => ({ pallets: state.pallets.map(p => p.id === id ? (data as Pallet) : p), isLoading: false }));
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update pallet';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      deletePallet: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.from('pallets').delete().eq('id', id);
          if (error) throw error;
          set(state => ({
            pallets: state.pallets.filter(p => p.id !== id),
            selectedPalletId: state.selectedPalletId === id ? null : state.selectedPalletId,
            isLoading: false,
          }));
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete pallet';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      setSelectedPallet: (id: string | null) => set({ selectedPalletId: id }),
      clearError: () => set({ error: null }),
      clearPallets: () => set({ pallets: [], selectedPalletId: null, error: null }),
    }),
    {
      name: 'pallets-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ pallets: state.pallets, selectedPalletId: state.selectedPalletId }),
    }
  )
);
