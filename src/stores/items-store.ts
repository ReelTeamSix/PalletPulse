// Items Store - Zustand store for item management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { Item, ItemCondition, ItemStatus, SourceType } from '@/src/types/database';

export interface ItemInsert {
  pallet_id?: string | null;
  name: string;
  description?: string | null;
  quantity?: number;
  condition?: ItemCondition;
  retail_price?: number | null;
  listing_price?: number | null;
  purchase_cost?: number | null;
  storage_location?: string | null;
  status?: ItemStatus;
  barcode?: string | null;
  source_type?: SourceType;
  source_name?: string | null;
  notes?: string | null;
}

export interface ItemUpdate {
  name?: string;
  description?: string | null;
  quantity?: number;
  condition?: ItemCondition;
  retail_price?: number | null;
  listing_price?: number | null;
  sale_price?: number | null;
  purchase_cost?: number | null;
  allocated_cost?: number | null;
  storage_location?: string | null;
  status?: ItemStatus;
  listing_date?: string | null;
  sale_date?: string | null;
  sales_channel?: string | null;
  barcode?: string | null;
  source_type?: SourceType;
  source_name?: string | null;
  notes?: string | null;
}

export interface ItemsState {
  items: Item[];
  isLoading: boolean;
  error: string | null;
  selectedItemId: string | null;
  fetchItems: () => Promise<void>;
  fetchItemsByPallet: (palletId: string) => Promise<Item[]>;
  getItemById: (id: string) => Item | undefined;
  getItemsByPallet: (palletId: string) => Item[];
  addItem: (item: ItemInsert) => Promise<{ success: boolean; data?: Item; error?: string }>;
  updateItem: (id: string, updates: ItemUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  markAsSold: (id: string, salePrice: number, saleDate?: string, salesChannel?: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedItem: (id: string | null) => void;
  clearError: () => void;
  clearItems: () => void;
}

export const useItemsStore = create<ItemsState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,
      selectedItemId: null,

      fetchItems: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          set({ items: (data as Item[]) || [], isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch items';
          set({ error: message, isLoading: false });
        }
      },

      fetchItemsByPallet: async (palletId: string) => {
        try {
          const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('pallet_id', palletId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data as Item[]) || [];
        } catch (error) {
          return [];
        }
      },

      getItemById: (id: string) => get().items.find(i => i.id === id),
      getItemsByPallet: (palletId: string) => get().items.filter(i => i.pallet_id === palletId),

      addItem: async (itemData: ItemInsert) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          const { data, error } = await supabase
            .from('items')
            .insert({ ...itemData, user_id: user.id } as any)
            .select()
            .single();
          if (error) throw error;
          const item = data as Item;
          set(state => ({ items: [item, ...state.items], isLoading: false }));
          return { success: true, data: item };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add item';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      updateItem: async (id: string, updates: ItemUpdate) => {
        set({ isLoading: true, error: null });
        try {
          const currentItem = get().items.find(i => i.id === id);
          if (!currentItem) throw new Error('Item not found');
          const { data, error } = await supabase
            .from('items')
            .update({ ...updates, version: currentItem.version + 1 } as any)
            .eq('id', id)
            .eq('version', currentItem.version)
            .select()
            .single();
          if (error) throw error;
          set(state => ({ items: state.items.map(i => i.id === id ? (data as Item) : i), isLoading: false }));
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update item';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      deleteItem: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.from('items').delete().eq('id', id);
          if (error) throw error;
          set(state => ({
            items: state.items.filter(i => i.id !== id),
            selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
            isLoading: false,
          }));
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete item';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      markAsSold: async (id: string, salePrice: number, saleDate?: string, salesChannel?: string) => {
        return get().updateItem(id, {
          status: 'sold',
          sale_price: salePrice,
          sale_date: saleDate || new Date().toISOString().split('T')[0],
          sales_channel: salesChannel,
        });
      },

      setSelectedItem: (id: string | null) => set({ selectedItemId: id }),
      clearError: () => set({ error: null }),
      clearItems: () => set({ items: [], selectedItemId: null, error: null }),
    }),
    {
      name: 'items-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items, selectedItemId: state.selectedItemId }),
    }
  )
);
