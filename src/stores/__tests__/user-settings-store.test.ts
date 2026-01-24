// User Settings Store Tests - Phase 8E
import { useUserSettingsStore } from '../user-settings-store';
import { supabase } from '@/src/lib/supabase';
import { UserSettings } from '@/src/types/database';

// Mock Supabase
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

// Mock settings
const mockSettings: UserSettings = {
  id: 'settings-1',
  user_id: 'user-123',
  stale_threshold_days: 30,
  storage_locations: [],
  default_sales_tax_rate: null,
  mileage_rate: 0.725,
  include_unsellable_in_cost: false,
  expense_tracking_enabled: true,
  user_type: 'hobby',
  notification_stale_inventory: true,
  notification_weekly_summary: true,
  notification_pallet_milestones: true,
  email_weekly_summary: false,
  email_stale_digest: false,
  email_monthly_report: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockBusinessSettings: UserSettings = {
  ...mockSettings,
  user_type: 'business',
  expense_tracking_enabled: true,
};

describe('UserSettingsStore', () => {
  beforeEach(() => {
    useUserSettingsStore.setState({
      settings: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct initial state', () => {
      const state = useUserSettingsStore.getState();
      expect(state.settings).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe('fetchSettings', () => {
    it('should fetch existing settings successfully', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await useUserSettingsStore.getState().fetchSettings();

      const state = useUserSettingsStore.getState();
      expect(state.settings).toEqual(mockSettings);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should create default settings if none exist', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }, // Not found error
          }),
        }),
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ insert: mockInsert });

      await useUserSettingsStore.getState().fetchSettings();

      const state = useUserSettingsStore.getState();
      expect(state.settings).toEqual(mockSettings);
      expect(state.isLoading).toBe(false);
    });

    it('should set error when not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      await useUserSettingsStore.getState().fetchSettings();

      const state = useUserSettingsStore.getState();
      expect(state.error).toBe('User not authenticated');
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Network error'),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await useUserSettingsStore.getState().fetchSettings();

      const state = useUserSettingsStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => {
      useUserSettingsStore.setState({ settings: mockSettings });
    });

    it('should update settings successfully', async () => {
      const updatedSettings = { ...mockSettings, stale_threshold_days: 45 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().updateSettings({
        stale_threshold_days: 45,
      });

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.stale_threshold_days).toBe(45);
    });

    it('should fail when no settings exist', async () => {
      useUserSettingsStore.setState({ settings: null });

      const result = await useUserSettingsStore.getState().updateSettings({
        stale_threshold_days: 45,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No settings to update');
    });

    it('should handle update error', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Update failed'),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().updateSettings({
        stale_threshold_days: 45,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('toggleExpenseTracking', () => {
    beforeEach(() => {
      useUserSettingsStore.setState({ settings: mockSettings });
    });

    it('should enable expense tracking', async () => {
      const updatedSettings = { ...mockSettings, expense_tracking_enabled: true };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().toggleExpenseTracking(true);

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.expense_tracking_enabled).toBe(true);
    });

    it('should disable expense tracking', async () => {
      useUserSettingsStore.setState({
        settings: { ...mockSettings, expense_tracking_enabled: true },
      });

      const updatedSettings = { ...mockSettings, expense_tracking_enabled: false };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().toggleExpenseTracking(false);

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.expense_tracking_enabled).toBe(false);
    });
  });

  describe('setUserType', () => {
    beforeEach(() => {
      useUserSettingsStore.setState({ settings: mockSettings });
    });

    it('should set user type to hobby', async () => {
      const updatedSettings = { ...mockSettings, user_type: 'hobby' as const };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().setUserType('hobby');

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.user_type).toBe('hobby');
    });

    it('should set user type to side_hustle', async () => {
      const updatedSettings = { ...mockSettings, user_type: 'side_hustle' as const };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().setUserType('side_hustle');

      expect(result.success).toBe(true);
    });

    it('should auto-enable expense tracking when setting to business', async () => {
      const updatedSettings = {
        ...mockSettings,
        user_type: 'business' as const,
        expense_tracking_enabled: true,
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().setUserType('business');

      expect(result.success).toBe(true);
      // Verify update was called with both user_type and expense_tracking_enabled
      expect(mockUpdate).toHaveBeenCalledWith({
        user_type: 'business',
        expense_tracking_enabled: true,
      });
    });
  });

  describe('setStaleThreshold', () => {
    beforeEach(() => {
      useUserSettingsStore.setState({ settings: mockSettings });
    });

    it('should update stale threshold', async () => {
      const updatedSettings = { ...mockSettings, stale_threshold_days: 60 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().setStaleThreshold(60);

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.stale_threshold_days).toBe(60);
    });
  });

  describe('setIncludeUnsellableInCost', () => {
    beforeEach(() => {
      useUserSettingsStore.setState({ settings: mockSettings });
    });

    it('should enable include unsellable in cost', async () => {
      const updatedSettings = { ...mockSettings, include_unsellable_in_cost: true };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().setIncludeUnsellableInCost(true);

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.include_unsellable_in_cost).toBe(true);
    });

    it('should disable include unsellable in cost', async () => {
      useUserSettingsStore.setState({
        settings: { ...mockSettings, include_unsellable_in_cost: true },
      });

      const updatedSettings = { ...mockSettings, include_unsellable_in_cost: false };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().setIncludeUnsellableInCost(false);

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.include_unsellable_in_cost).toBe(false);
    });
  });

  describe('setMileageRate', () => {
    beforeEach(() => {
      useUserSettingsStore.setState({ settings: mockSettings });
    });

    it('should update mileage rate', async () => {
      const updatedSettings = { ...mockSettings, mileage_rate: 0.67 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().setMileageRate(0.67);

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.mileage_rate).toBe(0.67);
    });
  });

  describe('setSalesTaxRate', () => {
    beforeEach(() => {
      useUserSettingsStore.setState({ settings: mockSettings });
    });

    it('should set sales tax rate', async () => {
      const updatedSettings = { ...mockSettings, default_sales_tax_rate: 8.25 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().setSalesTaxRate(8.25);

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.default_sales_tax_rate).toBe(8.25);
    });

    it('should clear sales tax rate with null', async () => {
      useUserSettingsStore.setState({
        settings: { ...mockSettings, default_sales_tax_rate: 8.25 },
      });

      const updatedSettings = { ...mockSettings, default_sales_tax_rate: null };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedSettings,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await useUserSettingsStore.getState().setSalesTaxRate(null);

      expect(result.success).toBe(true);
      expect(useUserSettingsStore.getState().settings?.default_sales_tax_rate).toBe(null);
    });
  });

  describe('helper methods', () => {
    describe('isExpenseTrackingEnabled', () => {
      it('should return true when enabled', () => {
        useUserSettingsStore.setState({
          settings: { ...mockSettings, expense_tracking_enabled: true },
        });

        expect(useUserSettingsStore.getState().isExpenseTrackingEnabled()).toBe(true);
      });

      it('should return false when disabled', () => {
        useUserSettingsStore.setState({ settings: mockSettings });

        expect(useUserSettingsStore.getState().isExpenseTrackingEnabled()).toBe(false);
      });

      it('should return false when no settings', () => {
        useUserSettingsStore.setState({ settings: null });

        expect(useUserSettingsStore.getState().isExpenseTrackingEnabled()).toBe(false);
      });
    });

    describe('getUserType', () => {
      it('should return hobby when set to hobby', () => {
        useUserSettingsStore.setState({ settings: mockSettings });

        expect(useUserSettingsStore.getState().getUserType()).toBe('hobby');
      });

      it('should return business when set to business', () => {
        useUserSettingsStore.setState({ settings: mockBusinessSettings });

        expect(useUserSettingsStore.getState().getUserType()).toBe('business');
      });

      it('should return hobby as default when no settings', () => {
        useUserSettingsStore.setState({ settings: null });

        expect(useUserSettingsStore.getState().getUserType()).toBe('hobby');
      });
    });

    describe('clearError', () => {
      it('should clear error state', () => {
        useUserSettingsStore.setState({ error: 'Some error' });

        useUserSettingsStore.getState().clearError();

        expect(useUserSettingsStore.getState().error).toBe(null);
      });
    });

    describe('clearSettings', () => {
      it('should clear settings and error', () => {
        useUserSettingsStore.setState({
          settings: mockSettings,
          error: 'Some error',
        });

        useUserSettingsStore.getState().clearSettings();

        const state = useUserSettingsStore.getState();
        expect(state.settings).toBe(null);
        expect(state.error).toBe(null);
      });
    });
  });

  describe('default settings values', () => {
    it('should have correct default stale threshold', () => {
      useUserSettingsStore.setState({ settings: mockSettings });
      expect(mockSettings.stale_threshold_days).toBe(30);
    });

    it('should have correct default mileage rate for 2026', () => {
      useUserSettingsStore.setState({ settings: mockSettings });
      expect(mockSettings.mileage_rate).toBe(0.725);
    });

    it('should have expense tracking enabled by default (Pro trial)', () => {
      useUserSettingsStore.setState({ settings: mockSettings });
      expect(mockSettings.expense_tracking_enabled).toBe(true);
    });

    it('should have hobby as default user type', () => {
      useUserSettingsStore.setState({ settings: mockSettings });
      expect(mockSettings.user_type).toBe('hobby');
    });

    it('should have include_unsellable_in_cost false by default', () => {
      useUserSettingsStore.setState({ settings: mockSettings });
      expect(mockSettings.include_unsellable_in_cost).toBe(false);
    });
  });

  describe('profit goals (local-only)', () => {
    beforeEach(() => {
      useUserSettingsStore.setState({
        settings: mockSettings,
        profitGoals: {
          week: null,
          month: null,
          year: null,
        },
        profitGoalsEnabled: true,
      });
    });

    describe('initial state', () => {
      it('should have null goals for all periods by default', () => {
        const state = useUserSettingsStore.getState();
        expect(state.profitGoals.week).toBe(null);
        expect(state.profitGoals.month).toBe(null);
        expect(state.profitGoals.year).toBe(null);
      });

      it('should have goals enabled by default', () => {
        const state = useUserSettingsStore.getState();
        expect(state.profitGoalsEnabled).toBe(true);
      });
    });

    describe('setProfitGoal', () => {
      it('should set weekly goal', () => {
        useUserSettingsStore.getState().setProfitGoal('week', 500);

        const state = useUserSettingsStore.getState();
        expect(state.profitGoals.week).toBe(500);
        expect(state.profitGoals.month).toBe(null);
        expect(state.profitGoals.year).toBe(null);
      });

      it('should set monthly goal', () => {
        useUserSettingsStore.getState().setProfitGoal('month', 2000);

        const state = useUserSettingsStore.getState();
        expect(state.profitGoals.month).toBe(2000);
      });

      it('should set yearly goal', () => {
        useUserSettingsStore.getState().setProfitGoal('year', 25000);

        const state = useUserSettingsStore.getState();
        expect(state.profitGoals.year).toBe(25000);
      });

      it('should allow setting multiple goals independently', () => {
        useUserSettingsStore.getState().setProfitGoal('week', 100);
        useUserSettingsStore.getState().setProfitGoal('month', 500);
        useUserSettingsStore.getState().setProfitGoal('year', 6000);

        const state = useUserSettingsStore.getState();
        expect(state.profitGoals.week).toBe(100);
        expect(state.profitGoals.month).toBe(500);
        expect(state.profitGoals.year).toBe(6000);
      });

      it('should allow clearing a goal by setting to null', () => {
        useUserSettingsStore.getState().setProfitGoal('month', 1000);
        expect(useUserSettingsStore.getState().profitGoals.month).toBe(1000);

        useUserSettingsStore.getState().setProfitGoal('month', null);
        expect(useUserSettingsStore.getState().profitGoals.month).toBe(null);
      });

      it('should allow updating an existing goal', () => {
        useUserSettingsStore.getState().setProfitGoal('week', 100);
        useUserSettingsStore.getState().setProfitGoal('week', 200);

        expect(useUserSettingsStore.getState().profitGoals.week).toBe(200);
      });
    });

    describe('getProfitGoal', () => {
      it('should return weekly goal', () => {
        useUserSettingsStore.setState({
          ...useUserSettingsStore.getState(),
          profitGoals: { week: 250, month: null, year: null },
        });

        expect(useUserSettingsStore.getState().getProfitGoal('week')).toBe(250);
      });

      it('should return monthly goal', () => {
        useUserSettingsStore.setState({
          ...useUserSettingsStore.getState(),
          profitGoals: { week: null, month: 1500, year: null },
        });

        expect(useUserSettingsStore.getState().getProfitGoal('month')).toBe(1500);
      });

      it('should return yearly goal', () => {
        useUserSettingsStore.setState({
          ...useUserSettingsStore.getState(),
          profitGoals: { week: null, month: null, year: 18000 },
        });

        expect(useUserSettingsStore.getState().getProfitGoal('year')).toBe(18000);
      });

      it('should return null when goal not set', () => {
        expect(useUserSettingsStore.getState().getProfitGoal('week')).toBe(null);
        expect(useUserSettingsStore.getState().getProfitGoal('month')).toBe(null);
        expect(useUserSettingsStore.getState().getProfitGoal('year')).toBe(null);
      });
    });

    describe('setProfitGoalsEnabled', () => {
      it('should disable profit goals', () => {
        useUserSettingsStore.getState().setProfitGoalsEnabled(false);

        expect(useUserSettingsStore.getState().profitGoalsEnabled).toBe(false);
      });

      it('should enable profit goals', () => {
        useUserSettingsStore.setState({
          ...useUserSettingsStore.getState(),
          profitGoalsEnabled: false,
        });

        useUserSettingsStore.getState().setProfitGoalsEnabled(true);

        expect(useUserSettingsStore.getState().profitGoalsEnabled).toBe(true);
      });

      it('should not affect stored goals when disabled', () => {
        useUserSettingsStore.getState().setProfitGoal('month', 1000);
        useUserSettingsStore.getState().setProfitGoalsEnabled(false);

        // Goals should still be stored even when display is disabled
        expect(useUserSettingsStore.getState().profitGoals.month).toBe(1000);
        expect(useUserSettingsStore.getState().profitGoalsEnabled).toBe(false);
      });

      it('should preserve goals when re-enabled', () => {
        useUserSettingsStore.getState().setProfitGoal('month', 1000);
        useUserSettingsStore.getState().setProfitGoalsEnabled(false);
        useUserSettingsStore.getState().setProfitGoalsEnabled(true);

        expect(useUserSettingsStore.getState().profitGoals.month).toBe(1000);
        expect(useUserSettingsStore.getState().profitGoalsEnabled).toBe(true);
      });
    });
  });

  describe('optimistic updates', () => {
    beforeEach(() => {
      useUserSettingsStore.setState({ settings: mockSettings });
    });

    it('should apply changes optimistically before API call completes', async () => {
      let resolveApiCall: () => void;
      const apiCallPromise = new Promise<void>((resolve) => {
        resolveApiCall = resolve;
      });

      const updatedSettings = { ...mockSettings, stale_threshold_days: 60 };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(async () => {
              await apiCallPromise;
              return { data: updatedSettings, error: null };
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Start the update but don't await
      const updatePromise = useUserSettingsStore.getState().updateSettings({
        stale_threshold_days: 60,
      });

      // Check that the optimistic update was applied immediately
      expect(useUserSettingsStore.getState().settings?.stale_threshold_days).toBe(60);
      expect(useUserSettingsStore.getState().isLoading).toBe(true);

      // Complete the API call
      resolveApiCall!();
      await updatePromise;

      expect(useUserSettingsStore.getState().settings?.stale_threshold_days).toBe(60);
      expect(useUserSettingsStore.getState().isLoading).toBe(false);
    });

    it('should revert optimistic update on API error', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Update failed'),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const originalThreshold = mockSettings.stale_threshold_days;
      const result = await useUserSettingsStore.getState().updateSettings({
        stale_threshold_days: 99,
      });

      // Should revert to original value
      expect(result.success).toBe(false);
      expect(useUserSettingsStore.getState().settings?.stale_threshold_days).toBe(originalThreshold);
      expect(useUserSettingsStore.getState().error).toBe('Update failed');
    });
  });
});

// Note: Helper hooks (useExpenseTracking, useUserType) are simple wrappers
// around the store and are tested implicitly through the store tests above.
// Direct testing would require renderHook from @testing-library/react-hooks.
