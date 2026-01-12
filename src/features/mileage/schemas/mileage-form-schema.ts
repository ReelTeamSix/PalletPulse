// Mileage Trip Form Validation Schema
import { z } from 'zod';
import { TripPurpose, APP_SETTING_DEFAULTS } from '@/src/types/database';
import { useAppSettingsStore } from '@/src/stores/admin-store';

// Trip purpose options for dropdown
export const TRIP_PURPOSE_OPTIONS: { label: string; value: TripPurpose }[] = [
  { label: 'Pallet Pickup', value: 'pallet_pickup' },
  { label: 'Thrift Store Run', value: 'thrift_run' },
  { label: 'Garage Sale Circuit', value: 'garage_sale' },
  { label: 'Post Office / Shipping', value: 'post_office' },
  { label: 'Auction', value: 'auction' },
  { label: 'Sourcing Run', value: 'sourcing' },
  { label: 'Other', value: 'other' },
];

// Default IRS mileage rate from centralized app settings
// Note: Use getCurrentMileageRate() for the most up-to-date rate
export const DEFAULT_IRS_MILEAGE_RATE = APP_SETTING_DEFAULTS.irs_mileage_rate.value;

/**
 * Get the current IRS mileage rate from app settings
 * Falls back to DEFAULT_IRS_MILEAGE_RATE if not available
 */
export function getCurrentMileageRate(): number {
  return useAppSettingsStore.getState().getMileageRate();
}

// Mileage trip form schema
export const mileageFormSchema = z.object({
  // Trip date (required)
  trip_date: z
    .string()
    .min(1, 'Trip date is required')
    .refine(
      (val) => {
        // Validate YYYY-MM-DD format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(val)) return false;
        const date = new Date(val + 'T00:00:00');
        return !isNaN(date.getTime());
      },
      { message: 'Invalid date format' }
    )
    .refine(
      (val) => {
        // No future dates
        const tripDate = new Date(val + 'T00:00:00');
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return tripDate <= today;
      },
      { message: 'Trip date cannot be in the future' }
    ),

  // Trip purpose (required)
  purpose: z.enum([
    'pallet_pickup',
    'thrift_run',
    'garage_sale',
    'post_office',
    'auction',
    'sourcing',
    'other',
  ] as const),

  // Miles driven (required)
  miles: z
    .number({ message: 'Miles must be a number' })
    .min(0.1, 'Miles must be greater than 0')
    .max(9999, 'Miles cannot exceed 9,999'),

  // IRS mileage rate at time of trip (auto-populated)
  mileage_rate: z
    .number({ message: 'Mileage rate must be a number' })
    .min(0, 'Mileage rate cannot be negative')
    .max(10, 'Mileage rate seems too high'),

  // Linked pallet IDs (optional, multi-select)
  pallet_ids: z
    .array(z.string().uuid('Invalid pallet ID'))
    .optional()
    .nullable()
    .transform((val) => val || []),

  // Notes (optional)
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform((val) => val || null),
});

// Type inference
export type MileageFormData = z.infer<typeof mileageFormSchema>;

// Default values for new mileage form
export const getDefaultMileageFormValues = (
  mileageRate: number = DEFAULT_IRS_MILEAGE_RATE
): MileageFormData => ({
  trip_date: getLocalDateString(),
  purpose: 'pallet_pickup',
  miles: 0,
  mileage_rate: mileageRate,
  pallet_ids: [],
  notes: null,
});

// Helper to get local date string in YYYY-MM-DD format
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate deduction from miles and rate
export function calculateDeduction(
  miles: number | null,
  mileageRate: number | null
): number {
  if (miles === null || mileageRate === null) return 0;
  return miles * mileageRate;
}

// Format deduction for display
export function formatDeduction(deduction: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(deduction);
}

// Format miles for display
export function formatMiles(miles: number): string {
  if (miles === Math.floor(miles)) {
    return `${miles} mi`;
  }
  return `${miles.toFixed(1)} mi`;
}

// Format mileage rate for display
export function formatMileageRate(rate: number): string {
  return `$${rate.toFixed(3)}/mi`;
}

// Format trip purpose for display
export function formatTripPurpose(purpose: TripPurpose): string {
  const option = TRIP_PURPOSE_OPTIONS.find((o) => o.value === purpose);
  return option?.label ?? purpose;
}

// Format date for display (e.g., "Jan 11, 2026")
export function formatDisplayDate(dateString: string): string {
  // Parse as local date
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get purpose color for UI badges
export function getPurposeColor(purpose: TripPurpose): string {
  switch (purpose) {
    case 'pallet_pickup':
      return '#1976D2'; // Blue
    case 'thrift_run':
      return '#7B1FA2'; // Purple
    case 'garage_sale':
      return '#388E3C'; // Green
    case 'post_office':
      return '#F57C00'; // Orange
    case 'auction':
      return '#C62828'; // Red
    case 'sourcing':
      return '#00796B'; // Teal
    case 'other':
    default:
      return '#757575'; // Grey
  }
}

// Validate and calculate year-to-date mileage
export function calculateYTDMileage(
  trips: { trip_date: string; miles: number }[],
  year: number = new Date().getFullYear()
): { totalMiles: number; totalDeduction: number; tripCount: number } {
  const yearTrips = trips.filter((trip) => {
    const tripYear = new Date(trip.trip_date + 'T00:00:00').getFullYear();
    return tripYear === year;
  });

  const totalMiles = yearTrips.reduce((sum, trip) => sum + trip.miles, 0);
  const tripCount = yearTrips.length;

  // Use current rate for YTD calculation (approximate)
  const totalDeduction = totalMiles * DEFAULT_IRS_MILEAGE_RATE;

  return { totalMiles, totalDeduction, tripCount };
}

// Get trips for a specific month
export function getTripsForMonth(
  trips: { trip_date: string; miles: number; deduction?: number | null }[],
  year: number,
  month: number
): typeof trips {
  return trips.filter((trip) => {
    const [tripYear, tripMonth] = trip.trip_date.split('-').map(Number);
    return tripYear === year && tripMonth === month;
  });
}

// Calculate monthly summary
export function calculateMonthlySummary(
  trips: { trip_date: string; miles: number; deduction?: number | null }[],
  year: number,
  month: number
): { totalMiles: number; totalDeduction: number; tripCount: number } {
  const monthTrips = getTripsForMonth(trips, year, month);

  const totalMiles = monthTrips.reduce((sum, trip) => sum + trip.miles, 0);
  const totalDeduction = monthTrips.reduce(
    (sum, trip) => sum + (trip.deduction ?? trip.miles * DEFAULT_IRS_MILEAGE_RATE),
    0
  );
  const tripCount = monthTrips.length;

  return { totalMiles, totalDeduction, tripCount };
}
