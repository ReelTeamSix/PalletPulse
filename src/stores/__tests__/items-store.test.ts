// Items Store Tests
import { useItemsStore } from '../items-store';
import { supabase } from '@/src/lib/supabase';
import * as photoUtils from '@/src/lib/photo-utils';

// Mock Supabase
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
    storage: { from: jest.fn() },
  },
}));

// Mock photo-utils
jest.mock('@/src/lib/photo-utils', () => ({
  uploadItemPhoto: jest.fn(),
  deletePhoto: jest.fn(),
  getPhotoUrl: jest.fn((path) => `https://example.com/${path}`),
}));

// Mock subscription store to allow all operations in tests
jest.mock('../subscription-store', () => ({
  useSubscriptionStore: {
    getState: () => ({
      canPerform: () => true, // Allow all operations in tests
      getRequiredTierForAction: () => null,
    }),
  },
}));

// Mock pallets store for auto-transition tests
const mockFetchPallets = jest.fn();
jest.mock('../pallets-store', () => ({
  usePalletsStore: {
    getState: () => ({
      fetchPallets: mockFetchPallets,
    }),
  },
}));

const mockItem = {
  id: 'item-1',
  user_id: 'user-123',
  pallet_id: 'pallet-1',
  name: 'Test Item',
  description: 'A test item',
  quantity: 1,
  condition: 'new' as const,
  retail_price: 50,
  listing_price: 40,
  sale_price: null,
  purchase_cost: null,
  allocated_cost: 25,
  storage_location: 'Shelf A',
  status: 'listed' as const,
  listing_date: '2024-01-15',
  sale_date: null,
  sales_channel: null,
  barcode: null,
  source_type: 'pallet' as const,
  source_name: null,
  notes: null,
  platform: null,
  platform_fee: null,
  shipping_cost: null,
  version: 1,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

const mockItem2 = {
  ...mockItem,
  id: 'item-2',
  pallet_id: 'pallet-2',
  name: 'Test Item 2',
};

describe('ItemsStore', () => {
  beforeEach(() => {
    useItemsStore.setState({
      items: [],
      isLoading: false,
      error: null,
      selectedItemId: null,
    });
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct initial state', () => {
      const state = useItemsStore.getState();
      expect(state.items).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.selectedItemId).toBe(null);
    });
  });

  describe('fetchItems', () => {
    it('should fetch items successfully', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [mockItem], error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await useItemsStore.getState().fetchItems();

      const state = useItemsStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].name).toBe('Test Item');
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await useItemsStore.getState().fetchItems();

      const state = useItemsStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.error).toBe('Network error');
    });
  });

  describe('fetchItemsByPallet', () => {
    it('should fetch items for specific pallet', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockItem], error: null }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const items = await useItemsStore.getState().fetchItemsByPallet('pallet-1');

      expect(items).toHaveLength(1);
      expect(items[0].pallet_id).toBe('pallet-1');
    });

    it('should return empty array on error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: new Error('Error') }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const items = await useItemsStore.getState().fetchItemsByPallet('pallet-1');

      expect(items).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('should add item successfully with pallet', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      // Mock different responses for different tables
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'pallets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { purchase_cost: 100, sales_tax: 10 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'items') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await useItemsStore.getState().addItem({
        name: 'Test Item',
        pallet_id: 'pallet-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
      expect(useItemsStore.getState().items).toHaveLength(1);
    });

    it('should add item successfully without pallet', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const itemWithoutPallet = { ...mockItem, pallet_id: null, allocated_cost: null };
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: itemWithoutPallet, error: null }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

      const result = await useItemsStore.getState().addItem({
        name: 'Test Item',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(itemWithoutPallet);
    });

    it('should fail when not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await useItemsStore.getState().addItem({
        name: 'Test Item',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should auto-transition pallet from unprocessed to processing when item added', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      // Track update calls
      const updateCalls: { table: string; data: Record<string, unknown> }[] = [];

      // Mock different responses for different tables
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'pallets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { purchase_cost: 100, sales_tax: 10, status: 'unprocessed' },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockImplementation((data) => {
              updateCalls.push({ table, data });
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        if (table === 'items') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      await useItemsStore.getState().addItem({
        name: 'Test Item',
        pallet_id: 'pallet-1',
      });

      // Verify that the pallet status was updated to 'processing'
      const palletUpdate = updateCalls.find(c => c.table === 'pallets');
      expect(palletUpdate).toBeDefined();
      expect(palletUpdate?.data.status).toBe('processing');
      expect(mockFetchPallets).toHaveBeenCalled();
    });
  });

  describe('updateItem', () => {
    beforeEach(() => {
      useItemsStore.setState({ items: [mockItem] });
    });

    it('should update item successfully', async () => {
      const updatedItem = { ...mockItem, name: 'Updated Item', version: 2 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedItem, error: null }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useItemsStore.getState().updateItem('item-1', {
        name: 'Updated Item',
      });

      expect(result.success).toBe(true);
      expect(useItemsStore.getState().items[0].name).toBe('Updated Item');
    });

    it('should fail when item not found', async () => {
      const result = await useItemsStore.getState().updateItem('non-existent', {
        name: 'Updated',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should reset listing_date when listing_price changes (clears stale status)', async () => {
      // Set up an item with an old listing_date (stale)
      const staleItem = {
        ...mockItem,
        listing_date: '2024-01-01', // Old date - would be stale
        listing_price: 40,
      };
      useItemsStore.setState({ items: [staleItem] });

      const today = new Date().toISOString().split('T')[0];
      const updatedItem = {
        ...staleItem,
        listing_price: 35, // Price changed
        listing_date: today, // Should be reset to today
        version: 2,
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedItem, error: null }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useItemsStore.getState().updateItem('item-1', {
        listing_price: 35, // Different price
      });

      expect(result.success).toBe(true);
      // Verify the update was called with the new listing_date
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_price: 35,
          listing_date: today,
        })
      );
    });

    it('should NOT reset listing_date when listing_price stays the same', async () => {
      const originalDate = '2024-01-01';
      const itemWithDate = {
        ...mockItem,
        listing_date: originalDate,
        listing_price: 40,
      };
      useItemsStore.setState({ items: [itemWithDate] });

      const updatedItem = {
        ...itemWithDate,
        name: 'New Name', // Only name changed, not price
        version: 2,
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedItem, error: null }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      await useItemsStore.getState().updateItem('item-1', {
        name: 'New Name', // Price not changing
      });

      // Verify the update was NOT called with a new listing_date
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          listing_date: expect.any(String),
        })
      );
    });
  });

  describe('deleteItem', () => {
    beforeEach(() => {
      useItemsStore.setState({ items: [mockItem], selectedItemId: 'item-1' });
    });

    it('should delete item successfully', async () => {
      // Mock different responses for different tables and operations
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'pallets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { purchase_cost: 100, sales_tax: 10 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'items') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          };
        }
        return {};
      });

      const result = await useItemsStore.getState().deleteItem('item-1');

      expect(result.success).toBe(true);
      expect(useItemsStore.getState().items).toHaveLength(0);
      expect(useItemsStore.getState().selectedItemId).toBe(null);
    });

    it('should delete item without pallet successfully', async () => {
      const itemWithoutPallet = { ...mockItem, pallet_id: null };
      useItemsStore.setState({ items: [itemWithoutPallet], selectedItemId: 'item-1' });

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

      const result = await useItemsStore.getState().deleteItem('item-1');

      expect(result.success).toBe(true);
      expect(useItemsStore.getState().items).toHaveLength(0);
    });
  });

  describe('markAsSold', () => {
    beforeEach(() => {
      useItemsStore.setState({ items: [mockItem] });
    });

    it('should mark item as sold', async () => {
      const soldItem = {
        ...mockItem,
        status: 'sold',
        sale_price: 35,
        sale_date: '2024-01-20',
        sales_channel: 'eBay',
        version: 2,
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: soldItem, error: null }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useItemsStore.getState().markAsSold('item-1', {
        sale_price: 35,
        sale_date: '2024-01-20',
        sales_channel: 'eBay',
      });

      expect(result.success).toBe(true);
      expect(useItemsStore.getState().items[0].status).toBe('sold');
      expect(useItemsStore.getState().items[0].sale_price).toBe(35);
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      useItemsStore.setState({ items: [mockItem, mockItem2] });
    });

    it('getItemById should return item when found', () => {
      const item = useItemsStore.getState().getItemById('item-1');
      expect(item).toEqual(mockItem);
    });

    it('getItemById should return undefined when not found', () => {
      const item = useItemsStore.getState().getItemById('non-existent');
      expect(item).toBeUndefined();
    });

    it('getItemsByPallet should return items for pallet', () => {
      const items = useItemsStore.getState().getItemsByPallet('pallet-1');
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-1');
    });

    it('setSelectedItem should update selection', () => {
      useItemsStore.getState().setSelectedItem('item-1');
      expect(useItemsStore.getState().selectedItemId).toBe('item-1');
    });

    it('clearError should reset error', () => {
      useItemsStore.setState({ error: 'Some error' });
      useItemsStore.getState().clearError();
      expect(useItemsStore.getState().error).toBe(null);
    });

    it('clearItems should reset all state', () => {
      useItemsStore.setState({ error: 'Error', selectedItemId: 'item-1' });
      useItemsStore.getState().clearItems();

      const state = useItemsStore.getState();
      expect(state.items).toEqual([]);
      expect(state.selectedItemId).toBe(null);
      expect(state.error).toBe(null);
    });
  });

  describe('photo management', () => {
    const mockPhoto = {
      id: 'photo-1',
      item_id: 'item-1',
      user_id: 'user-123',
      storage_path: 'user-123/item-1/photo1.jpg',
      display_order: 0,
      created_at: '2024-01-15T00:00:00Z',
    };

    describe('fetchItemPhotos', () => {
      it('should fetch photos for item', async () => {
        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [mockPhoto], error: null }),
          }),
        });
        (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

        const photos = await useItemsStore.getState().fetchItemPhotos('item-1');

        expect(photos).toHaveLength(1);
        expect(photos[0].storage_path).toBe('user-123/item-1/photo1.jpg');
      });

      it('should return empty array on error', async () => {
        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Error') }),
          }),
        });
        (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

        const photos = await useItemsStore.getState().fetchItemPhotos('item-1');

        expect(photos).toEqual([]);
      });
    });

    describe('uploadItemPhotos', () => {
      it('should upload new photos', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
        });
        (photoUtils.uploadItemPhoto as jest.Mock).mockResolvedValue({
          success: true,
          path: 'user-123/item-1/12345.jpg',
        });

        const mockInsert = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockPhoto, error: null }),
          }),
        });
        (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

        const newPhotos = [
          { id: 'new_1', uri: 'file://photo.jpg', isNew: true },
        ];

        const result = await useItemsStore.getState().uploadItemPhotos('item-1', newPhotos);

        expect(result.success).toBe(true);
        expect(result.photos).toHaveLength(1);
        expect(photoUtils.uploadItemPhoto).toHaveBeenCalled();
      });

      it('should skip non-new photos', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
        });

        const existingPhotos = [
          { id: 'existing-1', uri: 'https://example.com/photo.jpg', isNew: false, storagePath: 'path.jpg' },
        ];

        const result = await useItemsStore.getState().uploadItemPhotos('item-1', existingPhotos);

        expect(result.success).toBe(true);
        expect(result.photos).toHaveLength(0);
        expect(photoUtils.uploadItemPhoto).not.toHaveBeenCalled();
      });

      it('should fail when not authenticated', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: null },
        });

        const result = await useItemsStore.getState().uploadItemPhotos('item-1', []);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User not authenticated');
      });
    });

    describe('deleteItemPhoto', () => {
      it('should delete photo from storage and database', async () => {
        (photoUtils.deletePhoto as jest.Mock).mockResolvedValue({ success: true });

        const mockDelete = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
        (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

        const result = await useItemsStore.getState().deleteItemPhoto('photo-1', 'path/to/photo.jpg');

        expect(result.success).toBe(true);
        expect(photoUtils.deletePhoto).toHaveBeenCalledWith('path/to/photo.jpg');
      });

      it('should handle database delete error', async () => {
        (photoUtils.deletePhoto as jest.Mock).mockResolvedValue({ success: true });

        const mockDelete = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: new Error('Delete failed') }),
        });
        (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

        const result = await useItemsStore.getState().deleteItemPhoto('photo-1', 'path/to/photo.jpg');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Delete failed');
      });
    });
  });
});
