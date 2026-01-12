// Sale Form Schema Tests

// Mock the app settings store before importing the schema
jest.mock('@/src/stores/admin-store', () => ({
  useAppSettingsStore: {
    getState: () => ({
      getPlatformFee: (platform: string) => {
        // Return default fee percentages for testing
        const fees: Record<string, number> = {
          ebay: 13.25,
          poshmark: 20,
          mercari: 10,
          whatnot: 10, // Updated to match app_settings default
          facebook: 5,
          offerup: 12.9,
        };
        return fees[platform] ?? 0;
      },
      getMileageRate: () => 0.725,
      settingsLoaded: true,
      fetchSettings: jest.fn(),
    }),
  },
}));

import {
  saleFormSchema,
  getDefaultSaleFormValues,
  formatSaleDate,
  formatSalesChannel,
  getUniqueSalesChannels,
  getPriceWarning,
  calculateDiscount,
  calculatePlatformFee,
  calculateNetProfit,
  getPlatformName,
  getSalesChannelFromPlatform,
  SALES_CHANNEL_SUGGESTIONS,
  PLATFORM_PRESETS,
  PLATFORM_OPTIONS,
} from './sale-form-schema';

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('saleFormSchema', () => {
  const validData = {
    sale_price: 50.00,
    sale_date: '2025-01-01',
    sales_channel: 'Facebook Marketplace',
    buyer_notes: 'Quick sale',
  };

  describe('valid data', () => {
    it('should accept valid sale data', () => {
      const result = saleFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept minimal required data', () => {
      const result = saleFormSchema.safeParse({
        sale_price: 25,
        sale_date: '2025-01-01',
      });
      expect(result.success).toBe(true);
    });

    it('should accept zero sale price (free giveaway)', () => {
      const result = saleFormSchema.safeParse({
        sale_price: 0,
        sale_date: '2025-01-01',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sale_price validation', () => {
    it('should reject missing sale_price', () => {
      const result = saleFormSchema.safeParse({
        sale_date: '2025-01-01',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative sale_price', () => {
      const result = saleFormSchema.safeParse({
        ...validData,
        sale_price: -10,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Sale price cannot be negative');
      }
    });

    it('should reject sale_price exceeding max', () => {
      const result = saleFormSchema.safeParse({
        ...validData,
        sale_price: 1000000,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('999,999.99');
      }
    });

    it('should reject non-numeric sale_price', () => {
      const result = saleFormSchema.safeParse({
        ...validData,
        sale_price: 'fifty',
      });
      expect(result.success).toBe(false);
    });

    it('should accept decimal prices', () => {
      const result = saleFormSchema.safeParse({
        sale_price: 49.99,
        sale_date: '2025-01-01',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sale_date validation', () => {
    it('should reject invalid date format', () => {
      const result = saleFormSchema.safeParse({
        ...validData,
        sale_date: '01-01-2025',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('YYYY-MM-DD');
      }
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const result = saleFormSchema.safeParse({
        ...validData,
        sale_date: futureDateString,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('future');
      }
    });

    it('should accept today date', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = saleFormSchema.safeParse({
        sale_price: 50,
        sale_date: today,
      });
      expect(result.success).toBe(true);
    });

    it('should accept past dates', () => {
      const result = saleFormSchema.safeParse({
        sale_price: 50,
        sale_date: '2020-01-01',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sales_channel validation', () => {
    it('should accept null sales_channel', () => {
      const result = saleFormSchema.safeParse({
        sale_price: 50,
        sale_date: '2025-01-01',
        sales_channel: null,
      });
      expect(result.success).toBe(true);
    });

    it('should transform empty string to null', () => {
      const result = saleFormSchema.safeParse({
        sale_price: 50,
        sale_date: '2025-01-01',
        sales_channel: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sales_channel).toBe(null);
      }
    });

    it('should reject sales_channel exceeding max length', () => {
      const result = saleFormSchema.safeParse({
        ...validData,
        sales_channel: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100 characters');
      }
    });

    it('should trim whitespace', () => {
      const result = saleFormSchema.safeParse({
        sale_price: 50,
        sale_date: '2025-01-01',
        sales_channel: '  Facebook Marketplace  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sales_channel).toBe('Facebook Marketplace');
      }
    });
  });

  describe('buyer_notes validation', () => {
    it('should accept null buyer_notes', () => {
      const result = saleFormSchema.safeParse({
        sale_price: 50,
        sale_date: '2025-01-01',
        buyer_notes: null,
      });
      expect(result.success).toBe(true);
    });

    it('should transform empty string to null', () => {
      const result = saleFormSchema.safeParse({
        sale_price: 50,
        sale_date: '2025-01-01',
        buyer_notes: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.buyer_notes).toBe(null);
      }
    });

    it('should reject buyer_notes exceeding max length', () => {
      const result = saleFormSchema.safeParse({
        ...validData,
        buyer_notes: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 characters');
      }
    });
  });
});

// ============================================================================
// getDefaultSaleFormValues Tests
// ============================================================================

describe('getDefaultSaleFormValues', () => {
  it('should return today date', () => {
    const today = new Date().toISOString().split('T')[0];
    const defaults = getDefaultSaleFormValues();
    expect(defaults.sale_date).toBe(today);
  });

  it('should use listing price as default sale price', () => {
    const defaults = getDefaultSaleFormValues(75.50);
    expect(defaults.sale_price).toBe(75.50);
  });

  it('should use 0 when listing price is null', () => {
    const defaults = getDefaultSaleFormValues(null);
    expect(defaults.sale_price).toBe(0);
  });

  it('should use 0 when listing price is undefined', () => {
    const defaults = getDefaultSaleFormValues();
    expect(defaults.sale_price).toBe(0);
  });

  it('should set optional fields to null', () => {
    const defaults = getDefaultSaleFormValues();
    expect(defaults.sales_channel).toBe(null);
    expect(defaults.buyer_notes).toBe(null);
  });
});

// ============================================================================
// formatSaleDate Tests
// ============================================================================

describe('formatSaleDate', () => {
  it('should format date correctly', () => {
    const result = formatSaleDate('2025-01-15');
    expect(result).toBe('Jan 15, 2025');
  });

  it('should handle different months', () => {
    expect(formatSaleDate('2025-06-01')).toBe('Jun 1, 2025');
    expect(formatSaleDate('2025-12-25')).toBe('Dec 25, 2025');
  });
});

// ============================================================================
// formatSalesChannel Tests
// ============================================================================

describe('formatSalesChannel', () => {
  it('should return channel name as-is', () => {
    expect(formatSalesChannel('Facebook Marketplace')).toBe('Facebook Marketplace');
  });

  it('should return "Not specified" for null', () => {
    expect(formatSalesChannel(null)).toBe('Not specified');
  });

  it('should return "Not specified" for empty string', () => {
    expect(formatSalesChannel('')).toBe('Not specified');
  });

  it('should return "Not specified" for whitespace only', () => {
    expect(formatSalesChannel('   ')).toBe('Not specified');
  });
});

// ============================================================================
// getUniqueSalesChannels Tests
// ============================================================================

describe('getUniqueSalesChannels', () => {
  it('should include all suggestions', () => {
    const result = getUniqueSalesChannels([]);
    SALES_CHANNEL_SUGGESTIONS.forEach(channel => {
      expect(result).toContain(channel);
    });
  });

  it('should add unique channels from items', () => {
    const items = [
      { sales_channel: 'Custom Channel' },
      { sales_channel: 'Another Channel' },
    ];
    const result = getUniqueSalesChannels(items);
    expect(result).toContain('Custom Channel');
    expect(result).toContain('Another Channel');
  });

  it('should deduplicate channels', () => {
    const items = [
      { sales_channel: 'Facebook Marketplace' },
      { sales_channel: 'Facebook Marketplace' },
    ];
    const result = getUniqueSalesChannels(items);
    const fbCount = result.filter(c => c === 'Facebook Marketplace').length;
    expect(fbCount).toBe(1);
  });

  it('should filter out null channels', () => {
    const items = [
      { sales_channel: null },
      { sales_channel: 'eBay' },
    ];
    const result = getUniqueSalesChannels(items);
    expect(result).not.toContain(null);
  });

  it('should sort alphabetically', () => {
    const result = getUniqueSalesChannels([]);
    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });
});

// ============================================================================
// getPriceWarning Tests
// ============================================================================

describe('getPriceWarning', () => {
  it('should return null when no listing price', () => {
    expect(getPriceWarning(50, null)).toBe(null);
  });

  it('should return null when listing price is 0', () => {
    expect(getPriceWarning(50, 0)).toBe(null);
  });

  it('should return null for reasonable price differences', () => {
    expect(getPriceWarning(80, 100)).toBe(null); // 20% discount
    expect(getPriceWarning(120, 100)).toBe(null); // 20% above
  });

  it('should warn when sale price is 50%+ above listing', () => {
    const warning = getPriceWarning(160, 100);
    expect(warning).toContain('60%');
    expect(warning).toContain('above');
  });

  it('should warn when sale price is 50%+ below listing', () => {
    const warning = getPriceWarning(40, 100);
    expect(warning).toContain('60%');
    expect(warning).toContain('below');
  });

  it('should not warn at exactly 50% difference', () => {
    expect(getPriceWarning(50, 100)).toBe(null); // 50% below
    expect(getPriceWarning(150, 100)).toBe(null); // 50% above
  });
});

// ============================================================================
// calculateDiscount Tests
// ============================================================================

describe('calculateDiscount', () => {
  it('should return null when no listing price', () => {
    expect(calculateDiscount(50, null)).toBe(null);
  });

  it('should return null when listing price is 0', () => {
    expect(calculateDiscount(50, 0)).toBe(null);
  });

  it('should calculate discount correctly', () => {
    const result = calculateDiscount(80, 100);
    expect(result).toEqual({ amount: 20, percentage: 20 });
  });

  it('should handle negative discount (premium)', () => {
    const result = calculateDiscount(120, 100);
    expect(result).toEqual({ amount: -20, percentage: -20 });
  });

  it('should handle zero discount', () => {
    const result = calculateDiscount(100, 100);
    expect(result).toEqual({ amount: 0, percentage: 0 });
  });

  it('should calculate large discounts', () => {
    const result = calculateDiscount(25, 100);
    expect(result).toEqual({ amount: 75, percentage: 75 });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('SALES_CHANNEL_SUGGESTIONS', () => {
  it('should include common channels', () => {
    expect(SALES_CHANNEL_SUGGESTIONS).toContain('Facebook Marketplace');
    expect(SALES_CHANNEL_SUGGESTIONS).toContain('eBay');
    expect(SALES_CHANNEL_SUGGESTIONS).toContain('Mercari');
  });

  it('should not be empty', () => {
    expect(SALES_CHANNEL_SUGGESTIONS.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Platform Fee Tests (Phase 8)
// ============================================================================

describe('PLATFORM_PRESETS', () => {
  it('should have all expected platforms', () => {
    expect(PLATFORM_PRESETS).toHaveProperty('ebay');
    expect(PLATFORM_PRESETS).toHaveProperty('poshmark');
    expect(PLATFORM_PRESETS).toHaveProperty('mercari');
    expect(PLATFORM_PRESETS).toHaveProperty('facebook');
    expect(PLATFORM_PRESETS).toHaveProperty('offerup');
    expect(PLATFORM_PRESETS).toHaveProperty('craigslist');
    expect(PLATFORM_PRESETS).toHaveProperty('other');
  });

  it('should have correct eBay rate (13.25%)', () => {
    expect(PLATFORM_PRESETS.ebay.rate).toBe(0.1325);
    expect(PLATFORM_PRESETS.ebay.hasShippedRate).toBe(false);
  });

  it('should have correct Poshmark rate (20%)', () => {
    expect(PLATFORM_PRESETS.poshmark.rate).toBe(0.20);
  });

  it('should have correct Facebook rates (0% local, 5% shipped)', () => {
    expect(PLATFORM_PRESETS.facebook.rate).toBe(0);
    expect(PLATFORM_PRESETS.facebook.rateShipped).toBe(0.05);
    expect(PLATFORM_PRESETS.facebook.hasShippedRate).toBe(true);
  });

  it('should have correct OfferUp rates (0% local, 12.9% shipped)', () => {
    expect(PLATFORM_PRESETS.offerup.rate).toBe(0);
    expect(PLATFORM_PRESETS.offerup.rateShipped).toBe(0.129);
    expect(PLATFORM_PRESETS.offerup.hasShippedRate).toBe(true);
  });

  it('should mark "other" as manual entry', () => {
    expect(PLATFORM_PRESETS.other.isManual).toBe(true);
  });
});

describe('PLATFORM_OPTIONS', () => {
  it('should have options for all platforms', () => {
    expect(PLATFORM_OPTIONS.length).toBe(9);
    expect(PLATFORM_OPTIONS.map(o => o.value)).toEqual([
      'ebay', 'poshmark', 'mercari', 'whatnot', 'facebook', 'offerup', 'letgo', 'craigslist', 'other'
    ]);
  });

  it('should have labels and descriptions', () => {
    PLATFORM_OPTIONS.forEach(option => {
      expect(option.label).toBeTruthy();
      expect(option.description).toBeTruthy();
    });
  });
});

describe('calculatePlatformFee', () => {
  it('should return 0 for null platform', () => {
    expect(calculatePlatformFee(100, null)).toBe(0);
  });

  it('should return 0 for zero sale price', () => {
    expect(calculatePlatformFee(0, 'ebay')).toBe(0);
  });

  it('should return 0 for negative sale price', () => {
    expect(calculatePlatformFee(-50, 'ebay')).toBe(0);
  });

  it('should calculate eBay fee correctly (13.25%)', () => {
    expect(calculatePlatformFee(100, 'ebay')).toBe(13.25);
    expect(calculatePlatformFee(50, 'ebay')).toBe(6.63); // Rounded to 2 decimals
  });

  it('should calculate Poshmark fee correctly (20%)', () => {
    expect(calculatePlatformFee(100, 'poshmark')).toBe(20);
    expect(calculatePlatformFee(75, 'poshmark')).toBe(15);
  });

  it('should calculate Mercari fee correctly (10%)', () => {
    expect(calculatePlatformFee(100, 'mercari')).toBe(10);
  });

  it('should calculate Whatnot fee correctly (10%)', () => {
    // Note: Whatnot fee is now configurable via app_settings, default is 10%
    expect(calculatePlatformFee(100, 'whatnot')).toBe(10);
    expect(calculatePlatformFee(50, 'whatnot')).toBe(5);
  });

  it('should return 0 for Craigslist (free)', () => {
    expect(calculatePlatformFee(100, 'craigslist')).toBe(0);
  });

  it('should return 0 for Facebook local sale', () => {
    expect(calculatePlatformFee(100, 'facebook', false)).toBe(0);
  });

  it('should calculate Facebook shipped fee correctly (5%)', () => {
    expect(calculatePlatformFee(100, 'facebook', true)).toBe(5);
  });

  it('should return 0 for OfferUp local sale', () => {
    expect(calculatePlatformFee(100, 'offerup', false)).toBe(0);
  });

  it('should calculate OfferUp shipped fee correctly (12.9%)', () => {
    expect(calculatePlatformFee(100, 'offerup', true)).toBe(12.9);
  });

  it('should return 0 for LetGo local sale', () => {
    expect(calculatePlatformFee(100, 'letgo', false)).toBe(0);
  });

  it('should calculate LetGo shipped fee correctly (12.9%)', () => {
    expect(calculatePlatformFee(100, 'letgo', true)).toBe(12.9);
  });

  it('should return 0 for "other" platform', () => {
    expect(calculatePlatformFee(100, 'other')).toBe(0);
  });
});

describe('calculateNetProfit', () => {
  it('should calculate profit with just sale price and cost', () => {
    expect(calculateNetProfit(100, 50, null, null)).toBe(50);
  });

  it('should deduct platform fee', () => {
    expect(calculateNetProfit(100, 50, 10, null)).toBe(40);
  });

  it('should deduct shipping cost', () => {
    expect(calculateNetProfit(100, 50, null, 15)).toBe(35);
  });

  it('should deduct both platform fee and shipping', () => {
    expect(calculateNetProfit(100, 50, 10, 15)).toBe(25);
  });

  it('should handle null allocated cost as 0', () => {
    expect(calculateNetProfit(100, null, 10, 5)).toBe(85);
  });

  it('should handle negative profit (loss)', () => {
    expect(calculateNetProfit(50, 100, 10, 5)).toBe(-65);
  });
});

describe('getPlatformName', () => {
  it('should return platform name for valid platform', () => {
    expect(getPlatformName('ebay')).toBe('eBay');
    expect(getPlatformName('facebook')).toBe('Facebook Marketplace');
    expect(getPlatformName('poshmark')).toBe('Poshmark');
  });

  it('should return "Not specified" for null', () => {
    expect(getPlatformName(null)).toBe('Not specified');
  });
});

describe('getSalesChannelFromPlatform', () => {
  it('should return platform name for valid platform', () => {
    expect(getSalesChannelFromPlatform('ebay')).toBe('eBay');
    expect(getSalesChannelFromPlatform('facebook')).toBe('Facebook Marketplace');
  });

  it('should return null for null platform', () => {
    expect(getSalesChannelFromPlatform(null)).toBe(null);
  });
});

// ============================================================================
// Schema Platform Field Validation (Phase 8)
// ============================================================================

describe('saleFormSchema - platform fields', () => {
  it('should accept valid platform', () => {
    const result = saleFormSchema.safeParse({
      sale_price: 100,
      sale_date: '2025-01-01',
      platform: 'ebay',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform).toBe('ebay');
    }
  });

  it('should accept null platform', () => {
    const result = saleFormSchema.safeParse({
      sale_price: 100,
      sale_date: '2025-01-01',
      platform: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform).toBe(null);
    }
  });

  it('should reject invalid platform', () => {
    const result = saleFormSchema.safeParse({
      sale_price: 100,
      sale_date: '2025-01-01',
      platform: 'invalid_platform',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid platform_fee', () => {
    const result = saleFormSchema.safeParse({
      sale_price: 100,
      sale_date: '2025-01-01',
      platform_fee: 13.25,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform_fee).toBe(13.25);
    }
  });

  it('should reject negative platform_fee', () => {
    const result = saleFormSchema.safeParse({
      sale_price: 100,
      sale_date: '2025-01-01',
      platform_fee: -5,
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid shipping_cost', () => {
    const result = saleFormSchema.safeParse({
      sale_price: 100,
      sale_date: '2025-01-01',
      shipping_cost: 8.50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shipping_cost).toBe(8.50);
    }
  });

  it('should reject negative shipping_cost', () => {
    const result = saleFormSchema.safeParse({
      sale_price: 100,
      sale_date: '2025-01-01',
      shipping_cost: -3,
    });
    expect(result.success).toBe(false);
  });

  it('should accept all new fields together', () => {
    const result = saleFormSchema.safeParse({
      sale_price: 100,
      sale_date: '2025-01-01',
      platform: 'ebay',
      platform_fee: 13.25,
      shipping_cost: 8.50,
      sales_channel: 'eBay',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform).toBe('ebay');
      expect(result.data.platform_fee).toBe(13.25);
      expect(result.data.shipping_cost).toBe(8.50);
    }
  });
});

describe('getDefaultSaleFormValues - new fields', () => {
  it('should include platform as null', () => {
    const defaults = getDefaultSaleFormValues();
    expect(defaults.platform).toBe(null);
  });

  it('should include platform_fee as null', () => {
    const defaults = getDefaultSaleFormValues();
    expect(defaults.platform_fee).toBe(null);
  });

  it('should include shipping_cost as null', () => {
    const defaults = getDefaultSaleFormValues();
    expect(defaults.shipping_cost).toBe(null);
  });
});
