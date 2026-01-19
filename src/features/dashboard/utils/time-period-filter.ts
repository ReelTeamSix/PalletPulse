/**
 * Time Period Filter Utilities
 *
 * Provides date filtering for dashboard metrics by time period.
 */

export type TimePeriod = 'week' | 'month' | 'year' | 'all';

export interface TimePeriodOption {
  value: TimePeriod;
  label: string;
  shortLabel: string;
}

export const TIME_PERIOD_OPTIONS: TimePeriodOption[] = [
  { value: 'week', label: 'This Week', shortLabel: 'Week' },
  { value: 'month', label: 'This Month', shortLabel: 'Month' },
  { value: 'year', label: 'This Year', shortLabel: 'Year' },
  { value: 'all', label: 'All Time', shortLabel: 'All' },
];

/**
 * Get the start date for a given time period
 * Returns null for 'all' (no filtering)
 */
export function getTimePeriodStartDate(period: TimePeriod, referenceDate: Date = new Date()): Date | null {
  if (period === 'all') {
    return null;
  }

  const date = new Date(referenceDate);
  // Reset to start of day in local time
  date.setHours(0, 0, 0, 0);

  switch (period) {
    case 'week': {
      // Get start of current week (Sunday)
      const dayOfWeek = date.getDay();
      date.setDate(date.getDate() - dayOfWeek);
      return date;
    }
    case 'month': {
      // Get start of current month
      date.setDate(1);
      return date;
    }
    case 'year': {
      // Get start of current year
      date.setMonth(0, 1);
      return date;
    }
    default:
      return null;
  }
}

/**
 * Check if a date string falls within the given time period
 */
export function isWithinTimePeriod(
  dateString: string | null | undefined,
  period: TimePeriod,
  referenceDate: Date = new Date()
): boolean {
  if (!dateString) {
    return false;
  }

  if (period === 'all') {
    return true;
  }

  const startDate = getTimePeriodStartDate(period, referenceDate);
  if (!startDate) {
    return true;
  }

  // Parse the date string as local date
  const itemDate = new Date(dateString + 'T00:00:00');
  return itemDate >= startDate;
}

/**
 * Check if a timestamp falls within the given time period
 */
export function isTimestampWithinPeriod(
  timestamp: string | Date | null | undefined,
  period: TimePeriod,
  referenceDate: Date = new Date()
): boolean {
  if (!timestamp) {
    return false;
  }

  if (period === 'all') {
    return true;
  }

  const startDate = getTimePeriodStartDate(period, referenceDate);
  if (!startDate) {
    return true;
  }

  const itemDate = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return itemDate >= startDate;
}

/**
 * Get a human-readable label for the time period
 */
export function getTimePeriodLabel(period: TimePeriod): string {
  const option = TIME_PERIOD_OPTIONS.find(o => o.value === period);
  return option?.label ?? 'All Time';
}

/**
 * Get the short label for the time period
 */
export function getTimePeriodShortLabel(period: TimePeriod): string {
  const option = TIME_PERIOD_OPTIONS.find(o => o.value === period);
  return option?.shortLabel ?? 'All';
}

/**
 * Get the date range for the previous period (for comparison)
 * Returns { start, end } dates for the previous period
 */
export function getPreviousPeriodRange(
  period: TimePeriod,
  referenceDate: Date = new Date()
): { start: Date | null; end: Date | null } {
  if (period === 'all') {
    return { start: null, end: null };
  }

  const currentPeriodStart = getTimePeriodStartDate(period, referenceDate);
  if (!currentPeriodStart) {
    return { start: null, end: null };
  }

  // End of previous period is start of current period (minus 1ms)
  const end = new Date(currentPeriodStart.getTime() - 1);

  // Calculate start of previous period
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'week': {
      // Go back 7 days from current period start
      start.setDate(start.getDate() - 6);
      return { start, end };
    }
    case 'month': {
      // Go to first of previous month
      start.setDate(1);
      return { start, end };
    }
    case 'year': {
      // Go to first of previous year
      start.setMonth(0, 1);
      return { start, end };
    }
    default:
      return { start: null, end: null };
  }
}

/**
 * Check if a date string falls within a specific date range
 */
export function isWithinDateRange(
  dateString: string | null | undefined,
  start: Date | null,
  end: Date | null
): boolean {
  if (!dateString || !start || !end) {
    return false;
  }

  // Parse the date string as local date
  const itemDate = new Date(dateString + 'T00:00:00');
  return itemDate >= start && itemDate <= end;
}
