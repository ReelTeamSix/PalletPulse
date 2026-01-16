// Admin Store - Read-only store for app-wide configurable settings
// Phase 8G: App settings are read from Supabase, written via Supabase Studio (secure)
//
// SECURITY NOTE: Admin write operations are intentionally NOT in the mobile app.
// Settings are managed via:
// 1. Supabase Studio (now) - direct database access for admins
// 2. Separate web admin dashboard (future) - server-side authenticated web app
//
// This store provides READ-ONLY access to settings for use in calculations.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import {
  AppSetting,
  AppSettingKey,
  APP_SETTING_DEFAULTS,
  APP_SETTING_KEYS,
  SalesPlatform,
  PLATFORM_FEE_KEYS,
} from '@/src/types/database';

export interface AppSettingsState {
  // Settings (read-only from mobile app perspective)
  settings: Record<AppSettingKey, number>;
  settingsLoaded: boolean;
  lastFetched: string | null;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions - Read Only
  fetchSettings: () => Promise<void>;
  getSetting: (key: AppSettingKey) => number;
  getPlatformFee: (platform: SalesPlatform | string) => number;
  getMileageRate: () => number;
  getTrialDuration: () => number;
  getDefaultStaleThreshold: () => number;

  // Helpers
  clearError: () => void;
  refreshSettings: () => Promise<void>;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set, get) => ({
      // Initialize with defaults (used until settings are fetched)
      settings: Object.fromEntries(
        APP_SETTING_KEYS.map(key => [key, APP_SETTING_DEFAULTS[key].value])
      ) as Record<AppSettingKey, number>,
      settingsLoaded: false,
      lastFetched: null,
      isLoading: false,
      error: null,

      fetchSettings: async () => {
        // Don't refetch if recently loaded (within 5 minutes)
        const lastFetched = get().lastFetched;
        if (lastFetched) {
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          if (new Date(lastFetched).getTime() > fiveMinutesAgo) {
            return; // Use cached settings
          }
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('app_settings')
            .select('key, value');

          if (error) {
            // If table doesn't exist or RLS blocks, use defaults silently
            // eslint-disable-next-line no-console -- intentional warning logging
            console.warn('App settings fetch warning:', error.message);
            set({ settingsLoaded: true, isLoading: false, lastFetched: new Date().toISOString() });
            return;
          }

          // Merge fetched settings with defaults
          const settings = { ...get().settings };

          if (data && data.length > 0) {
            for (const setting of data as Pick<AppSetting, 'key' | 'value'>[]) {
              const key = setting.key as AppSettingKey;
              if (APP_SETTING_KEYS.includes(key)) {
                // Handle different value types
                const value = setting.value;
                if (typeof value === 'number') {
                  settings[key] = value;
                } else if (typeof value === 'string') {
                  const parsed = parseFloat(value);
                  if (!isNaN(parsed)) {
                    settings[key] = parsed;
                  }
                }
              }
            }
          }

          set({
            settings,
            settingsLoaded: true,
            isLoading: false,
            lastFetched: new Date().toISOString(),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to fetch settings';
          // eslint-disable-next-line no-console -- intentional warning logging
          console.warn('App settings fetch error:', message);
          // Use defaults on error - don't block app functionality
          set({
            settingsLoaded: true,
            isLoading: false,
            error: message,
            lastFetched: new Date().toISOString(),
          });
        }
      },

      getSetting: (key) => {
        const value = get().settings[key];
        return value ?? APP_SETTING_DEFAULTS[key]?.value ?? 0;
      },

      getPlatformFee: (platform) => {
        // Map platform to setting key
        const settingKey = PLATFORM_FEE_KEYS[platform as SalesPlatform];
        if (settingKey) {
          return get().getSetting(settingKey);
        }
        // Platforms without configured fees (craigslist, local sales)
        return 0;
      },

      getMileageRate: () => {
        return get().getSetting('irs_mileage_rate');
      },

      getTrialDuration: () => {
        return get().getSetting('trial_duration_days');
      },

      getDefaultStaleThreshold: () => {
        return get().getSetting('default_stale_threshold');
      },

      refreshSettings: async () => {
        // Force refresh by clearing lastFetched
        set({ lastFetched: null });
        return get().fetchSettings();
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'app-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
        settingsLoaded: state.settingsLoaded,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook to get platform fee percentage for a given platform
 * Auto-fetches settings if not loaded
 */
export function usePlatformFee(platform: SalesPlatform | string): number {
  const { getPlatformFee, settingsLoaded, fetchSettings } = useAppSettingsStore();

  // Fetch settings on first use if not loaded
  if (!settingsLoaded) {
    fetchSettings();
  }

  return getPlatformFee(platform);
}

/**
 * Hook to get current IRS mileage rate
 * Auto-fetches settings if not loaded
 */
export function useMileageRate(): number {
  const { getMileageRate, settingsLoaded, fetchSettings } = useAppSettingsStore();

  if (!settingsLoaded) {
    fetchSettings();
  }

  return getMileageRate();
}

/**
 * Hook to get all platform fees at once (for forms with platform selection)
 */
export function useAllPlatformFees(): Record<SalesPlatform, number> {
  const { getPlatformFee, settingsLoaded, fetchSettings } = useAppSettingsStore();

  if (!settingsLoaded) {
    fetchSettings();
  }

  return {
    ebay: getPlatformFee('ebay'),
    poshmark: getPlatformFee('poshmark'),
    mercari: getPlatformFee('mercari'),
    facebook: getPlatformFee('facebook'),
    offerup: getPlatformFee('offerup'),
    whatnot: getPlatformFee('whatnot'),
    craigslist: 0, // Always free
    letgo: 0, // Merged with OfferUp, local is free
    other: 0, // Custom - user enters manually
  };
}

/**
 * Calculate platform fee amount for a sale
 * @param salePrice - The sale price
 * @param platform - The sales platform
 * @returns The fee amount in dollars
 */
export function calculatePlatformFee(salePrice: number, platform: SalesPlatform | string): number {
  const feePercent = useAppSettingsStore.getState().getPlatformFee(platform);
  return Math.round((salePrice * feePercent / 100) * 100) / 100; // Round to cents
}

/**
 * Calculate mileage deduction for a trip
 * @param miles - Number of miles
 * @returns The deduction amount in dollars
 */
export function calculateMileageDeduction(miles: number): number {
  const rate = useAppSettingsStore.getState().getMileageRate();
  return Math.round((miles * rate) * 100) / 100; // Round to cents
}
