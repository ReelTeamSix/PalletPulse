// Mileage Form Schema Tests
import {
  mileageFormSchema,
  MileageFormData,
  getDefaultMileageFormValues,
  getLocalDateString,
  calculateDeduction,
  formatDeduction,
  formatMiles,
  formatMileageRate,
  formatTripPurpose,
  formatDisplayDate,
  getPurposeColor,
  calculateYTDMileage,
  getTripsForMonth,
  calculateMonthlySummary,
  TRIP_PURPOSE_OPTIONS,
  DEFAULT_IRS_MILEAGE_RATE,
} from './mileage-form-schema';

describe('mileageFormSchema', () => {
  const validData: MileageFormData = {
    trip_date: '2026-01-11',
    purpose: 'pallet_pickup',
    miles: 45,
    mileage_rate: 0.725,
    pallet_ids: [],
    notes: null,
  };

  describe('trip_date validation', () => {
    it('should accept valid date in YYYY-MM-DD format', () => {
      const result = mileageFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty date', () => {
      const result = mileageFormSchema.safeParse({ ...validData, trip_date: '' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = mileageFormSchema.safeParse({ ...validData, trip_date: '01-11-2026' });
      expect(result.success).toBe(false);
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      const result = mileageFormSchema.safeParse({ ...validData, trip_date: futureDateStr });
      expect(result.success).toBe(false);
    });
  });

  describe('purpose validation', () => {
    it('should accept all valid purpose values', () => {
      const purposes = [
        'pallet_pickup',
        'thrift_run',
        'garage_sale',
        'post_office',
        'auction',
        'sourcing',
        'other',
      ];
      purposes.forEach((purpose) => {
        const result = mileageFormSchema.safeParse({ ...validData, purpose });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid purpose', () => {
      const result = mileageFormSchema.safeParse({ ...validData, purpose: 'invalid_purpose' });
      expect(result.success).toBe(false);
    });
  });

  describe('miles validation', () => {
    it('should accept positive miles', () => {
      const result = mileageFormSchema.safeParse({ ...validData, miles: 100 });
      expect(result.success).toBe(true);
    });

    it('should accept decimal miles', () => {
      const result = mileageFormSchema.safeParse({ ...validData, miles: 45.5 });
      expect(result.success).toBe(true);
    });

    it('should reject zero miles', () => {
      const result = mileageFormSchema.safeParse({ ...validData, miles: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative miles', () => {
      const result = mileageFormSchema.safeParse({ ...validData, miles: -10 });
      expect(result.success).toBe(false);
    });

    it('should reject miles exceeding 9999', () => {
      const result = mileageFormSchema.safeParse({ ...validData, miles: 10000 });
      expect(result.success).toBe(false);
    });
  });

  describe('mileage_rate validation', () => {
    it('should accept valid mileage rate', () => {
      const result = mileageFormSchema.safeParse({ ...validData, mileage_rate: 0.725 });
      expect(result.success).toBe(true);
    });

    it('should accept zero mileage rate', () => {
      const result = mileageFormSchema.safeParse({ ...validData, mileage_rate: 0 });
      expect(result.success).toBe(true);
    });

    it('should reject negative mileage rate', () => {
      const result = mileageFormSchema.safeParse({ ...validData, mileage_rate: -0.5 });
      expect(result.success).toBe(false);
    });

    it('should reject excessively high mileage rate', () => {
      const result = mileageFormSchema.safeParse({ ...validData, mileage_rate: 15 });
      expect(result.success).toBe(false);
    });
  });

  describe('pallet_ids validation', () => {
    it('should accept empty array', () => {
      const result = mileageFormSchema.safeParse({ ...validData, pallet_ids: [] });
      expect(result.success).toBe(true);
    });

    it('should accept valid UUID array', () => {
      const result = mileageFormSchema.safeParse({
        ...validData,
        pallet_ids: ['123e4567-e89b-12d3-a456-426614174000'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept multiple valid UUIDs', () => {
      const result = mileageFormSchema.safeParse({
        ...validData,
        pallet_ids: [
          '123e4567-e89b-12d3-a456-426614174000',
          'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = mileageFormSchema.safeParse({
        ...validData,
        pallet_ids: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
    });

    it('should transform null to empty array', () => {
      const result = mileageFormSchema.safeParse({ ...validData, pallet_ids: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pallet_ids).toEqual([]);
      }
    });
  });

  describe('notes validation', () => {
    it('should accept null notes', () => {
      const result = mileageFormSchema.safeParse({ ...validData, notes: null });
      expect(result.success).toBe(true);
    });

    it('should accept valid notes', () => {
      const result = mileageFormSchema.safeParse({
        ...validData,
        notes: 'Picked up 2 pallets from GRPL',
      });
      expect(result.success).toBe(true);
    });

    it('should reject notes exceeding 500 characters', () => {
      const result = mileageFormSchema.safeParse({
        ...validData,
        notes: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should trim whitespace and transform empty to null', () => {
      const result = mileageFormSchema.safeParse({ ...validData, notes: '   ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBeNull();
      }
    });
  });
});

describe('getDefaultMileageFormValues', () => {
  it('should return default values with current date', () => {
    const defaults = getDefaultMileageFormValues();
    expect(defaults.trip_date).toBe(getLocalDateString());
    expect(defaults.purpose).toBe('pallet_pickup');
    expect(defaults.miles).toBe(0);
    expect(defaults.mileage_rate).toBe(DEFAULT_IRS_MILEAGE_RATE);
    expect(defaults.pallet_ids).toEqual([]);
    expect(defaults.notes).toBeNull();
  });

  it('should accept custom mileage rate', () => {
    const defaults = getDefaultMileageFormValues(0.67);
    expect(defaults.mileage_rate).toBe(0.67);
  });
});

describe('getLocalDateString', () => {
  it('should return date in YYYY-MM-DD format', () => {
    const date = new Date(2026, 0, 11); // Jan 11, 2026
    const result = getLocalDateString(date);
    expect(result).toBe('2026-01-11');
  });

  it('should pad single-digit months', () => {
    const date = new Date(2026, 4, 5); // May 5, 2026
    const result = getLocalDateString(date);
    expect(result).toBe('2026-05-05');
  });

  it('should use current date when no argument provided', () => {
    const result = getLocalDateString();
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});

describe('calculateDeduction', () => {
  it('should calculate deduction correctly', () => {
    expect(calculateDeduction(45, 0.725)).toBeCloseTo(32.625);
  });

  it('should return 0 for null miles', () => {
    expect(calculateDeduction(null, 0.725)).toBe(0);
  });

  it('should return 0 for null rate', () => {
    expect(calculateDeduction(45, null)).toBe(0);
  });

  it('should handle decimal miles', () => {
    expect(calculateDeduction(10.5, 0.725)).toBeCloseTo(7.6125);
  });
});

describe('formatDeduction', () => {
  it('should format deduction as currency', () => {
    expect(formatDeduction(32.625)).toBe('$32.63');
  });

  it('should format zero correctly', () => {
    expect(formatDeduction(0)).toBe('$0.00');
  });

  it('should format large numbers with commas', () => {
    expect(formatDeduction(1234.56)).toBe('$1,234.56');
  });
});

describe('formatMiles', () => {
  it('should format whole miles without decimal', () => {
    expect(formatMiles(45)).toBe('45 mi');
  });

  it('should format decimal miles with one decimal place', () => {
    expect(formatMiles(45.5)).toBe('45.5 mi');
  });

  it('should format zero miles', () => {
    expect(formatMiles(0)).toBe('0 mi');
  });
});

describe('formatMileageRate', () => {
  it('should format rate with 3 decimal places', () => {
    expect(formatMileageRate(0.725)).toBe('$0.725/mi');
  });

  it('should pad with zeros if needed', () => {
    expect(formatMileageRate(0.7)).toBe('$0.700/mi');
  });
});

describe('formatTripPurpose', () => {
  it('should format pallet_pickup', () => {
    expect(formatTripPurpose('pallet_pickup')).toBe('Pallet Pickup');
  });

  it('should format thrift_run', () => {
    expect(formatTripPurpose('thrift_run')).toBe('Thrift Store Run');
  });

  it('should format garage_sale', () => {
    expect(formatTripPurpose('garage_sale')).toBe('Garage Sale Circuit');
  });

  it('should format post_office', () => {
    expect(formatTripPurpose('post_office')).toBe('Post Office / Shipping');
  });

  it('should return value for unknown purpose', () => {
    // @ts-expect-error - Testing invalid input
    expect(formatTripPurpose('unknown')).toBe('unknown');
  });
});

describe('formatDisplayDate', () => {
  it('should format date as "Month Day, Year"', () => {
    expect(formatDisplayDate('2026-01-11')).toBe('Jan 11, 2026');
  });

  it('should handle different months', () => {
    expect(formatDisplayDate('2026-12-25')).toBe('Dec 25, 2026');
  });
});

describe('getPurposeColor', () => {
  it('should return blue for pallet_pickup', () => {
    expect(getPurposeColor('pallet_pickup')).toBe('#1976D2');
  });

  it('should return purple for thrift_run', () => {
    expect(getPurposeColor('thrift_run')).toBe('#7B1FA2');
  });

  it('should return grey for other', () => {
    expect(getPurposeColor('other')).toBe('#757575');
  });
});

describe('calculateYTDMileage', () => {
  const trips = [
    { trip_date: '2026-01-05', miles: 30 },
    { trip_date: '2026-02-10', miles: 45 },
    { trip_date: '2025-12-15', miles: 20 }, // Previous year
  ];

  it('should calculate YTD totals for current year', () => {
    const result = calculateYTDMileage(trips, 2026);
    expect(result.tripCount).toBe(2);
    expect(result.totalMiles).toBe(75);
    expect(result.totalDeduction).toBeCloseTo(75 * DEFAULT_IRS_MILEAGE_RATE);
  });

  it('should calculate for specific year', () => {
    const result = calculateYTDMileage(trips, 2025);
    expect(result.tripCount).toBe(1);
    expect(result.totalMiles).toBe(20);
  });

  it('should return zeros for empty trips', () => {
    const result = calculateYTDMileage([], 2026);
    expect(result.tripCount).toBe(0);
    expect(result.totalMiles).toBe(0);
    expect(result.totalDeduction).toBe(0);
  });
});

describe('getTripsForMonth', () => {
  const trips = [
    { trip_date: '2026-01-05', miles: 30 },
    { trip_date: '2026-01-20', miles: 45 },
    { trip_date: '2026-02-10', miles: 20 },
  ];

  it('should filter trips by month', () => {
    const result = getTripsForMonth(trips, 2026, 1);
    expect(result.length).toBe(2);
  });

  it('should return empty array for month with no trips', () => {
    const result = getTripsForMonth(trips, 2026, 3);
    expect(result.length).toBe(0);
  });
});

describe('calculateMonthlySummary', () => {
  const trips = [
    { trip_date: '2026-01-05', miles: 30, deduction: 21.75 },
    { trip_date: '2026-01-20', miles: 45, deduction: 32.625 },
    { trip_date: '2026-02-10', miles: 20, deduction: 14.5 },
  ];

  it('should calculate monthly totals', () => {
    const result = calculateMonthlySummary(trips, 2026, 1);
    expect(result.tripCount).toBe(2);
    expect(result.totalMiles).toBe(75);
    expect(result.totalDeduction).toBeCloseTo(54.375);
  });

  it('should use default rate if deduction not provided', () => {
    const tripsNoDeduction = [
      { trip_date: '2026-01-05', miles: 30 },
    ];
    const result = calculateMonthlySummary(tripsNoDeduction, 2026, 1);
    expect(result.totalDeduction).toBeCloseTo(30 * DEFAULT_IRS_MILEAGE_RATE);
  });
});

describe('TRIP_PURPOSE_OPTIONS', () => {
  it('should have 7 purpose options', () => {
    expect(TRIP_PURPOSE_OPTIONS.length).toBe(7);
  });

  it('should have pallet_pickup as first option', () => {
    expect(TRIP_PURPOSE_OPTIONS[0].value).toBe('pallet_pickup');
  });

  it('should have other as last option', () => {
    expect(TRIP_PURPOSE_OPTIONS[TRIP_PURPOSE_OPTIONS.length - 1].value).toBe('other');
  });
});

describe('DEFAULT_IRS_MILEAGE_RATE', () => {
  it('should be 0.725 for 2026', () => {
    expect(DEFAULT_IRS_MILEAGE_RATE).toBe(0.725);
  });
});
