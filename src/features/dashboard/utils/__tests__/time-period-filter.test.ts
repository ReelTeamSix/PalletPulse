import {
  TimePeriod,
  TIME_PERIOD_OPTIONS,
  getTimePeriodStartDate,
  isWithinTimePeriod,
  isTimestampWithinPeriod,
  getTimePeriodLabel,
  getTimePeriodShortLabel,
} from '../time-period-filter';

describe('time-period-filter', () => {
  // Fixed reference date for consistent tests: Wednesday, January 15, 2026
  const referenceDate = new Date('2026-01-15T12:00:00');

  describe('TIME_PERIOD_OPTIONS', () => {
    it('should have 4 options', () => {
      expect(TIME_PERIOD_OPTIONS).toHaveLength(4);
    });

    it('should have correct values', () => {
      const values = TIME_PERIOD_OPTIONS.map(o => o.value);
      expect(values).toEqual(['week', 'month', 'year', 'all']);
    });

    it('should have labels and short labels for each option', () => {
      TIME_PERIOD_OPTIONS.forEach(option => {
        expect(option.label).toBeTruthy();
        expect(option.shortLabel).toBeTruthy();
      });
    });
  });

  describe('getTimePeriodStartDate', () => {
    it('should return null for "all" period', () => {
      const result = getTimePeriodStartDate('all', referenceDate);
      expect(result).toBeNull();
    });

    it('should return start of week (Sunday) for "week" period', () => {
      // Jan 15, 2026 is a Thursday, so start of week is Jan 11 (Sunday)
      const result = getTimePeriodStartDate('week', referenceDate);
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2026);
      expect(result!.getMonth()).toBe(0); // January
      expect(result!.getDate()).toBe(11); // Sunday
      expect(result!.getHours()).toBe(0);
      expect(result!.getMinutes()).toBe(0);
    });

    it('should return start of month for "month" period', () => {
      const result = getTimePeriodStartDate('month', referenceDate);
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2026);
      expect(result!.getMonth()).toBe(0); // January
      expect(result!.getDate()).toBe(1);
    });

    it('should return start of year for "year" period', () => {
      const result = getTimePeriodStartDate('year', referenceDate);
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2026);
      expect(result!.getMonth()).toBe(0); // January
      expect(result!.getDate()).toBe(1);
    });

    it('should handle edge case: reference date is Sunday', () => {
      const sunday = new Date('2026-01-11T12:00:00'); // Sunday
      const result = getTimePeriodStartDate('week', sunday);
      expect(result).not.toBeNull();
      expect(result!.getDate()).toBe(11); // Same day (Sunday)
    });

    it('should handle edge case: reference date is first of month', () => {
      const firstOfMonth = new Date('2026-02-01T12:00:00');
      const result = getTimePeriodStartDate('month', firstOfMonth);
      expect(result).not.toBeNull();
      expect(result!.getDate()).toBe(1);
      expect(result!.getMonth()).toBe(1); // February
    });

    it('should handle edge case: reference date is January 1st', () => {
      const newYears = new Date('2026-01-01T12:00:00');
      const result = getTimePeriodStartDate('year', newYears);
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2026);
      expect(result!.getMonth()).toBe(0);
      expect(result!.getDate()).toBe(1);
    });
  });

  describe('isWithinTimePeriod', () => {
    it('should return true for any date with "all" period', () => {
      expect(isWithinTimePeriod('2020-01-01', 'all', referenceDate)).toBe(true);
      expect(isWithinTimePeriod('2025-06-15', 'all', referenceDate)).toBe(true);
      expect(isWithinTimePeriod('2026-01-15', 'all', referenceDate)).toBe(true);
    });

    it('should return false for null/undefined dates', () => {
      expect(isWithinTimePeriod(null, 'week', referenceDate)).toBe(false);
      expect(isWithinTimePeriod(undefined, 'month', referenceDate)).toBe(false);
      expect(isWithinTimePeriod('', 'year', referenceDate)).toBe(false);
    });

    describe('week period', () => {
      it('should return true for dates within current week', () => {
        // Jan 11-17, 2026 is the week containing Jan 15
        expect(isWithinTimePeriod('2026-01-11', 'week', referenceDate)).toBe(true);
        expect(isWithinTimePeriod('2026-01-15', 'week', referenceDate)).toBe(true);
        expect(isWithinTimePeriod('2026-01-17', 'week', referenceDate)).toBe(true);
      });

      it('should return false for dates before current week', () => {
        expect(isWithinTimePeriod('2026-01-10', 'week', referenceDate)).toBe(false);
        expect(isWithinTimePeriod('2026-01-01', 'week', referenceDate)).toBe(false);
        expect(isWithinTimePeriod('2025-12-31', 'week', referenceDate)).toBe(false);
      });
    });

    describe('month period', () => {
      it('should return true for dates within current month', () => {
        expect(isWithinTimePeriod('2026-01-01', 'month', referenceDate)).toBe(true);
        expect(isWithinTimePeriod('2026-01-15', 'month', referenceDate)).toBe(true);
        expect(isWithinTimePeriod('2026-01-31', 'month', referenceDate)).toBe(true);
      });

      it('should return false for dates before current month', () => {
        expect(isWithinTimePeriod('2025-12-31', 'month', referenceDate)).toBe(false);
        expect(isWithinTimePeriod('2025-12-01', 'month', referenceDate)).toBe(false);
      });
    });

    describe('year period', () => {
      it('should return true for dates within current year', () => {
        expect(isWithinTimePeriod('2026-01-01', 'year', referenceDate)).toBe(true);
        expect(isWithinTimePeriod('2026-06-15', 'year', referenceDate)).toBe(true);
        expect(isWithinTimePeriod('2026-12-31', 'year', referenceDate)).toBe(true);
      });

      it('should return false for dates before current year', () => {
        expect(isWithinTimePeriod('2025-12-31', 'year', referenceDate)).toBe(false);
        expect(isWithinTimePeriod('2025-01-01', 'year', referenceDate)).toBe(false);
      });
    });
  });

  describe('isTimestampWithinPeriod', () => {
    it('should return true for any timestamp with "all" period', () => {
      expect(isTimestampWithinPeriod('2020-01-01T00:00:00Z', 'all', referenceDate)).toBe(true);
      expect(isTimestampWithinPeriod(new Date('2020-01-01'), 'all', referenceDate)).toBe(true);
    });

    it('should return false for null/undefined timestamps', () => {
      expect(isTimestampWithinPeriod(null, 'week', referenceDate)).toBe(false);
      expect(isTimestampWithinPeriod(undefined, 'month', referenceDate)).toBe(false);
    });

    it('should handle string timestamps', () => {
      expect(isTimestampWithinPeriod('2026-01-15T10:00:00Z', 'week', referenceDate)).toBe(true);
      expect(isTimestampWithinPeriod('2026-01-01T10:00:00Z', 'week', referenceDate)).toBe(false);
    });

    it('should handle Date objects', () => {
      expect(isTimestampWithinPeriod(new Date('2026-01-15'), 'month', referenceDate)).toBe(true);
      expect(isTimestampWithinPeriod(new Date('2025-12-15'), 'month', referenceDate)).toBe(false);
    });
  });

  describe('getTimePeriodLabel', () => {
    it('should return correct labels', () => {
      expect(getTimePeriodLabel('week')).toBe('This Week');
      expect(getTimePeriodLabel('month')).toBe('This Month');
      expect(getTimePeriodLabel('year')).toBe('This Year');
      expect(getTimePeriodLabel('all')).toBe('All Time');
    });

    it('should return "All Time" for unknown period', () => {
      expect(getTimePeriodLabel('unknown' as TimePeriod)).toBe('All Time');
    });
  });

  describe('getTimePeriodShortLabel', () => {
    it('should return correct short labels', () => {
      expect(getTimePeriodShortLabel('week')).toBe('Week');
      expect(getTimePeriodShortLabel('month')).toBe('Month');
      expect(getTimePeriodShortLabel('year')).toBe('Year');
      expect(getTimePeriodShortLabel('all')).toBe('All');
    });

    it('should return "All" for unknown period', () => {
      expect(getTimePeriodShortLabel('unknown' as TimePeriod)).toBe('All');
    });
  });
});
