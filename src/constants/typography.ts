// PalletPulse Typography System
// Consistent text styles across the app

import { TextStyle } from 'react-native';
import { fontSize, fontWeight } from './spacing';

type TypographyStyle = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight'>;

export const typography: Record<string, TypographyStyle> = {
  // Screen titles
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  screenSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
  },

  // Section headers (uppercase labels)
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Card content
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 20,
  },

  // Metrics and values
  heroValue: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 42,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 16,
  },

  // Body text
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 16,
  },

  // Labels and badges
  label: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.25,
    lineHeight: 16,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 14,
  },

  // Buttons
  buttonLarge: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 22,
  },
  button: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 20,
  },
} as const;

export type TypographyKey = keyof typeof typography;
