// Pallet Pro Typography System
// Using Inter font for optimal screen readability
// Line heights follow 1.4-1.6x ratio for accessibility

import { TextStyle } from 'react-native';
import { fontFamily } from './fonts';
import { fontSize } from './spacing';

/**
 * Typography style type with all text properties
 */
type TypographyStyle = Pick<
  TextStyle,
  'fontSize' | 'fontWeight' | 'fontFamily' | 'letterSpacing' | 'lineHeight'
>;

/**
 * Comprehensive typography system for Pallet Pro
 *
 * Guidelines:
 * - Body text: 16px minimum (WCAG 2.0)
 * - Line height: 1.4-1.6x font size
 * - Letter spacing: Negative for large headings, neutral/positive for body
 * - Font weights: Regular (400) for body, Semibold (600) for emphasis, Bold (700) for headings
 */
export const typography: Record<string, TypographyStyle> = {
  // ===================
  // SCREEN TITLES
  // ===================

  /** Large screen titles (28px) - Dashboard, Settings, etc. */
  screenTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34, // 1.21x - tighter for large text
  },

  /** Screen subtitle/description (17px) */
  screenSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 24, // 1.41x
  },

  // ===================
  // SECTION HEADERS
  // ===================

  /** Uppercase section labels (12px) - "TOTAL PROFIT", "SETTINGS" */
  sectionHeader: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 16,
  },

  // ===================
  // CARD CONTENT
  // ===================

  /** Card titles (17px) - Pallet names, item names */
  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 24, // 1.41x
  },

  /** Card subtitles/descriptions (16px) */
  cardSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22, // 1.38x
  },

  // ===================
  // METRICS & VALUES
  // ===================

  /** Large hero metrics (36px) - Main profit display */
  heroValue: {
    fontFamily: fontFamily.bold,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1, // Tighter for large numbers
    lineHeight: 42, // 1.17x - compact for metrics
  },

  /** Medium metrics (24px) - Card profit/ROI values */
  metricValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    letterSpacing: -0.75, // Tighter for numbers
    lineHeight: 30, // 1.25x
  },

  /** Metric labels (12px) - "COST", "PROFIT", "ROI" */
  metricLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    fontWeight: '500',
    letterSpacing: 0.5, // Wider for uppercase labels
    lineHeight: 16,
  },

  // ===================
  // BODY TEXT
  // ===================

  /** Large body text (17px) - Important descriptions */
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 26, // 1.53x - optimal for reading
  },

  /** Standard body text (16px) - Default content */
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 24, // 1.5x - optimal for reading
  },

  /** Small body text (12px) - Secondary info, timestamps */
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 18, // 1.5x
  },

  // ===================
  // LABELS & BADGES
  // ===================

  /** Standard labels (12px) - Form labels, list labels */
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    fontWeight: '500',
    letterSpacing: 0.25,
    lineHeight: 18, // 1.5x
  },

  /** Small labels (11px) - Badge text, compact labels */
  labelSmall: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 16, // 1.45x
  },

  // ===================
  // BUTTONS
  // ===================

  /** Large buttons (17px) - Primary CTAs */
  buttonLarge: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 24,
  },

  /** Standard buttons (16px) - Most buttons */
  button: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 22,
  },

  // ===================
  // INPUTS
  // ===================

  /** Input text (16px) - Text field content */
  input: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
  },

  /** Input placeholder (16px) - Placeholder text */
  inputPlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
  },

  /** Input label (12px) - Form field labels */
  inputLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    fontWeight: '500',
    letterSpacing: 0.25,
    lineHeight: 18,
  },

  // ===================
  // NAVIGATION
  // ===================

  /** Tab bar labels (11px) - Bottom tab text */
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 14,
  },

  /** Navigation header (18px) */
  navTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 24,
  },

  // ===================
  // SPECIAL
  // ===================

  /** Hint/helper text (12px) - Form hints, tooltips */
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 18,
  },

  /** Error text (12px) - Validation errors */
  error: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 18,
  },

  /** Link text (16px) - Clickable links */
  link: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 24,
  },
} as const;

export type TypographyKey = keyof typeof typography;
