// Pallet Pro Color System
// Modern design with elevated cards on light gray backgrounds

export const colors = {
  // Semantic - Business Metrics
  profit: '#22C55E',      // Modern green - positive profit, success
  loss: '#EF4444',        // Modern red - negative profit, errors
  warning: '#F59E0B',     // Amber - actionable items, stale inventory
  neutral: '#9E9E9E',     // Grey - inactive, unsold

  // Status Colors
  statusUnprocessed: '#9E9E9E',  // Grey
  statusListed: '#2563EB',       // Blue
  statusSold: '#22C55E',         // Green
  statusStale: '#F59E0B',        // Amber

  // Primary Brand
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryDark: '#1D4ED8',

  // Background - Light Mode
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',  // Light gray for screen backgrounds
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',  // White cards on gray background

  // Background - Dark Mode
  backgroundDark: '#121212',
  surfaceDark: '#1E1E1E',
  surfaceElevatedDark: '#2C2C2C',

  // Text - Light Mode
  textPrimary: '#1E293B',   // Darker for better contrast
  textSecondary: '#64748B', // Slate gray
  textTertiary: '#94A3B8',  // Light slate for helper text
  textDisabled: '#9E9E9E',
  textInverse: '#FFFFFF',   // White text on dark backgrounds

  // Text - Dark Mode
  textPrimaryDark: '#FFFFFF',
  textSecondaryDark: '#B0B0B0',
  textDisabledDark: '#757575',

  // Borders
  border: '#E2E8F0',  // Lighter border
  borderDark: '#424242',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',

  // Modal backgrounds
  modalIconDelete: '#FEE2E2',   // Light red for delete icon background
  modalIconWarning: '#FEF3C7', // Light amber for warning icon background
  modalIconSuccess: '#DCFCE7', // Light green for success icon background
  modalIconInfo: '#DBEAFE',    // Light blue for info icon background

  // Semantic backgrounds
  warningBackground: '#FEF3C7', // Light amber for warning states
  errorBackground: '#FEE2E2',   // Light red for error states
  successBackground: '#DCFCE7', // Light green for success states

  // Skeleton loading
  skeletonBase: '#E8E8E8',      // Base skeleton color
  skeletonHighlight: '#F5F5F5', // Highlighted skeleton color (shimmer)
} as const;

export type ColorKey = keyof typeof colors;
