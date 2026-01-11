// User Settings Store - Zustand store for user preferences
// Phase 8E: Expense tracking opt-in and user type settings
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { UserSettings, UserType } from '@/src/types/database';

// Default settings for new users
const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  stale_threshold_days: 30,
  storage_locations: [],
  default_sales_tax_rate: null,
  mileage_rate: 0.725, // 2026 IRS rate
  include_unsellable_in_cost: false,
  expense_tracking_enabled: false, // Off by default
  user_type: 'hobby', // Default to hobby flipper
  notification_stale_inventory: true,
  notification_weekly_summary: true,
  notification_pallet_milestones: true,
  email_weekly_summary: false,
  email_stale_digest: false,
  email_monthly_report: false,
};

export interface UserSettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<{ success: boolean; error?: string }>;

  // Expense tracking specific
  toggleExpenseTracking: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  setUserType: (userType: UserType) => Promise<{ success: boolean; error?: string }>;

  // Preferences
  setStaleThreshold: (days: number) => Promise<{ success: boolean; error?: string }>;
  setIncludeUnsellableInCost: (include: boolean) => Promise<{ success: boolean; error?: string }>;
  setMileageRate: (rate: number) => Promise<{ success: boolean; error?: string }>;
  setSalesTaxRate: (rate: number | null) => Promise<{ success: boolean; error?: string }>;

  // Helpers
  isExpenseTrackingEnabled: () => boolean;
  getUserType: () => UserType;
  clearError: () => void;
  clearSettings: () => void;
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set, get) => ({
      settings: null,
      isLoading: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Try to fetch existing settings
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error) {
            // If no settings exist, create default settings
            if (error.code === 'PGRST116') {
              const { data: newSettings, error: insertError } = await supabase
                .from('user_settings')
                .insert({ ...DEFAULT_SETTINGS, user_id: user.id })
                .select()
                .single();

              if (insertError) throw insertError;
              set({ settings: newSettings as UserSettings, isLoading: false });
              return;
            }
            throw error;
          }

          set({ settings: data as UserSettings, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch settings';
          set({ error: message, isLoading: false });
        }
      },

      updateSettings: async (updates) => {
        set({ isLoading: true, error: null });
        try {
          const currentSettings = get().settings;
          if (!currentSettings) throw new Error('No settings to update');

          const { data, error } = await supabase
            .from('user_settings')
            .update(updates)
            .eq('id', currentSettings.id)
            .select()
            .single();

          if (error) throw error;

          set({
            settings: data as UserSettings,
            isLoading: false,
          });
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update settings';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      toggleExpenseTracking: async (enabled) => {
        return get().updateSettings({ expense_tracking_enabled: enabled });
      },

      setUserType: async (userType) => {
        // When switching to business, auto-enable expense tracking
        const updates: Partial<UserSettings> = { user_type: userType };
        if (userType === 'business') {
          updates.expense_tracking_enabled = true;
        }
        return get().updateSettings(updates);
      },

      setStaleThreshold: async (days) => {
        return get().updateSettings({ stale_threshold_days: days });
      },

      setIncludeUnsellableInCost: async (include) => {
        return get().updateSettings({ include_unsellable_in_cost: include });
      },

      setMileageRate: async (rate) => {
        return get().updateSettings({ mileage_rate: rate });
      },

      setSalesTaxRate: async (rate) => {
        return get().updateSettings({ default_sales_tax_rate: rate });
      },

      isExpenseTrackingEnabled: () => {
        return get().settings?.expense_tracking_enabled ?? false;
      },

      getUserType: () => {
        return get().settings?.user_type ?? 'hobby';
      },

      clearError: () => set({ error: null }),

      clearSettings: () => set({ settings: null, error: null }),
    }),
    {
      name: 'user-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

// Helper hooks for common settings checks
export function useExpenseTracking() {
  const { settings, toggleExpenseTracking, isLoading } = useUserSettingsStore();
  return {
    enabled: settings?.expense_tracking_enabled ?? false,
    toggle: toggleExpenseTracking,
    isLoading,
  };
}

export function useUserType() {
  const { settings, setUserType, isLoading } = useUserSettingsStore();
  return {
    userType: settings?.user_type ?? 'hobby',
    setUserType,
    isLoading,
  };
}
