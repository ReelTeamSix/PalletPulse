// PalletPulse Color System
// Based on PALLETPULSE_ONESHOT_CONTEXT.md UI/UX guidelines

export const colors = {
  // Semantic - Business Metrics
  profit: '#2E7D32',      // Money green - positive profit, success
  loss: '#D32F2F',        // Red - negative profit, errors
  warning: '#FFA000',     // Orange/gold - actionable items, stale inventory
  neutral: '#9E9E9E',     // Grey - inactive, unsold

  // Status Colors
  statusUnprocessed: '#9E9E9E',  // Grey
  statusListed: '#1976D2',       // Blue
  statusSold: '#2E7D32',         // Green
  statusStale: '#FFA000',        // Orange

  // Primary Brand
  primary: '#1976D2',
  primaryLight: '#42A5F5',
  primaryDark: '#1565C0',

  // Background - Light Mode
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',

  // Background - Dark Mode
  backgroundDark: '#121212',
  surfaceDark: '#1E1E1E',
  surfaceElevatedDark: '#2C2C2C',

  // Text - Light Mode
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#9E9E9E',

  // Text - Dark Mode
  textPrimaryDark: '#FFFFFF',
  textSecondaryDark: '#B0B0B0',
  textDisabledDark: '#757575',

  // Borders
  border: '#E0E0E0',
  borderDark: '#424242',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
} as const;

export type ColorKey = keyof typeof colors;
