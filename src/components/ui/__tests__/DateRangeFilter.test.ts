import {
  isWithinDateRange,
  getDateRangeFromPreset,
  DateRange,
  DateRangePreset,
} from '../DateRangeFilter';

describe('DateRangeFilter', () => {
  describe('isWithinDateRange', () => {
    it('should return true for "all" preset regardless of date', () => {
      const range: DateRange = { start: null, end: null, preset: 'all' };

      expect(isWithinDateRange('2024-01-15', range)).toBe(true);
      expect(isWithinDateRange('2025-06-01', range)).toBe(true);
      expect(isWithinDateRange('2020-12-31', range)).toBe(true);
    });

    it('should return true when both start and end are null', () => {
      const range: DateRange = { start: null, end: null, preset: 'custom' };

      expect(isWithinDateRange('2024-01-15', range)).toBe(true);
    });

    it('should return true for date within range', () => {
      const range: DateRange = {
        start: new Date(2024, 0, 1), // Jan 1, 2024
        end: new Date(2024, 0, 31),  // Jan 31, 2024
        preset: 'custom',
      };

      expect(isWithinDateRange('2024-01-15', range)).toBe(true);
      expect(isWithinDateRange('2024-01-01', range)).toBe(true); // Start boundary
      expect(isWithinDateRange('2024-01-31', range)).toBe(true); // End boundary
    });

    it('should return false for date outside range', () => {
      const range: DateRange = {
        start: new Date(2024, 0, 1), // Jan 1, 2024
        end: new Date(2024, 0, 31),  // Jan 31, 2024
        preset: 'custom',
      };

      expect(isWithinDateRange('2023-12-31', range)).toBe(false); // Before
      expect(isWithinDateRange('2024-02-01', range)).toBe(false); // After
    });

    it('should handle date strings in various formats', () => {
      const range: DateRange = {
        start: new Date(2024, 5, 1),  // Jun 1, 2024
        end: new Date(2024, 5, 30),   // Jun 30, 2024
        preset: 'custom',
      };

      expect(isWithinDateRange('2024-06-15', range)).toBe(true);
    });
  });

  describe('getDateRangeFromPreset', () => {
    // Store original Date to restore after tests
    const RealDate = Date;

    beforeEach(() => {
      // Mock Date to return a fixed date for consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 5, 15)); // June 15, 2024 (Q2)
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return null dates for "all" preset', () => {
      const result = getDateRangeFromPreset('all');

      expect(result.start).toBeNull();
      expect(result.end).toBeNull();
    });

    it('should return current month for "this_month" preset', () => {
      const result = getDateRangeFromPreset('this_month');

      expect(result.start?.getFullYear()).toBe(2024);
      expect(result.start?.getMonth()).toBe(5); // June (0-indexed)
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getFullYear()).toBe(2024);
      expect(result.end?.getMonth()).toBe(5);
      expect(result.end?.getDate()).toBe(30); // June has 30 days
    });

    it('should return Q2 for "this_quarter" preset when in June', () => {
      const result = getDateRangeFromPreset('this_quarter');

      // Q2 = Apr-Jun
      expect(result.start?.getMonth()).toBe(3); // April
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getMonth()).toBe(5); // June
      expect(result.end?.getDate()).toBe(30);
    });

    it('should return Q1 for "last_quarter" preset when in Q2', () => {
      const result = getDateRangeFromPreset('last_quarter');

      // Q1 = Jan-Mar
      expect(result.start?.getMonth()).toBe(0); // January
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getMonth()).toBe(2); // March
      expect(result.end?.getDate()).toBe(31);
    });

    it('should return full year for "this_year" preset', () => {
      const result = getDateRangeFromPreset('this_year');

      expect(result.start?.getFullYear()).toBe(2024);
      expect(result.start?.getMonth()).toBe(0); // January
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getFullYear()).toBe(2024);
      expect(result.end?.getMonth()).toBe(11); // December
      expect(result.end?.getDate()).toBe(31);
    });

    it('should return Q4 of previous year for "last_quarter" when in Q1', () => {
      // Change mock date to Q1
      jest.setSystemTime(new Date(2024, 1, 15)); // Feb 15, 2024 (Q1)

      const result = getDateRangeFromPreset('last_quarter');

      // Q4 of 2023 = Oct-Dec 2023
      expect(result.start?.getFullYear()).toBe(2023);
      expect(result.start?.getMonth()).toBe(9); // October
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getFullYear()).toBe(2023);
      expect(result.end?.getMonth()).toBe(11); // December
      expect(result.end?.getDate()).toBe(31);
    });
  });

  describe('Quarter calculations', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should identify Q1 correctly (Jan-Mar)', () => {
      jest.setSystemTime(new Date(2024, 0, 15)); // Jan 15
      const result = getDateRangeFromPreset('this_quarter');
      expect(result.start?.getMonth()).toBe(0); // Jan
      expect(result.end?.getMonth()).toBe(2);   // Mar
    });

    it('should identify Q2 correctly (Apr-Jun)', () => {
      jest.setSystemTime(new Date(2024, 4, 15)); // May 15
      const result = getDateRangeFromPreset('this_quarter');
      expect(result.start?.getMonth()).toBe(3); // Apr
      expect(result.end?.getMonth()).toBe(5);   // Jun
    });

    it('should identify Q3 correctly (Jul-Sep)', () => {
      jest.setSystemTime(new Date(2024, 7, 15)); // Aug 15
      const result = getDateRangeFromPreset('this_quarter');
      expect(result.start?.getMonth()).toBe(6); // Jul
      expect(result.end?.getMonth()).toBe(8);   // Sep
    });

    it('should identify Q4 correctly (Oct-Dec)', () => {
      jest.setSystemTime(new Date(2024, 10, 15)); // Nov 15
      const result = getDateRangeFromPreset('this_quarter');
      expect(result.start?.getMonth()).toBe(9);  // Oct
      expect(result.end?.getMonth()).toBe(11);   // Dec
    });
  });

  describe('Edge cases', () => {
    it('should handle leap year February correctly', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 1, 15)); // Feb 15, 2024 (leap year)

      const result = getDateRangeFromPreset('this_month');

      expect(result.end?.getDate()).toBe(29); // Leap year has 29 days in Feb

      jest.useRealTimers();
    });

    it('should handle year boundary in last_quarter from Q1', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 2, 15)); // Mar 15, 2024 (Q1)

      const result = getDateRangeFromPreset('last_quarter');

      // Last quarter from Q1 2024 = Q4 2023
      expect(result.start?.getFullYear()).toBe(2023);
      expect(result.end?.getFullYear()).toBe(2023);

      jest.useRealTimers();
    });
  });
});
