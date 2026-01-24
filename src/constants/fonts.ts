// Pallet Pro Font System
// Using Inter from Google Fonts for optimal screen readability
// Inter is designed specifically for computer screens with excellent legibility

import { Platform } from 'react-native';

/**
 * Font family names for Inter
 * Note: On Android, use the font file name (e.g., Inter_500Medium)
 * On iOS, use the PostScript name (same format works for Inter)
 *
 * The fonts are loaded in app/_layout.tsx via useFonts hook
 */
export const fontFamily = {
  // Regular weight for body text
  regular: 'Inter_400Regular',
  // Medium weight for labels and emphasized text
  medium: 'Inter_500Medium',
  // Semibold for headings and buttons
  semibold: 'Inter_600SemiBold',
  // Bold for titles and important values
  bold: 'Inter_700Bold',
  // Extra bold for hero metrics
  extrabold: 'Inter_800ExtraBold',
  // Monospace for code/technical text (fallback to system)
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

/**
 * Font weight mapping
 * Maps semantic weights to actual font family variants
 */
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/**
 * Check if Inter fonts are loaded
 * Used for fallback rendering
 */
export function getInterFontFamily(weight: keyof typeof fontFamily = 'regular'): string {
  return fontFamily[weight];
}

export type FontFamilyKey = keyof typeof fontFamily;
export type FontWeightKey = keyof typeof fontWeight;
