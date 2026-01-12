// App Settings Store Tests - Phase 8G
import { useAppSettingsStore, calculatePlatformFee, calculateMileageDeduction } from '../admin-store';
import { supabase } from '@/src/lib/supabase';
import { APP_SETTING_DEFAULTS, APP_SETTING_KEYS } from '@/src/types/database';

// Mock Supabase
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockSettingsData = [
  { key: 'irs_mileage_rate', value: 0.725 },
  { key: 'platform_fee_ebay', value: 13.25 },
  { key: 'platform_fee_poshmark', value: 20 },
  { key: 'platform_fee_mercari', value: 10 },
  { key: 'platform_fee_facebook', value: 5 },
  { key: 'platform_fee_offerup', value: 12.9 },
  { key: 'platform_fee_whatnot', value: 10 },
  { key: 'affiliate_commission_rate', value: 25 },
  { key: 'trial_duration_days', value: 7 },
  { key: 'default_stale_threshold', value: 30 },
];

describe('AppSettingsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const defaultSettings = Object.fromEntries(
      APP_SETTING_KEYS.map(key => [key, APP_SETTING_DEFAULTS[key].value])
    );
    useAppSettingsStore.setState({
      settings: defaultSettings as Record<typeof APP_SETTING_KEYS[number], number>,
      settingsLoaded: false,
      lastFetched: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settingsLoaded).toBe(false);
      expect(state.lastFetched).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should have default values for all settings', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.irs_mileage_rate).toBe(0.725);
      expect(state.settings.platform_fee_ebay).toBe(13.25);
      expect(state.settings.platform_fee_poshmark).toBe(20);
      expect(state.settings.platform_fee_mercari).toBe(10);
      expect(state.settings.platform_fee_facebook).toBe(5);
      expect(state.settings.platform_fee_offerup).toBe(12.9);
      expect(state.settings.platform_fee_whatnot).toBe(10);
      expect(state.settings.affiliate_commission_rate).toBe(25);
      expect(state.settings.trial_duration_days).toBe(7);
      expect(state.settings.default_stale_threshold).toBe(30);
    });
  });

  describe('fetchSettings', () => {
    it('should fetch settings successfully', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: mockSettingsData,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await useAppSettingsStore.getState().fetchSettings();

      const state = useAppSettingsStore.getState();
      expect(state.settingsLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetched).not.toBeNull();
      expect(state.settings.irs_mileage_rate).toBe(0.725);
      expect(state.settings.platform_fee_ebay).toBe(13.25);
    });

    it('should not refetch if recently loaded (within 5 minutes)', async () => {
      // Set up as if already fetched 2 minutes ago
      useAppSettingsStore.setState({
        settingsLoaded: true,
        lastFetched: new Date().toISOString(),
      });

      const mockSelect = jest.fn();
      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await useAppSettingsStore.getState().fetchSettings();

      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('should refetch if cache expired (over 5 minutes)', async () => {
      // Set up as if fetched 10 minutes ago
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      useAppSettingsStore.setState({
        settingsLoaded: true,
        lastFetched: tenMinutesAgo,
      });

      const mockSelect = jest.fn().mockResolvedValue({
        data: mockSettingsData,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await useAppSettingsStore.getState().fetchSettings();

      expect(mockSelect).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await useAppSettingsStore.getState().fetchSettings();

      const state = useAppSettingsStore.getState();
      // Should still mark as loaded (use defaults)
      expect(state.settingsLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
      // Should have default values
      expect(state.settings.irs_mileage_rate).toBe(0.725);
    });

    it('should handle empty data response', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await useAppSettingsStore.getState().fetchSettings();

      const state = useAppSettingsStore.getState();
      expect(state.settingsLoaded).toBe(true);
      // Should retain defaults
      expect(state.settings.irs_mileage_rate).toBe(0.725);
    });

    it('should parse string values to numbers', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [
          { key: 'irs_mileage_rate', value: '0.80' }, // String value
          { key: 'platform_fee_ebay', value: 15 }, // Number value
        ],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await useAppSettingsStore.getState().fetchSettings();

      const state = useAppSettingsStore.getState();
      expect(state.settings.irs_mileage_rate).toBe(0.80);
      expect(state.settings.platform_fee_ebay).toBe(15);
    });

    it('should ignore invalid setting keys', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [
          { key: 'invalid_key', value: 999 },
          { key: 'irs_mileage_rate', value: 0.80 },
        ],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await useAppSettingsStore.getState().fetchSettings();

      const state = useAppSettingsStore.getState();
      expect(state.settings.irs_mileage_rate).toBe(0.80);
      expect((state.settings as Record<string, unknown>)['invalid_key']).toBeUndefined();
    });
  });

  describe('getSetting', () => {
    it('should return setting value', () => {
      useAppSettingsStore.setState({
        settings: {
          ...useAppSettingsStore.getState().settings,
          irs_mileage_rate: 0.80,
        },
      });

      const rate = useAppSettingsStore.getState().getSetting('irs_mileage_rate');
      expect(rate).toBe(0.80);
    });

    it('should return default for missing setting', () => {
      const rate = useAppSettingsStore.getState().getSetting('irs_mileage_rate');
      expect(rate).toBe(0.725); // Default from APP_SETTING_DEFAULTS
    });
  });

  describe('getPlatformFee', () => {
    it('should return correct fee for eBay', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('ebay');
      expect(fee).toBe(13.25);
    });

    it('should return correct fee for Poshmark', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('poshmark');
      expect(fee).toBe(20);
    });

    it('should return correct fee for Mercari', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('mercari');
      expect(fee).toBe(10);
    });

    it('should return correct fee for Facebook', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('facebook');
      expect(fee).toBe(5);
    });

    it('should return correct fee for OfferUp', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('offerup');
      expect(fee).toBe(12.9);
    });

    it('should return correct fee for Whatnot', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('whatnot');
      expect(fee).toBe(10);
    });

    it('should return 0 for Craigslist', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('craigslist');
      expect(fee).toBe(0);
    });

    it('should return 0 for LetGo', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('letgo');
      expect(fee).toBe(0);
    });

    it('should return 0 for Other/Custom', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('other');
      expect(fee).toBe(0);
    });

    it('should return 0 for unknown platform', () => {
      const fee = useAppSettingsStore.getState().getPlatformFee('unknown_platform');
      expect(fee).toBe(0);
    });
  });

  describe('getMileageRate', () => {
    it('should return current IRS mileage rate', () => {
      const rate = useAppSettingsStore.getState().getMileageRate();
      expect(rate).toBe(0.725);
    });

    it('should return updated rate after fetch', async () => {
      useAppSettingsStore.setState({
        settings: {
          ...useAppSettingsStore.getState().settings,
          irs_mileage_rate: 0.80,
        },
      });

      const rate = useAppSettingsStore.getState().getMileageRate();
      expect(rate).toBe(0.80);
    });
  });

  describe('getTrialDuration', () => {
    it('should return trial duration days', () => {
      const days = useAppSettingsStore.getState().getTrialDuration();
      expect(days).toBe(7);
    });
  });

  describe('getDefaultStaleThreshold', () => {
    it('should return default stale threshold days', () => {
      const days = useAppSettingsStore.getState().getDefaultStaleThreshold();
      expect(days).toBe(30);
    });
  });

  describe('refreshSettings', () => {
    it('should force fetch even if recently loaded', async () => {
      // Set up as if already fetched
      useAppSettingsStore.setState({
        settingsLoaded: true,
        lastFetched: new Date().toISOString(),
      });

      const mockSelect = jest.fn().mockResolvedValue({
        data: mockSettingsData,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await useAppSettingsStore.getState().refreshSettings();

      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAppSettingsStore.setState({
        error: 'Some error message',
      });

      useAppSettingsStore.getState().clearError();

      expect(useAppSettingsStore.getState().error).toBeNull();
    });
  });
});

describe('calculatePlatformFee', () => {
  beforeEach(() => {
    // Reset to defaults
    const defaultSettings = Object.fromEntries(
      APP_SETTING_KEYS.map(key => [key, APP_SETTING_DEFAULTS[key].value])
    );
    useAppSettingsStore.setState({
      settings: defaultSettings as Record<typeof APP_SETTING_KEYS[number], number>,
    });
  });

  it('should calculate eBay fee correctly', () => {
    const fee = calculatePlatformFee(100, 'ebay');
    expect(fee).toBe(13.25); // 100 * 13.25%
  });

  it('should calculate Poshmark fee correctly', () => {
    const fee = calculatePlatformFee(50, 'poshmark');
    expect(fee).toBe(10); // 50 * 20%
  });

  it('should round to cents', () => {
    const fee = calculatePlatformFee(33.33, 'ebay');
    expect(fee).toBe(4.42); // 33.33 * 0.1325 = 4.416225 → 4.42
  });

  it('should return 0 for platforms with no fee', () => {
    const fee = calculatePlatformFee(100, 'craigslist');
    expect(fee).toBe(0);
  });

  it('should return 0 for zero sale price', () => {
    const fee = calculatePlatformFee(0, 'ebay');
    expect(fee).toBe(0);
  });
});

describe('calculateMileageDeduction', () => {
  beforeEach(() => {
    // Reset to defaults
    const defaultSettings = Object.fromEntries(
      APP_SETTING_KEYS.map(key => [key, APP_SETTING_DEFAULTS[key].value])
    );
    useAppSettingsStore.setState({
      settings: defaultSettings as Record<typeof APP_SETTING_KEYS[number], number>,
    });
  });

  it('should calculate deduction correctly', () => {
    const deduction = calculateMileageDeduction(100);
    expect(deduction).toBe(72.5); // 100 * 0.725
  });

  it('should round to cents', () => {
    const deduction = calculateMileageDeduction(33);
    expect(deduction).toBe(23.93); // 33 * 0.725 = 23.925 → 23.93
  });

  it('should return 0 for zero miles', () => {
    const deduction = calculateMileageDeduction(0);
    expect(deduction).toBe(0);
  });

  it('should handle decimal miles', () => {
    const deduction = calculateMileageDeduction(10.5);
    expect(deduction).toBe(7.61); // 10.5 * 0.725 = 7.6125 → 7.61
  });
});
