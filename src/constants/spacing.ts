// Pallet Pro Spacing System
// Consistent spacing values used throughout the app

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/**
 * Font sizes following mobile accessibility best practices
 * - Minimum body text: 16px (WCAG 2.0, Material Design)
 * - Minimum readable: 11px (accessibility threshold)
 * - Large text: 18px+ (WCAG large text threshold)
 */
export const fontSize = {
  /** Minimum readable - use sparingly (badges, timestamps) */
  xs: 11,
  /** Small text - labels, captions */
  sm: 12,
  /** Body text - primary content (WCAG compliant) */
  md: 16,
  /** Large body - emphasized content */
  lg: 17,
  /** Subheadings */
  xl: 18,
  /** Section titles */
  xxl: 24,
  /** Screen titles */
  xxxl: 32,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type FontSizeKey = keyof typeof fontSize;
