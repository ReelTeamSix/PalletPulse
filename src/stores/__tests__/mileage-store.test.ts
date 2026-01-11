// Mileage Store Tests
import { useMileageStore } from '../mileage-store';
import { supabase } from '@/src/lib/supabase';

// Mock Supabase
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const mockTrip = {
  id: 'trip-1',
  user_id: 'user-123',
  trip_date: '2026-01-11',
  purpose: 'pallet_pickup' as const,
  miles: 45,
  mileage_rate: 0.725,
  deduction: 32.625,
  notes: 'Picked up 2 pallets',
  created_at: '2026-01-11T00:00:00Z',
  updated_at: '2026-01-11T00:00:00Z',
};

const mockTrip2 = {
  ...mockTrip,
  id: 'trip-2',
  trip_date: '2026-01-15',
  purpose: 'thrift_run' as const,
  miles: 30,
  deduction: 21.75,
  notes: null,
};

const mockTrip3 = {
  ...mockTrip,
  id: 'trip-3',
  trip_date: '2025-12-10', // Previous year
  miles: 20,
  deduction: 14.5,
};

describe('MileageStore', () => {
  beforeEach(() => {
    useMileageStore.setState({
      trips: [],
      isLoading: false,
      error: null,
      currentMileageRate: 0.725,
    });
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct initial state', () => {
      const state = useMileageStore.getState();
      expect(state.trips).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.currentMileageRate).toBe(0.725);
    });
  });

  describe('fetchTrips', () => {
    it('should fetch trips successfully', async () => {
      // Mock trips query
      const mockTripsSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [mockTrip], error: null }),
      });

      // Mock trip-pallets query
      const mockLinksSelect = jest.fn().mockResolvedValue({
        data: [{ trip_id: 'trip-1', pallet_id: 'pallet-1' }],
        error: null,
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockTripsSelect })
        .mockReturnValueOnce({ select: mockLinksSelect });

      await useMileageStore.getState().fetchTrips();

      const state = useMileageStore.getState();
      expect(state.trips).toHaveLength(1);
      expect(state.trips[0].miles).toBe(45);
      expect(state.trips[0].pallet_ids).toEqual(['pallet-1']);
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await useMileageStore.getState().fetchTrips();

      const state = useMileageStore.getState();
      expect(state.trips).toHaveLength(0);
      expect(state.error).toBe('Network error');
    });
  });

  describe('addTrip', () => {
    it('should add trip successfully', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

      const result = await useMileageStore.getState().addTrip({
        trip_date: '2026-01-11',
        purpose: 'pallet_pickup',
        miles: 45,
        mileage_rate: 0.725,
        pallet_ids: [],
      });

      expect(result.success).toBe(true);
      expect(result.data?.miles).toBe(45);
      expect(useMileageStore.getState().trips).toHaveLength(1);
    });

    it('should add trip with pallet links', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

      const result = await useMileageStore.getState().addTrip({
        trip_date: '2026-01-11',
        purpose: 'pallet_pickup',
        miles: 45,
        mileage_rate: 0.725,
        pallet_ids: ['pallet-1', 'pallet-2'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.pallet_ids).toEqual(['pallet-1', 'pallet-2']);
    });

    it('should fail when not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await useMileageStore.getState().addTrip({
        trip_date: '2026-01-11',
        purpose: 'pallet_pickup',
        miles: 45,
        mileage_rate: 0.725,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });
  });

  describe('updateTrip', () => {
    beforeEach(() => {
      useMileageStore.setState({
        trips: [{ ...mockTrip, pallet_ids: [] }],
      });
    });

    it('should update trip successfully', async () => {
      const updatedTrip = { ...mockTrip, miles: 50 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: updatedTrip, error: null }),
        }),
      });
      const mockLinksSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ update: mockUpdate })
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ select: mockLinksSelect });

      const result = await useMileageStore.getState().updateTrip('trip-1', {
        miles: 50,
      });

      expect(result.success).toBe(true);
      expect(useMileageStore.getState().trips[0].miles).toBe(50);
    });
  });

  describe('deleteTrip', () => {
    beforeEach(() => {
      useMileageStore.setState({
        trips: [{ ...mockTrip, pallet_ids: [] }],
      });
    });

    it('should delete trip successfully', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

      const result = await useMileageStore.getState().deleteTrip('trip-1');

      expect(result.success).toBe(true);
      expect(useMileageStore.getState().trips).toHaveLength(0);
    });

    it('should handle delete error', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: new Error('Delete failed') }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

      const result = await useMileageStore.getState().deleteTrip('trip-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('mileage totals', () => {
    beforeEach(() => {
      useMileageStore.setState({
        trips: [
          { ...mockTrip, pallet_ids: ['pallet-1'] },
          { ...mockTrip2, pallet_ids: ['pallet-1', 'pallet-2'] },
          { ...mockTrip3, pallet_ids: [] },
        ],
      });
    });

    it('getTotalMiles should sum all miles', () => {
      const total = useMileageStore.getState().getTotalMiles();
      expect(total).toBe(95); // 45 + 30 + 20
    });

    it('getTotalDeduction should sum all deductions', () => {
      const total = useMileageStore.getState().getTotalDeduction();
      expect(total).toBeCloseTo(68.875); // 32.625 + 21.75 + 14.5
    });

    it('getTotalMilesByPallet should sum pallet miles', () => {
      const total = useMileageStore.getState().getTotalMilesByPallet('pallet-1');
      expect(total).toBe(75); // 45 + 30
    });

    it('getTotalMilesByPallet should return 0 for pallet with no trips', () => {
      const total = useMileageStore.getState().getTotalMilesByPallet('non-existent');
      expect(total).toBe(0);
    });

    it('getTotalDeductionByPallet should sum pallet deductions', () => {
      const total = useMileageStore.getState().getTotalDeductionByPallet('pallet-1');
      expect(total).toBeCloseTo(54.375); // 32.625 + 21.75
    });
  });

  describe('getYTDSummary', () => {
    beforeEach(() => {
      useMileageStore.setState({
        trips: [
          { ...mockTrip, pallet_ids: [] },
          { ...mockTrip2, pallet_ids: [] },
          { ...mockTrip3, pallet_ids: [] }, // 2025
        ],
      });
    });

    it('should calculate YTD for 2026', () => {
      const summary = useMileageStore.getState().getYTDSummary(2026);
      expect(summary.tripCount).toBe(2);
      expect(summary.totalMiles).toBe(75); // 45 + 30
      expect(summary.totalDeduction).toBeCloseTo(54.375);
    });

    it('should calculate YTD for 2025', () => {
      const summary = useMileageStore.getState().getYTDSummary(2025);
      expect(summary.tripCount).toBe(1);
      expect(summary.totalMiles).toBe(20);
    });

    it('should return zeros for year with no trips', () => {
      const summary = useMileageStore.getState().getYTDSummary(2024);
      expect(summary.tripCount).toBe(0);
      expect(summary.totalMiles).toBe(0);
      expect(summary.totalDeduction).toBe(0);
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      useMileageStore.setState({
        trips: [
          { ...mockTrip, pallet_ids: ['pallet-1'] },
          { ...mockTrip2, pallet_ids: ['pallet-2'] },
        ],
      });
    });

    it('getTripById should return trip when found', () => {
      const trip = useMileageStore.getState().getTripById('trip-1');
      expect(trip?.miles).toBe(45);
    });

    it('getTripById should return undefined when not found', () => {
      const trip = useMileageStore.getState().getTripById('non-existent');
      expect(trip).toBeUndefined();
    });

    it('getTripsByPallet should return trips for pallet', () => {
      const trips = useMileageStore.getState().getTripsByPallet('pallet-1');
      expect(trips).toHaveLength(1);
      expect(trips[0].id).toBe('trip-1');
    });

    it('setMileageRate should update rate', () => {
      useMileageStore.getState().setMileageRate(0.67);
      expect(useMileageStore.getState().currentMileageRate).toBe(0.67);
    });

    it('clearError should reset error', () => {
      useMileageStore.setState({ error: 'Some error' });
      useMileageStore.getState().clearError();
      expect(useMileageStore.getState().error).toBe(null);
    });

    it('clearTrips should reset all state', () => {
      useMileageStore.setState({ error: 'Error' });
      useMileageStore.getState().clearTrips();

      const state = useMileageStore.getState();
      expect(state.trips).toEqual([]);
      expect(state.error).toBe(null);
    });
  });

  describe('fetchCurrentMileageRate', () => {
    it('should fetch rate from app_settings', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { value: 0.67 }, error: null }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const rate = await useMileageStore.getState().fetchCurrentMileageRate();

      expect(rate).toBe(0.67);
      expect(useMileageStore.getState().currentMileageRate).toBe(0.67);
    });

    it('should return default rate on error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const rate = await useMileageStore.getState().fetchCurrentMileageRate();

      expect(rate).toBe(0.725); // Default rate
    });

    it('should handle invalid rate value', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { value: 'invalid' }, error: null }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const rate = await useMileageStore.getState().fetchCurrentMileageRate();

      expect(rate).toBe(0.725); // Default rate
    });
  });
});
