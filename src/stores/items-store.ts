// Items Store - Zustand store for item management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { Item, ItemCondition, ItemStatus, SourceType, ItemPhoto, SalesPlatform } from '@/src/types/database';
import { uploadItemPhoto, deletePhoto, getPhotoUrl } from '@/src/lib/photo-utils';
import { PhotoItem } from '@/src/components/ui/PhotoPicker';
import { SubscriptionTier } from '@/src/constants/tier-limits';
import { checkPalletMilestoneNotification, createLimitWarningNotification } from '@/src/lib/notification-triggers';

// Error codes for tier limit enforcement
export const ITEM_ERROR_CODES = {
  TIER_LIMIT_REACHED: 'TIER_LIMIT_REACHED',
} as const;

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
  pallet_id?: string | null;
  // Phase 8: Per-item cost fields
  platform?: SalesPlatform | null;
  platform_fee?: number | null;
  shipping_cost?: number | null;
}

// Sale data for marking an item as sold
export interface SaleData {
  sale_price: number;
  sale_date?: string;
  sales_channel?: string;
  buyer_notes?: string;
  platform?: SalesPlatform;
  platform_fee?: number;
  shipping_cost?: number;
}

export interface AddItemResult {
  success: boolean;
  data?: Item;
  error?: string;
  errorCode?: typeof ITEM_ERROR_CODES[keyof typeof ITEM_ERROR_CODES];
  requiredTier?: SubscriptionTier;
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
  addItem: (item: ItemInsert) => Promise<AddItemResult>;
  updateItem: (id: string, updates: ItemUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  markAsSold: (id: string, saleData: SaleData) => Promise<{ success: boolean; error?: string }>;
  setSelectedItem: (id: string | null) => void;
  clearError: () => void;
  clearItems: () => void;
  // Photo management
  uploadItemPhotos: (itemId: string, photos: PhotoItem[]) => Promise<{ success: boolean; photos?: ItemPhoto[]; error?: string }>;
  fetchItemPhotos: (itemId: string) => Promise<ItemPhoto[]>;
  deleteItemPhoto: (photoId: string, storagePath: string) => Promise<{ success: boolean; error?: string }>;
  // Thumbnail support for lists
  fetchThumbnails: (itemIds: string[]) => Promise<Record<string, string>>;
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
        } catch {
          return [];
        }
      },

      getItemById: (id: string) => get().items.find(i => i.id === id),
      getItemsByPallet: (palletId: string) => get().items.filter(i => i.pallet_id === palletId),

      addItem: async (itemData: ItemInsert) => {
        // Lazy import to avoid circular dependency issues at module load time
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- circular dependency workaround
        const { useSubscriptionStore } = require('./subscription-store');
        const subscriptionStore = useSubscriptionStore.getState();

        // Count only ACTIVE items (not sold/archived)
        const activeItemCount = get().items.filter(i => i.status !== 'sold').length;

        // Check tier limits before allowing item creation
        if (!subscriptionStore.canPerform('activeItems', activeItemCount)) {
          const requiredTier = subscriptionStore.getRequiredTierForAction('activeItems', activeItemCount);
          return {
            success: false,
            error: 'You have reached your active item limit. Mark items as sold or upgrade to add more.',
            errorCode: ITEM_ERROR_CODES.TIER_LIMIT_REACHED,
            requiredTier: requiredTier || 'starter',
          };
        }

        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          let allocatedCost: number | null = null;

          // If linking to a pallet, calculate allocated cost
          if (itemData.pallet_id) {
            // Fetch the pallet to get its cost
            const { data: pallet, error: palletError } = await supabase
              .from('pallets')
              .select('purchase_cost, sales_tax')
              .eq('id', itemData.pallet_id)
              .single();

            if (!palletError && pallet) {
              // Count existing items in this pallet
              const { count } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true })
                .eq('pallet_id', itemData.pallet_id);

              const existingItemCount = count || 0;
              const totalPalletCost = pallet.purchase_cost + (pallet.sales_tax || 0);
              // New item will make it existingItemCount + 1 items
              allocatedCost = totalPalletCost / (existingItemCount + 1);

              // Update all existing items in the pallet with new allocated cost
              if (existingItemCount > 0) {
                await supabase
                  .from('items')
                  .update({ allocated_cost: allocatedCost })
                  .eq('pallet_id', itemData.pallet_id);

                // Update local state for existing items
                set(state => ({
                  items: state.items.map(i =>
                    i.pallet_id === itemData.pallet_id
                      ? { ...i, allocated_cost: allocatedCost }
                      : i
                  ),
                }));
              }
            }
          }

          const { data, error } = await supabase
            .from('items')
            .insert({
              ...itemData,
              user_id: user.id,
              allocated_cost: allocatedCost,
            } as any)
            .select()
            .single();
          if (error) throw error;
          const item = data as Item;
          set(state => ({ items: [item, ...state.items], isLoading: false }));

          // Auto-transition: If this is the first item added to an "unprocessed" pallet,
          // automatically change pallet status to "processing"
          if (itemData.pallet_id) {
            const { data: pallet } = await supabase
              .from('pallets')
              .select('status')
              .eq('id', itemData.pallet_id)
              .single();

            if (pallet && pallet.status === 'unprocessed') {
              // Update pallet status to "processing"
              await supabase
                .from('pallets')
                .update({ status: 'processing' })
                .eq('id', itemData.pallet_id);

              // Update the pallets store
              // eslint-disable-next-line @typescript-eslint/no-require-imports -- circular dependency workaround
              const { usePalletsStore } = require('./pallets-store');
              const palletsStore = usePalletsStore.getState();
              // Refresh pallets to get the updated status
              palletsStore.fetchPallets();
            }
          }

          // Check if user is approaching their item limit and notify
          const newActiveItemCount = activeItemCount + 1;
          const itemLimit = subscriptionStore.getLimitForAction('activeItems');
          if (typeof itemLimit === 'number' && itemLimit !== Infinity) {
            createLimitWarningNotification('items', newActiveItemCount, itemLimit);
          }

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

          // Check if pallet assignment is changing
          const palletChanging = 'pallet_id' in updates && updates.pallet_id !== currentItem.pallet_id;
          const oldPalletId = currentItem.pallet_id;
          const newPalletId = updates.pallet_id;

          let finalUpdates = { ...updates };

          // Reset listing_date when listing_price changes (clears stale status on reprice)
          if (
            'listing_price' in updates &&
            updates.listing_price !== currentItem.listing_price
          ) {
            finalUpdates.listing_date = new Date().toISOString().split('T')[0];
          }

          if (palletChanging) {
            // Handle pallet reassignment
            if (newPalletId) {
              // Moving to a new pallet - calculate new allocated cost
              const { data: newPallet } = await supabase
                .from('pallets')
                .select('purchase_cost, sales_tax')
                .eq('id', newPalletId)
                .single();

              if (newPallet) {
                // Count items currently in target pallet
                const { count: currentCount } = await supabase
                  .from('items')
                  .select('*', { count: 'exact', head: true })
                  .eq('pallet_id', newPalletId);

                const totalPalletCost = newPallet.purchase_cost + (newPallet.sales_tax || 0);
                // New count includes this item being moved
                const newAllocatedCost = totalPalletCost / ((currentCount || 0) + 1);

                finalUpdates.allocated_cost = newAllocatedCost;
                finalUpdates.source_type = 'pallet';

                // Update existing items in the NEW pallet with recalculated cost
                if ((currentCount || 0) > 0) {
                  await supabase
                    .from('items')
                    .update({ allocated_cost: newAllocatedCost })
                    .eq('pallet_id', newPalletId);

                  // Update local state for new pallet items
                  set(state => ({
                    items: state.items.map(i =>
                      i.pallet_id === newPalletId && i.id !== id
                        ? { ...i, allocated_cost: newAllocatedCost }
                        : i
                    ),
                  }));
                }
              }
            } else {
              // Moving to individual (no pallet) - clear allocated cost
              finalUpdates.allocated_cost = null;
            }

            // Recalculate OLD pallet if item was in one
            if (oldPalletId) {
              const { data: oldPallet } = await supabase
                .from('pallets')
                .select('purchase_cost, sales_tax')
                .eq('id', oldPalletId)
                .single();

              if (oldPallet) {
                // Count remaining items (excluding this one being moved)
                const { count: remainingCount } = await supabase
                  .from('items')
                  .select('*', { count: 'exact', head: true })
                  .eq('pallet_id', oldPalletId)
                  .neq('id', id);

                if ((remainingCount || 0) > 0) {
                  const oldPalletCost = oldPallet.purchase_cost + (oldPallet.sales_tax || 0);
                  const oldAllocatedCost = oldPalletCost / remainingCount!;

                  await supabase
                    .from('items')
                    .update({ allocated_cost: oldAllocatedCost })
                    .eq('pallet_id', oldPalletId)
                    .neq('id', id);

                  // Update local state for old pallet items
                  set(state => ({
                    items: state.items.map(i =>
                      i.pallet_id === oldPalletId && i.id !== id
                        ? { ...i, allocated_cost: oldAllocatedCost }
                        : i
                    ),
                  }));
                }
              }
            }
          }

          const { data, error } = await supabase
            .from('items')
            .update({ ...finalUpdates, version: currentItem.version + 1 } as any)
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
          // Get the item first to check if it belongs to a pallet
          const itemToDelete = get().items.find(i => i.id === id);
          const palletId = itemToDelete?.pallet_id;

          const { error } = await supabase.from('items').delete().eq('id', id);
          if (error) throw error;

          // If item was in a pallet, recalculate allocated costs for remaining items
          if (palletId) {
            // Fetch the pallet to get its cost
            const { data: pallet } = await supabase
              .from('pallets')
              .select('purchase_cost, sales_tax')
              .eq('id', palletId)
              .single();

            if (pallet) {
              // Count remaining items in this pallet (after delete)
              const { count } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true })
                .eq('pallet_id', palletId);

              const remainingItemCount = count || 0;

              if (remainingItemCount > 0) {
                const totalPalletCost = pallet.purchase_cost + (pallet.sales_tax || 0);
                const newAllocatedCost = totalPalletCost / remainingItemCount;

                // Update remaining items with new allocated cost
                await supabase
                  .from('items')
                  .update({ allocated_cost: newAllocatedCost })
                  .eq('pallet_id', palletId);

                // Update local state for remaining items
                set(state => ({
                  items: state.items
                    .filter(i => i.id !== id)
                    .map(i =>
                      i.pallet_id === palletId
                        ? { ...i, allocated_cost: newAllocatedCost }
                        : i
                    ),
                  selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
                  isLoading: false,
                }));
                return { success: true };
              }
            }
          }

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

      markAsSold: async (id: string, saleData: SaleData) => {
        const currentItem = get().items.find(i => i.id === id);
        const existingNotes = currentItem?.notes || '';
        // Append buyer notes to existing notes if provided
        const updatedNotes = saleData.buyer_notes
          ? existingNotes
            ? `${existingNotes}\n\n--- Sale Notes ---\n${saleData.buyer_notes}`
            : `--- Sale Notes ---\n${saleData.buyer_notes}`
          : existingNotes || null;

        // Get local date as YYYY-MM-DD string to avoid timezone issues
        const getLocalDateString = (): string => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const result = await get().updateItem(id, {
          status: 'sold',
          sale_price: saleData.sale_price,
          sale_date: saleData.sale_date || getLocalDateString(),
          sales_channel: saleData.sales_channel,
          notes: updatedNotes,
          // Phase 8: Per-item cost fields
          platform: saleData.platform ?? null,
          platform_fee: saleData.platform_fee ?? null,
          shipping_cost: saleData.shipping_cost ?? null,
        });

        // Check for pallet milestone notification after successful sale
        if (result.success && currentItem?.pallet_id) {
          try {
            // Fetch the pallet data for milestone check
            const { data: pallet } = await supabase
              .from('pallets')
              .select('*')
              .eq('id', currentItem.pallet_id)
              .single();

            if (pallet) {
              // Get all items for this pallet (including the just-sold one with updated data)
              const allItems = get().items;
              checkPalletMilestoneNotification(pallet, allItems);
            }
          } catch (error) {
            // Don't fail the sale if notification check fails
            console.error('Failed to check pallet milestone:', error);
          }
        }

        return result;
      },

      setSelectedItem: (id: string | null) => set({ selectedItemId: id }),
      clearError: () => set({ error: null }),
      clearItems: () => set({ items: [], selectedItemId: null, error: null }),

      // Photo management
      uploadItemPhotos: async (itemId: string, photos: PhotoItem[]) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const uploadedPhotos: ItemPhoto[] = [];

          // Only upload new photos (ones without storagePath)
          const newPhotos = photos.filter(p => p.isNew && !p.storagePath);

          for (let i = 0; i < newPhotos.length; i++) {
            const photo = newPhotos[i];
            const result = await uploadItemPhoto(
              { uri: photo.uri, width: 0, height: 0, type: 'image/jpeg', fileName: `photo_${i}.jpg` },
              user.id,
              itemId
            );

            if (result.success && result.path) {
              // Save to item_photos table
              const { data, error } = await supabase
                .from('item_photos')
                .insert({
                  item_id: itemId,
                  user_id: user.id,
                  storage_path: result.path,
                  display_order: photos.indexOf(photo),
                })
                .select()
                .single();

              if (!error && data) {
                uploadedPhotos.push(data as ItemPhoto);
              }
            }
          }

          return { success: true, photos: uploadedPhotos };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to upload photos';
          return { success: false, error: message };
        }
      },

      fetchItemPhotos: async (itemId: string) => {
        try {
          const { data, error } = await supabase
            .from('item_photos')
            .select('*')
            .eq('item_id', itemId)
            .order('display_order', { ascending: true });

          if (error) throw error;
          return (data as ItemPhoto[]) || [];
        } catch {
          return [];
        }
      },

      deleteItemPhoto: async (photoId: string, storagePath: string) => {
        try {
          // Delete from storage
          await deletePhoto(storagePath);

          // Delete from database
          const { error } = await supabase
            .from('item_photos')
            .delete()
            .eq('id', photoId);

          if (error) throw error;
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete photo';
          return { success: false, error: message };
        }
      },

      fetchThumbnails: async (itemIds: string[]) => {
        if (itemIds.length === 0) return {};

        try {
          // Fetch first photo for each item (ordered by display_order)
          const { data, error } = await supabase
            .from('item_photos')
            .select('item_id, storage_path')
            .in('item_id', itemIds)
            .order('display_order', { ascending: true });

          if (error || !data) return {};

          // Create a map of item_id -> thumbnail URL (first photo only)
          const thumbnails: Record<string, string> = {};
          for (const photo of data) {
            if (!thumbnails[photo.item_id]) {
              thumbnails[photo.item_id] = getPhotoUrl(photo.storage_path);
            }
          }
          return thumbnails;
        } catch (err) {
          // eslint-disable-next-line no-console -- intentional error logging
          console.error('Failed to fetch thumbnails:', err);
          return {};
        }
      },
    }),
    {
      name: 'items-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items, selectedItemId: state.selectedItemId }),
    }
  )
);
