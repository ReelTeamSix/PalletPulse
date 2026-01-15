import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize } from '@/src/constants/spacing';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: colors.primaryLight, text: colors.primary },
  success: { bg: '#DCFCE7', text: colors.profit },
  warning: { bg: '#FEF3C7', text: colors.warning },
  error: { bg: '#FEE2E2', text: colors.loss },
  info: { bg: '#DBEAFE', text: colors.primary },
  neutral: { bg: '#F1F5F9', text: colors.textSecondary },
};

export function Badge({
  label,
  variant = 'default',
  size = 'sm',
  color,
  backgroundColor,
  style,
}: BadgeProps) {
  const colors_config = variantColors[variant];
  const bgColor = backgroundColor || colors_config.bg;
  const textColor = color || colors_config.text;

  return (
    <View style={[
      styles.badge,
      size === 'sm' ? styles.badgeSm : styles.badgeMd,
      { backgroundColor: bgColor },
      style,
    ]}>
      <Text style={[
        styles.label,
        size === 'sm' ? styles.labelSm : styles.labelMd,
        { color: textColor },
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
  labelSm: {
    fontSize: fontSize.xs,
  },
  labelMd: {
    fontSize: fontSize.sm,
  },
});
