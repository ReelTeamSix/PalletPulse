// Mileage Store - Zustand store for mileage trip management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { MileageTrip, TripPurpose, APP_SETTING_DEFAULTS } from '@/src/types/database';
import { useAppSettingsStore } from './admin-store';

// Fallback IRS mileage rate from centralized defaults
const DEFAULT_IRS_MILEAGE_RATE = APP_SETTING_DEFAULTS.irs_mileage_rate.value;

// Extended mileage trip with linked pallet IDs
export interface MileageTripWithPallets extends MileageTrip {
  pallet_ids: string[];
}

export interface MileageTripInsert {
  trip_date: string;
  purpose: TripPurpose;
  miles: number;
  mileage_rate: number;
  notes?: string | null;
  pallet_ids?: string[];
}

export interface MileageTripUpdate {
  trip_date?: string;
  purpose?: TripPurpose;
  miles?: number;
  mileage_rate?: number;
  notes?: string | null;
  pallet_ids?: string[];
}

export interface MileageState {
  trips: MileageTripWithPallets[];
  isLoading: boolean;
  error: string | null;
  currentMileageRate: number;

  // CRUD operations
  fetchTrips: () => Promise<void>;
  getTripById: (id: string) => MileageTripWithPallets | undefined;
  getTripsByPallet: (palletId: string) => MileageTripWithPallets[];
  addTrip: (trip: MileageTripInsert) => Promise<{ success: boolean; data?: MileageTripWithPallets; error?: string }>;
  updateTrip: (id: string, updates: MileageTripUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteTrip: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Aggregation helpers
  getTotalMiles: () => number;
  getTotalDeduction: () => number;
  getTotalMilesByPallet: (palletId: string) => number;
  getTotalDeductionByPallet: (palletId: string) => number;
  getYTDSummary: (year?: number) => { totalMiles: number; totalDeduction: number; tripCount: number };

  // IRS rate management
  fetchCurrentMileageRate: () => Promise<number>;
  setMileageRate: (rate: number) => void;

  // Utilities
  clearError: () => void;
  clearTrips: () => void;
}

export const useMileageStore = create<MileageState>()(
  persist(
    (set, get) => ({
      trips: [],
      isLoading: false,
      error: null,
      currentMileageRate: DEFAULT_IRS_MILEAGE_RATE,

      fetchTrips: async () => {
        set({ isLoading: true, error: null });
        try {
          // Fetch trips
          const { data: tripsData, error: tripsError } = await supabase
            .from('mileage_trips')
            .select('*')
            .order('trip_date', { ascending: false });

          if (tripsError) throw tripsError;

          // Fetch all trip-pallet links
          const { data: linksData, error: linksError } = await supabase
            .from('mileage_trip_pallets')
            .select('trip_id, pallet_id');

          if (linksError) throw linksError;

          // Create a map of trip_id -> pallet_ids
          const palletMap = new Map<string, string[]>();
          (linksData || []).forEach((link: { trip_id: string; pallet_id: string }) => {
            const existing = palletMap.get(link.trip_id) || [];
            palletMap.set(link.trip_id, [...existing, link.pallet_id]);
          });

          // Combine trips with their pallet IDs
          const tripsWithPallets: MileageTripWithPallets[] = (tripsData || []).map((trip: MileageTrip) => ({
            ...trip,
            pallet_ids: palletMap.get(trip.id) || [],
          }));

          set({ trips: tripsWithPallets, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch mileage trips';
          set({ error: message, isLoading: false });
        }
      },

      getTripById: (id: string) => get().trips.find((t) => t.id === id),

      getTripsByPallet: (palletId: string) =>
        get().trips.filter((t) => t.pallet_ids.includes(palletId)),

      addTrip: async (tripData: MileageTripInsert) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const { pallet_ids, ...tripFields } = tripData;

          // Insert the trip
          const { data: newTrip, error: tripError } = await supabase
            .from('mileage_trips')
            .insert({
              ...tripFields,
              user_id: user.id,
            } as any)
            .select()
            .single();

          if (tripError) throw tripError;

          // Insert pallet links if provided
          if (pallet_ids && pallet_ids.length > 0) {
            const links = pallet_ids.map((palletId) => ({
              trip_id: newTrip.id,
              pallet_id: palletId,
            }));

            const { error: linkError } = await supabase
              .from('mileage_trip_pallets')
              .insert(links);

            if (linkError) throw linkError;
          }

          const tripWithPallets: MileageTripWithPallets = {
            ...(newTrip as MileageTrip),
            pallet_ids: pallet_ids || [],
          };

          set((state) => ({
            trips: [tripWithPallets, ...state.trips],
            isLoading: false,
          }));

          return { success: true, data: tripWithPallets };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add mileage trip';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      updateTrip: async (id: string, updates: MileageTripUpdate) => {
        set({ isLoading: true, error: null });
        try {
          const { pallet_ids, ...tripFields } = updates;

          // Update trip fields if any
          if (Object.keys(tripFields).length > 0) {
            const { error: tripError } = await supabase
              .from('mileage_trips')
              .update(tripFields as any)
              .eq('id', id);

            if (tripError) throw tripError;
          }

          // Update pallet links if provided
          if (pallet_ids !== undefined) {
            // Delete existing links
            const { error: deleteError } = await supabase
              .from('mileage_trip_pallets')
              .delete()
              .eq('trip_id', id);

            if (deleteError) throw deleteError;

            // Insert new links
            if (pallet_ids.length > 0) {
              const links = pallet_ids.map((palletId) => ({
                trip_id: id,
                pallet_id: palletId,
              }));

              const { error: insertError } = await supabase
                .from('mileage_trip_pallets')
                .insert(links);

              if (insertError) throw insertError;
            }
          }

          // Fetch the updated trip
          const { data: updatedTrip, error: fetchError } = await supabase
            .from('mileage_trips')
            .select('*')
            .eq('id', id)
            .single();

          if (fetchError) throw fetchError;

          // Get updated pallet links
          const { data: linksData } = await supabase
            .from('mileage_trip_pallets')
            .select('pallet_id')
            .eq('trip_id', id);

          const updatedPalletIds = (linksData || []).map((l: { pallet_id: string }) => l.pallet_id);

          set((state) => ({
            trips: state.trips.map((t) =>
              t.id === id
                ? { ...(updatedTrip as MileageTrip), pallet_ids: updatedPalletIds }
                : t
            ),
            isLoading: false,
          }));

          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update mileage trip';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      deleteTrip: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          // Junction table has ON DELETE CASCADE, so just delete the trip
          const { error } = await supabase
            .from('mileage_trips')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            trips: state.trips.filter((t) => t.id !== id),
            isLoading: false,
          }));

          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete mileage trip';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      getTotalMiles: () => get().trips.reduce((sum, t) => sum + t.miles, 0),

      getTotalDeduction: () =>
        get().trips.reduce((sum, t) => sum + (t.deduction ?? t.miles * t.mileage_rate), 0),

      getTotalMilesByPallet: (palletId: string) =>
        get()
          .trips.filter((t) => t.pallet_ids.includes(palletId))
          .reduce((sum, t) => sum + t.miles, 0),

      getTotalDeductionByPallet: (palletId: string) =>
        get()
          .trips.filter((t) => t.pallet_ids.includes(palletId))
          .reduce((sum, t) => sum + (t.deduction ?? t.miles * t.mileage_rate), 0),

      getYTDSummary: (year: number = new Date().getFullYear()) => {
        const yearTrips = get().trips.filter((trip) => {
          const tripYear = new Date(trip.trip_date + 'T00:00:00').getFullYear();
          return tripYear === year;
        });

        const totalMiles = yearTrips.reduce((sum, t) => sum + t.miles, 0);
        const totalDeduction = yearTrips.reduce(
          (sum, t) => sum + (t.deduction ?? t.miles * t.mileage_rate),
          0
        );
        const tripCount = yearTrips.length;

        return { totalMiles, totalDeduction, tripCount };
      },

      fetchCurrentMileageRate: async () => {
        try {
          // Use centralized app settings store (has caching)
          const settingsStore = useAppSettingsStore.getState();

          // Ensure settings are fetched
          if (!settingsStore.settingsLoaded) {
            await settingsStore.fetchSettings();
          }

          const rate = settingsStore.getMileageRate();
          set({ currentMileageRate: rate });
          return rate;
        } catch (err) {
          // eslint-disable-next-line no-console -- intentional warning logging
          console.warn('Error fetching mileage rate:', err);
          return DEFAULT_IRS_MILEAGE_RATE;
        }
      },

      setMileageRate: (rate: number) => set({ currentMileageRate: rate }),

      clearError: () => set({ error: null }),

      clearTrips: () => set({ trips: [], error: null }),
    }),
    {
      name: 'mileage-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        trips: state.trips,
        currentMileageRate: state.currentMileageRate,
      }),
    }
  )
);
