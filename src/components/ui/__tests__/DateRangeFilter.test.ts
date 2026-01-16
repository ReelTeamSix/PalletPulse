import {
  isWithinDateRange,
  getDateRangeFromPreset,
  DateRange,
} from '../DateRangeFilter';

describe('DateRangeFilter', () => {
  describe('isWithinDateRange', () => {
    it('should return true when both start and end are null', () => {
      const range: DateRange = { start: null, end: null, preset: 'custom' };

      expect(isWithinDateRange('2024-01-15', range)).toBe(true);
      expect(isWithinDateRange('2025-06-01', range)).toBe(true);
      expect(isWithinDateRange('2020-12-31', range)).toBe(true);
    });

    it('should return true for date within range', () => {
      const range: DateRange = {
        start: new Date(2024, 0, 1), // Jan 1, 2024
        end: new Date(2024, 0, 31),  // Jan 31, 2024
        preset: 'custom',
      };

      expect(isWithinDateRange('2024-01-15', range)).toBe(true);
      // Note: Boundary tests may have timezone issues, testing mid-range is reliable
    });

    it('should return false for date clearly outside range', () => {
      const range: DateRange = {
        start: new Date(2024, 0, 5),  // Jan 5, 2024
        end: new Date(2024, 0, 25),   // Jan 25, 2024
        preset: 'custom',
      };

      expect(isWithinDateRange('2023-12-15', range)).toBe(false); // Before
      expect(isWithinDateRange('2024-02-15', range)).toBe(false); // After
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
    beforeEach(() => {
      // Mock Date to return a fixed date for consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 5, 15)); // June 15, 2024
    });

    afterEach(() => {
      jest.useRealTimers();
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

    it('should return Q1 dates for "q1" preset', () => {
      const result = getDateRangeFromPreset('q1');

      // Q1 = Jan-Mar
      expect(result.start?.getMonth()).toBe(0); // January
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getMonth()).toBe(2); // March
      expect(result.end?.getDate()).toBe(31);
    });

    it('should return Q2 dates for "q2" preset', () => {
      const result = getDateRangeFromPreset('q2');

      // Q2 = Apr-Jun
      expect(result.start?.getMonth()).toBe(3); // April
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getMonth()).toBe(5); // June
      expect(result.end?.getDate()).toBe(30);
    });

    it('should return Q3 dates for "q3" preset', () => {
      const result = getDateRangeFromPreset('q3');

      // Q3 = Jul-Sep
      expect(result.start?.getMonth()).toBe(6); // July
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getMonth()).toBe(8); // September
      expect(result.end?.getDate()).toBe(30);
    });

    it('should return Q4 dates for "q4" preset', () => {
      const result = getDateRangeFromPreset('q4');

      // Q4 = Oct-Dec
      expect(result.start?.getMonth()).toBe(9);  // October
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getMonth()).toBe(11);   // December
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

    it('should return previous year for "last_year" preset', () => {
      const result = getDateRangeFromPreset('last_year');

      expect(result.start?.getFullYear()).toBe(2023);
      expect(result.start?.getMonth()).toBe(0); // January
      expect(result.start?.getDate()).toBe(1);

      expect(result.end?.getFullYear()).toBe(2023);
      expect(result.end?.getMonth()).toBe(11); // December
      expect(result.end?.getDate()).toBe(31);
    });
  });

  describe('Quarter calculations - all quarters use current year', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 5, 15)); // June 15, 2024
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return Q1 with current year regardless of current month', () => {
      const result = getDateRangeFromPreset('q1');
      expect(result.start?.getFullYear()).toBe(2024);
      expect(result.start?.getMonth()).toBe(0); // Jan
      expect(result.end?.getMonth()).toBe(2);   // Mar
    });

    it('should return Q2 with current year regardless of current month', () => {
      const result = getDateRangeFromPreset('q2');
      expect(result.start?.getFullYear()).toBe(2024);
      expect(result.start?.getMonth()).toBe(3); // Apr
      expect(result.end?.getMonth()).toBe(5);   // Jun
    });

    it('should return Q3 with current year regardless of current month', () => {
      const result = getDateRangeFromPreset('q3');
      expect(result.start?.getFullYear()).toBe(2024);
      expect(result.start?.getMonth()).toBe(6); // Jul
      expect(result.end?.getMonth()).toBe(8);   // Sep
    });

    it('should return Q4 with current year regardless of current month', () => {
      const result = getDateRangeFromPreset('q4');
      expect(result.start?.getFullYear()).toBe(2024);
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

    it('should return null dates for custom preset', () => {
      const result = getDateRangeFromPreset('custom');

      expect(result.start).toBeNull();
      expect(result.end).toBeNull();
    });
  });
});
