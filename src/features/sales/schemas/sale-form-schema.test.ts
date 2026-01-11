// Sale Form Schema Tests
import {
  saleFormSchema,
  getDefaultSaleFormValues,
  formatSaleDate,
  formatSalesChannel,
  getUniqueSalesChannels,
  getPriceWarning,
  calculateDiscount,
  SALES_CHANNEL_SUGGESTIONS,
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
