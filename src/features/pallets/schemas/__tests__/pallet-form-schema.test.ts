// Pallet Form Schema Tests
import {
  palletFormSchema,
  generatePalletName,
  calculateTotalCost,
  calculateSalesTaxFromRate,
  splitCostEvenly,
  getUniqueSuppliers,
  getUniqueSourceNames,
  PalletFormData,
} from '../pallet-form-schema';

describe('palletFormSchema', () => {
  const validData: PalletFormData = {
    source_type: 'pallet',
    name: 'Test Pallet',
    supplier: 'Test Supplier',
    source_name: 'Amazon Monster',
    purchase_cost: 100,
    sales_tax: 6,
    purchase_date: '2024-01-15',
    status: 'unprocessed',
    notes: 'Test notes',
  };

  describe('name validation', () => {
    it('should accept valid name', () => {
      const result = palletFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = palletFormSchema.safeParse({ ...validData, name: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Pallet name is required');
      }
    });

    it('should reject name over 100 characters', () => {
      const result = palletFormSchema.safeParse({
        ...validData,
        name: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be 100 characters or less');
      }
    });

    it('should trim whitespace from name', () => {
      const result = palletFormSchema.safeParse({ ...validData, name: '  Test Pallet  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Pallet');
      }
    });
  });

  describe('supplier validation', () => {
    it('should accept valid supplier', () => {
      const result = palletFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.supplier).toBe('Test Supplier');
      }
    });

    it('should accept null supplier', () => {
      const result = palletFormSchema.safeParse({ ...validData, supplier: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.supplier).toBe(null);
      }
    });

    it('should transform empty string to null', () => {
      const result = palletFormSchema.safeParse({ ...validData, supplier: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.supplier).toBe(null);
      }
    });

    it('should reject supplier over 100 characters', () => {
      const result = palletFormSchema.safeParse({
        ...validData,
        supplier: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('source_name validation', () => {
    it('should accept valid source_name', () => {
      const result = palletFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source_name).toBe('Amazon Monster');
      }
    });

    it('should accept null source_name', () => {
      const result = palletFormSchema.safeParse({ ...validData, source_name: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source_name).toBe(null);
      }
    });

    it('should transform empty string to null', () => {
      const result = palletFormSchema.safeParse({ ...validData, source_name: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source_name).toBe(null);
      }
    });
  });

  describe('purchase_cost validation', () => {
    it('should accept valid purchase cost', () => {
      const result = palletFormSchema.safeParse({ ...validData, purchase_cost: 500 });
      expect(result.success).toBe(true);
    });

    it('should accept zero purchase cost', () => {
      const result = palletFormSchema.safeParse({ ...validData, purchase_cost: 0 });
      expect(result.success).toBe(true);
    });

    it('should reject negative purchase cost', () => {
      const result = palletFormSchema.safeParse({ ...validData, purchase_cost: -10 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Purchase cost cannot be negative');
      }
    });

    it('should reject purchase cost over max', () => {
      const result = palletFormSchema.safeParse({ ...validData, purchase_cost: 1000000 });
      expect(result.success).toBe(false);
    });
  });

  describe('sales_tax validation', () => {
    it('should accept valid sales tax', () => {
      const result = palletFormSchema.safeParse({ ...validData, sales_tax: 10 });
      expect(result.success).toBe(true);
    });

    it('should accept null sales tax (tax exempt)', () => {
      const result = palletFormSchema.safeParse({ ...validData, sales_tax: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sales_tax).toBe(null);
      }
    });

    it('should reject negative sales tax', () => {
      const result = palletFormSchema.safeParse({ ...validData, sales_tax: -5 });
      expect(result.success).toBe(false);
    });
  });

  describe('purchase_date validation', () => {
    it('should accept valid date', () => {
      const result = palletFormSchema.safeParse({ ...validData, purchase_date: '2024-01-15' });
      expect(result.success).toBe(true);
    });

    it('should reject empty date', () => {
      const result = palletFormSchema.safeParse({ ...validData, purchase_date: '' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = palletFormSchema.safeParse({ ...validData, purchase_date: 'not-a-date' });
      expect(result.success).toBe(false);
    });

    it('should reject future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = palletFormSchema.safeParse({
        ...validData,
        purchase_date: futureDate.toISOString().split('T')[0],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Purchase date cannot be in the future');
      }
    });
  });

  describe('status validation', () => {
    it('should accept valid status values', () => {
      const statuses = ['unprocessed', 'processing', 'completed'] as const;
      statuses.forEach((status) => {
        const result = palletFormSchema.safeParse({ ...validData, status });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const result = palletFormSchema.safeParse({ ...validData, status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('notes validation', () => {
    it('should accept valid notes', () => {
      const result = palletFormSchema.safeParse({ ...validData, notes: 'Some notes' });
      expect(result.success).toBe(true);
    });

    it('should transform empty notes to null', () => {
      const result = palletFormSchema.safeParse({ ...validData, notes: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe(null);
      }
    });

    it('should reject notes over 500 characters', () => {
      const result = palletFormSchema.safeParse({ ...validData, notes: 'a'.repeat(501) });
      expect(result.success).toBe(false);
    });
  });
});

describe('generatePalletName', () => {
  it('should return "Pallet #1" for empty list', () => {
    expect(generatePalletName([])).toBe('Pallet #1');
  });

  it('should return next number after existing pallets', () => {
    const pallets = [
      { name: 'Pallet #1' },
      { name: 'Pallet #2' },
      { name: 'Pallet #3' },
    ];
    expect(generatePalletName(pallets)).toBe('Pallet #4');
  });

  it('should handle gaps in numbering', () => {
    const pallets = [
      { name: 'Pallet #1' },
      { name: 'Pallet #5' },
    ];
    expect(generatePalletName(pallets)).toBe('Pallet #6');
  });

  it('should ignore non-numbered pallets', () => {
    const pallets = [
      { name: 'Amazon Monster' },
      { name: 'Random Name' },
    ];
    expect(generatePalletName(pallets)).toBe('Pallet #1');
  });

  it('should handle mixed numbered and non-numbered', () => {
    const pallets = [
      { name: 'Amazon Monster' },
      { name: 'Pallet #3' },
      { name: 'Random Name' },
    ];
    expect(generatePalletName(pallets)).toBe('Pallet #4');
  });
});

describe('calculateTotalCost', () => {
  it('should add purchase cost and sales tax', () => {
    expect(calculateTotalCost(100, 6)).toBe(106);
  });

  it('should return purchase cost when tax is null', () => {
    expect(calculateTotalCost(100, null)).toBe(100);
  });

  it('should return purchase cost when tax is zero', () => {
    expect(calculateTotalCost(100, 0)).toBe(100);
  });

  it('should handle decimal values', () => {
    expect(calculateTotalCost(99.99, 5.99)).toBeCloseTo(105.98);
  });
});

describe('calculateSalesTaxFromRate', () => {
  it('should calculate tax from percentage rate', () => {
    expect(calculateSalesTaxFromRate(100, 6)).toBe(6);
  });

  it('should return 0 for zero rate', () => {
    expect(calculateSalesTaxFromRate(100, 0)).toBe(0);
  });

  it('should return 0 for negative rate', () => {
    expect(calculateSalesTaxFromRate(100, -5)).toBe(0);
  });

  it('should round to 2 decimal places', () => {
    expect(calculateSalesTaxFromRate(99.99, 6.5)).toBe(6.5);
  });

  it('should handle large amounts', () => {
    expect(calculateSalesTaxFromRate(10000, 8.25)).toBe(825);
  });
});

describe('splitCostEvenly', () => {
  it('should split cost evenly across pallets', () => {
    expect(splitCostEvenly(100, 4)).toBe(25);
  });

  it('should handle uneven splits with rounding', () => {
    expect(splitCostEvenly(100, 3)).toBeCloseTo(33.33, 2);
  });

  it('should return total cost for zero pallets', () => {
    expect(splitCostEvenly(100, 0)).toBe(100);
  });

  it('should return total cost for negative pallets', () => {
    expect(splitCostEvenly(100, -1)).toBe(100);
  });

  it('should handle single pallet', () => {
    expect(splitCostEvenly(100, 1)).toBe(100);
  });
});

describe('getUniqueSuppliers', () => {
  it('should return unique suppliers', () => {
    const pallets = [
      { supplier: 'GRPL' },
      { supplier: 'Liquidation Land' },
      { supplier: 'GRPL' },
      { supplier: 'B-Stock' },
    ];
    const result = getUniqueSuppliers(pallets);
    expect(result).toHaveLength(3);
    expect(result).toContain('GRPL');
    expect(result).toContain('Liquidation Land');
    expect(result).toContain('B-Stock');
  });

  it('should filter out null suppliers', () => {
    const pallets = [
      { supplier: 'GRPL' },
      { supplier: null },
      { supplier: 'B-Stock' },
    ];
    const result = getUniqueSuppliers(pallets);
    expect(result).toHaveLength(2);
  });

  it('should filter out empty string suppliers', () => {
    const pallets = [
      { supplier: 'GRPL' },
      { supplier: '' },
      { supplier: '   ' },
    ];
    const result = getUniqueSuppliers(pallets);
    expect(result).toHaveLength(1);
  });

  it('should return sorted list', () => {
    const pallets = [
      { supplier: 'Zebra' },
      { supplier: 'Apple' },
      { supplier: 'Mango' },
    ];
    const result = getUniqueSuppliers(pallets);
    expect(result).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('should return empty array for empty input', () => {
    expect(getUniqueSuppliers([])).toEqual([]);
  });
});

describe('getUniqueSourceNames', () => {
  it('should return unique source names', () => {
    const pallets = [
      { source_name: 'Amazon Monster' },
      { source_name: 'Walmart Medium' },
      { source_name: 'Amazon Monster' },
    ];
    const result = getUniqueSourceNames(pallets);
    expect(result).toHaveLength(2);
    expect(result).toContain('Amazon Monster');
    expect(result).toContain('Walmart Medium');
  });

  it('should filter out null source names', () => {
    const pallets = [
      { source_name: 'Amazon Monster' },
      { source_name: null },
    ];
    const result = getUniqueSourceNames(pallets);
    expect(result).toHaveLength(1);
  });

  it('should return sorted list', () => {
    const pallets = [
      { source_name: 'Zebra Box' },
      { source_name: 'Apple Returns' },
    ];
    const result = getUniqueSourceNames(pallets);
    expect(result).toEqual(['Apple Returns', 'Zebra Box']);
  });
});
