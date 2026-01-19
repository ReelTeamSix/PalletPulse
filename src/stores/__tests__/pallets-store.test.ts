// Pallets Store Tests
import { usePalletsStore } from '../pallets-store';
import { supabase } from '@/src/lib/supabase';

// Mock Supabase
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
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

const mockPallet = {
  id: 'pallet-1',
  user_id: 'user-123',
  name: 'Test Pallet',
  supplier: 'Test Supplier',
  source_type: 'pallet' as const,
  source_name: 'Amazon Monster',
  purchase_cost: 100,
  sales_tax: 6,
  purchase_date: '2024-01-15',
  status: 'unprocessed' as const,
  notes: null,
  completion_prompt_dismissed: false,
  version: 1,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

describe('PalletsStore', () => {
  beforeEach(() => {
    usePalletsStore.setState({
      pallets: [],
      isLoading: false,
      error: null,
      selectedPalletId: null,
    });
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct initial state', () => {
      const state = usePalletsStore.getState();
      expect(state.pallets).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.selectedPalletId).toBe(null);
    });
  });

  describe('fetchPallets', () => {
    it('should fetch pallets successfully', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [mockPallet], error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await usePalletsStore.getState().fetchPallets();

      const state = usePalletsStore.getState();
      expect(state.pallets).toHaveLength(1);
      expect(state.pallets[0].name).toBe('Test Pallet');
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await usePalletsStore.getState().fetchPallets();

      const state = usePalletsStore.getState();
      expect(state.pallets).toHaveLength(0);
      expect(state.error).toBe('Network error');
    });
  });

  describe('addPallet', () => {
    it('should add pallet successfully', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockPallet, error: null }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

      const result = await usePalletsStore.getState().addPallet({
        name: 'Test Pallet',
        purchase_cost: 100,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPallet);
      expect(usePalletsStore.getState().pallets).toHaveLength(1);
    });

    it('should fail when not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await usePalletsStore.getState().addPallet({
        name: 'Test Pallet',
        purchase_cost: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });
  });

  describe('updatePallet', () => {
    beforeEach(() => {
      usePalletsStore.setState({ pallets: [mockPallet] });
    });

    it('should update pallet successfully', async () => {
      const updatedPallet = { ...mockPallet, name: 'Updated Pallet', version: 2 };
      
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedPallet, error: null }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await usePalletsStore.getState().updatePallet('pallet-1', {
        name: 'Updated Pallet',
      });

      expect(result.success).toBe(true);
      expect(usePalletsStore.getState().pallets[0].name).toBe('Updated Pallet');
    });

    it('should fail when pallet not found', async () => {
      const result = await usePalletsStore.getState().updatePallet('non-existent', {
        name: 'Updated',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pallet not found');
    });
  });

  describe('deletePallet', () => {
    beforeEach(() => {
      usePalletsStore.setState({ pallets: [mockPallet], selectedPalletId: 'pallet-1' });
    });

    it('should delete pallet successfully', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

      const result = await usePalletsStore.getState().deletePallet('pallet-1');

      expect(result.success).toBe(true);
      expect(usePalletsStore.getState().pallets).toHaveLength(0);
      expect(usePalletsStore.getState().selectedPalletId).toBe(null);
    });
  });

  describe('markAsCompleted', () => {
    beforeEach(() => {
      const processingPallet = { ...mockPallet, status: 'processing' as const };
      usePalletsStore.setState({ pallets: [processingPallet] });
    });

    it('should mark pallet as completed successfully', async () => {
      const completedPallet = { ...mockPallet, status: 'completed', version: 2 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: completedPallet, error: null }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await usePalletsStore.getState().markAsCompleted('pallet-1');

      expect(result.success).toBe(true);
      expect(usePalletsStore.getState().pallets[0].status).toBe('completed');
    });

    it('should fail when pallet not found', async () => {
      const result = await usePalletsStore.getState().markAsCompleted('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pallet not found');
    });
  });

  describe('dismissCompletionPrompt', () => {
    beforeEach(() => {
      usePalletsStore.setState({ pallets: [mockPallet] });
    });

    it('should dismiss completion prompt successfully', async () => {
      const dismissedPallet = { ...mockPallet, completion_prompt_dismissed: true, version: 2 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: dismissedPallet, error: null }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await usePalletsStore.getState().dismissCompletionPrompt('pallet-1');

      expect(result.success).toBe(true);
      expect(usePalletsStore.getState().pallets[0].completion_prompt_dismissed).toBe(true);
    });

    it('should fail when pallet not found', async () => {
      const result = await usePalletsStore.getState().dismissCompletionPrompt('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pallet not found');
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      usePalletsStore.setState({ pallets: [mockPallet] });
    });

    it('getPalletById should return pallet when found', () => {
      const pallet = usePalletsStore.getState().getPalletById('pallet-1');
      expect(pallet).toEqual(mockPallet);
    });

    it('getPalletById should return undefined when not found', () => {
      const pallet = usePalletsStore.getState().getPalletById('non-existent');
      expect(pallet).toBeUndefined();
    });

    it('setSelectedPallet should update selection', () => {
      usePalletsStore.getState().setSelectedPallet('pallet-1');
      expect(usePalletsStore.getState().selectedPalletId).toBe('pallet-1');
    });

    it('clearError should reset error', () => {
      usePalletsStore.setState({ error: 'Some error' });
      usePalletsStore.getState().clearError();
      expect(usePalletsStore.getState().error).toBe(null);
    });

    it('clearPallets should reset all state', () => {
      usePalletsStore.setState({ error: 'Error', selectedPalletId: 'pallet-1' });
      usePalletsStore.getState().clearPallets();
      
      const state = usePalletsStore.getState();
      expect(state.pallets).toEqual([]);
      expect(state.selectedPalletId).toBe(null);
      expect(state.error).toBe(null);
    });
  });
});
