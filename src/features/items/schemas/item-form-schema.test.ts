// Unit tests for Item Form Schema
import {
  itemFormSchema,
  ItemFormData,
  defaultItemFormValues,
  calculateItemProfit,
  calculateItemROI,
  getConditionColor,
  getStatusColor,
  getUniqueStorageLocations,
  getUniqueItemSourceNames,
  getUniqueSalesChannels,
  formatCondition,
  formatStatus,
  ITEM_CONDITION_OPTIONS,
  ITEM_STATUS_OPTIONS,
  SALES_CHANNEL_SUGGESTIONS,
} from './item-form-schema';

describe('itemFormSchema', () => {
  describe('valid data', () => {
    it('should accept valid item data with all fields', () => {
      const validData = {
        name: 'Test Item',
        description: 'A test item description',
        quantity: 5,
        condition: 'new' as const,
        retail_price: 99.99,
        listing_price: 79.99,
        purchase_cost: 25.00,
        storage_location: 'Shelf A',
        status: 'listed' as const,
        barcode: '1234567890',
        source_name: 'Thrift Store',
        notes: 'Some notes about this item',
        pallet_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = itemFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Item');
        expect(result.data.quantity).toBe(5);
        expect(result.data.condition).toBe('new');
      }
    });

    it('should accept minimal valid data (only required fields)', () => {
      const minimalData = {
        name: 'Minimal Item',
      };

      const result = itemFormSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Minimal Item');
        expect(result.data.quantity).toBe(1); // Default
        expect(result.data.condition).toBe('used_good'); // Default
        expect(result.data.status).toBe('unprocessed'); // Default
      }
    });

    it('should transform empty strings to null for optional fields', () => {
      const data = {
        name: 'Test Item',
        description: '',
        storage_location: '',
        barcode: '',
        source_name: '',
        notes: '',
      };

      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
        expect(result.data.storage_location).toBeNull();
        expect(result.data.barcode).toBeNull();
        expect(result.data.source_name).toBeNull();
        expect(result.data.notes).toBeNull();
      }
    });

    it('should trim whitespace from string fields', () => {
      const data = {
        name: '  Trimmed Name  ',
        description: '  Some description  ',
        storage_location: '  Shelf B  ',
      };

      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Trimmed Name');
        expect(result.data.description).toBe('Some description');
        expect(result.data.storage_location).toBe('Shelf B');
      }
    });
  });

  describe('name validation', () => {
    it('should reject empty name', () => {
      const data = { name: '' };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Item name is required');
      }
    });

    it('should reject name with only whitespace', () => {
      const data = { name: '   ' };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject name exceeding 100 characters', () => {
      const data = { name: 'a'.repeat(101) };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be 100 characters or less');
      }
    });

    it('should accept name at exactly 100 characters', () => {
      const data = { name: 'a'.repeat(100) };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('quantity validation', () => {
    it('should reject quantity of 0', () => {
      const data = { name: 'Test', quantity: 0 };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Quantity must be at least 1');
      }
    });

    it('should reject negative quantity', () => {
      const data = { name: 'Test', quantity: -1 };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject quantity exceeding 9999', () => {
      const data = { name: 'Test', quantity: 10000 };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Quantity cannot exceed 9999');
      }
    });

    it('should reject non-integer quantity', () => {
      const data = { name: 'Test', quantity: 1.5 };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Quantity must be a whole number');
      }
    });

    it('should accept valid quantity at boundaries', () => {
      expect(itemFormSchema.safeParse({ name: 'Test', quantity: 1 }).success).toBe(true);
      expect(itemFormSchema.safeParse({ name: 'Test', quantity: 9999 }).success).toBe(true);
    });
  });

  describe('condition validation', () => {
    it('should accept all valid condition values', () => {
      const conditions = ['new', 'open_box', 'used_good', 'used_fair', 'damaged', 'for_parts', 'unsellable'];
      conditions.forEach(condition => {
        const result = itemFormSchema.safeParse({ name: 'Test', condition });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid condition value', () => {
      const data = { name: 'Test', condition: 'invalid_condition' };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('status validation', () => {
    it('should accept all valid status values', () => {
      const statuses = ['unprocessed', 'listed', 'sold'];
      statuses.forEach(status => {
        const result = itemFormSchema.safeParse({ name: 'Test', status });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status value', () => {
      const data = { name: 'Test', status: 'pending' };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('price validations', () => {
    it('should reject negative retail_price', () => {
      const data = { name: 'Test', retail_price: -10 };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Retail price cannot be negative');
      }
    });

    it('should reject negative listing_price', () => {
      const data = { name: 'Test', listing_price: -10 };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Listing price cannot be negative');
      }
    });

    it('should reject negative purchase_cost', () => {
      const data = { name: 'Test', purchase_cost: -10 };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Purchase cost cannot be negative');
      }
    });

    it('should accept zero prices', () => {
      const data = { name: 'Test', retail_price: 0, listing_price: 0, purchase_cost: 0 };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject prices exceeding maximum', () => {
      const data = { name: 'Test', retail_price: 1000000 };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Retail price cannot exceed $999,999.99');
      }
    });

    it('should transform undefined prices to null', () => {
      const data = { name: 'Test' };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.retail_price).toBeNull();
        expect(result.data.listing_price).toBeNull();
        expect(result.data.purchase_cost).toBeNull();
      }
    });
  });

  describe('pallet_id validation', () => {
    it('should accept valid UUID', () => {
      const data = { name: 'Test', pallet_id: '123e4567-e89b-12d3-a456-426614174000' };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const data = { name: 'Test', pallet_id: 'not-a-uuid' };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid pallet ID');
      }
    });

    it('should accept null/undefined pallet_id', () => {
      expect(itemFormSchema.safeParse({ name: 'Test', pallet_id: null }).success).toBe(true);
      expect(itemFormSchema.safeParse({ name: 'Test', pallet_id: undefined }).success).toBe(true);
    });

    it('should transform empty string pallet_id to null', () => {
      const data = { name: 'Test', pallet_id: '' };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pallet_id).toBeNull();
      }
    });
  });

  describe('string length validations', () => {
    it('should reject description exceeding 1000 characters', () => {
      const data = { name: 'Test', description: 'a'.repeat(1001) };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject storage_location exceeding 100 characters', () => {
      const data = { name: 'Test', storage_location: 'a'.repeat(101) };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject barcode exceeding 100 characters', () => {
      const data = { name: 'Test', barcode: 'a'.repeat(101) };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject source_name exceeding 100 characters', () => {
      const data = { name: 'Test', source_name: 'a'.repeat(101) };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject notes exceeding 500 characters', () => {
      const data = { name: 'Test', notes: 'a'.repeat(501) };
      const result = itemFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

describe('calculateItemProfit', () => {
  it('should return profit when item is sold', () => {
    expect(calculateItemProfit(100, 30, null)).toBe(70);
  });

  it('should use allocatedCost over purchaseCost when both are present', () => {
    expect(calculateItemProfit(100, 30, 50)).toBe(70);
  });

  it('should use purchaseCost when allocatedCost is null', () => {
    expect(calculateItemProfit(100, null, 40)).toBe(60);
  });

  it('should return 0 when salePrice is null (unsold item)', () => {
    expect(calculateItemProfit(null, 30, 40)).toBe(0);
  });

  it('should handle case when both costs are null', () => {
    expect(calculateItemProfit(100, null, null)).toBe(100);
  });

  it('should calculate negative profit (loss)', () => {
    expect(calculateItemProfit(50, 80, null)).toBe(-30);
  });

  it('should handle zero sale price', () => {
    expect(calculateItemProfit(0, 30, null)).toBe(-30);
  });
});

describe('calculateItemROI', () => {
  it('should calculate positive ROI', () => {
    expect(calculateItemROI(100, 50, null)).toBe(100); // 100% ROI
  });

  it('should calculate negative ROI (loss)', () => {
    expect(calculateItemROI(50, 100, null)).toBe(-50); // -50% ROI
  });

  it('should return 0 when salePrice is null', () => {
    expect(calculateItemROI(null, 50, null)).toBe(0);
  });

  it('should return 100 when cost is 0 and salePrice is positive', () => {
    expect(calculateItemROI(100, 0, 0)).toBe(100);
  });

  it('should return 0 when both salePrice and cost are 0', () => {
    expect(calculateItemROI(0, 0, 0)).toBe(0);
  });

  it('should use purchaseCost when allocatedCost is null', () => {
    expect(calculateItemROI(150, null, 100)).toBe(50);
  });

  it('should handle all null costs', () => {
    expect(calculateItemROI(100, null, null)).toBe(100);
  });
});

describe('getConditionColor', () => {
  it('should return green for new condition', () => {
    expect(getConditionColor('new')).toBe('#2E7D32');
  });

  it('should return blue for open_box condition', () => {
    expect(getConditionColor('open_box')).toBe('#1976D2');
  });

  it('should return light green for used_good condition', () => {
    expect(getConditionColor('used_good')).toBe('#388E3C');
  });

  it('should return orange for used_fair condition', () => {
    expect(getConditionColor('used_fair')).toBe('#FFA000');
  });

  it('should return dark orange for damaged condition', () => {
    expect(getConditionColor('damaged')).toBe('#F57C00');
  });

  it('should return deep orange for for_parts condition', () => {
    expect(getConditionColor('for_parts')).toBe('#E64A19');
  });

  it('should return red for unsellable condition', () => {
    expect(getConditionColor('unsellable')).toBe('#D32F2F');
  });

  it('should return grey for unknown condition', () => {
    expect(getConditionColor('unknown' as any)).toBe('#9E9E9E');
  });
});

describe('getStatusColor', () => {
  it('should return grey for unprocessed status', () => {
    expect(getStatusColor('unprocessed')).toBe('#9E9E9E');
  });

  it('should return blue for listed status', () => {
    expect(getStatusColor('listed')).toBe('#1976D2');
  });

  it('should return green for sold status', () => {
    expect(getStatusColor('sold')).toBe('#2E7D32');
  });

  it('should return grey for unknown status', () => {
    expect(getStatusColor('unknown' as any)).toBe('#9E9E9E');
  });
});

describe('getUniqueStorageLocations', () => {
  it('should return unique storage locations sorted alphabetically', () => {
    const items = [
      { storage_location: 'Shelf B' },
      { storage_location: 'Shelf A' },
      { storage_location: 'Shelf B' },
      { storage_location: 'Bin 1' },
    ];
    expect(getUniqueStorageLocations(items)).toEqual(['Bin 1', 'Shelf A', 'Shelf B']);
  });

  it('should filter out null values', () => {
    const items = [
      { storage_location: 'Shelf A' },
      { storage_location: null },
      { storage_location: 'Shelf B' },
    ];
    expect(getUniqueStorageLocations(items)).toEqual(['Shelf A', 'Shelf B']);
  });

  it('should filter out empty strings', () => {
    const items = [
      { storage_location: 'Shelf A' },
      { storage_location: '' },
      { storage_location: '   ' },
    ];
    expect(getUniqueStorageLocations(items)).toEqual(['Shelf A']);
  });

  it('should return empty array for empty input', () => {
    expect(getUniqueStorageLocations([])).toEqual([]);
  });
});

describe('getUniqueItemSourceNames', () => {
  it('should return unique source names sorted alphabetically', () => {
    const items = [
      { source_name: 'Goodwill' },
      { source_name: 'eBay' },
      { source_name: 'Goodwill' },
    ];
    expect(getUniqueItemSourceNames(items)).toEqual(['Goodwill', 'eBay'].sort());
  });

  it('should filter out null and empty values', () => {
    const items = [
      { source_name: 'Thrift Store' },
      { source_name: null },
      { source_name: '' },
    ];
    expect(getUniqueItemSourceNames(items)).toEqual(['Thrift Store']);
  });

  it('should return empty array for empty input', () => {
    expect(getUniqueItemSourceNames([])).toEqual([]);
  });
});

describe('getUniqueSalesChannels', () => {
  it('should return unique sales channels sorted alphabetically', () => {
    const items = [
      { sales_channel: 'eBay' },
      { sales_channel: 'Amazon' },
      { sales_channel: 'eBay' },
    ];
    expect(getUniqueSalesChannels(items)).toEqual(['Amazon', 'eBay']);
  });

  it('should filter out null and empty values', () => {
    const items = [
      { sales_channel: 'Mercari' },
      { sales_channel: null },
      { sales_channel: '' },
    ];
    expect(getUniqueSalesChannels(items)).toEqual(['Mercari']);
  });

  it('should return empty array for empty input', () => {
    expect(getUniqueSalesChannels([])).toEqual([]);
  });
});

describe('formatCondition', () => {
  it('should format all condition values correctly', () => {
    expect(formatCondition('new')).toBe('New');
    expect(formatCondition('open_box')).toBe('Open Box');
    expect(formatCondition('used_good')).toBe('Used - Good');
    expect(formatCondition('used_fair')).toBe('Used - Fair');
    expect(formatCondition('damaged')).toBe('Damaged');
    expect(formatCondition('for_parts')).toBe('For Parts');
    expect(formatCondition('unsellable')).toBe('Unsellable');
  });

  it('should return original value for unknown condition', () => {
    expect(formatCondition('unknown' as any)).toBe('unknown');
  });
});

describe('formatStatus', () => {
  it('should format all status values correctly', () => {
    expect(formatStatus('unprocessed')).toBe('Unprocessed');
    expect(formatStatus('listed')).toBe('Listed');
    expect(formatStatus('sold')).toBe('Sold');
  });

  it('should return original value for unknown status', () => {
    expect(formatStatus('unknown' as any)).toBe('unknown');
  });
});

describe('constants', () => {
  it('should have all condition options', () => {
    expect(ITEM_CONDITION_OPTIONS).toHaveLength(7);
    expect(ITEM_CONDITION_OPTIONS.map(o => o.value)).toContain('new');
    expect(ITEM_CONDITION_OPTIONS.map(o => o.value)).toContain('unsellable');
  });

  it('should have all status options', () => {
    expect(ITEM_STATUS_OPTIONS).toHaveLength(3);
    expect(ITEM_STATUS_OPTIONS.map(o => o.value)).toContain('unprocessed');
    expect(ITEM_STATUS_OPTIONS.map(o => o.value)).toContain('sold');
  });

  it('should have sales channel suggestions', () => {
    expect(SALES_CHANNEL_SUGGESTIONS.length).toBeGreaterThan(0);
    expect(SALES_CHANNEL_SUGGESTIONS).toContain('eBay');
    expect(SALES_CHANNEL_SUGGESTIONS).toContain('Amazon');
  });

  it('should have correct default form values', () => {
    expect(defaultItemFormValues.name).toBe('');
    expect(defaultItemFormValues.quantity).toBe(1);
    expect(defaultItemFormValues.condition).toBe('used_good');
    expect(defaultItemFormValues.status).toBe('unprocessed');
    expect(defaultItemFormValues.description).toBeNull();
    expect(defaultItemFormValues.pallet_id).toBeNull();
  });
});
