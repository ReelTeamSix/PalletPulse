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
