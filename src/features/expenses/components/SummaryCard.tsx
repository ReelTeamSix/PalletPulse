import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { formatCurrency } from '@/src/lib/profit-utils';

interface SummaryCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  subtitle?: string;
  valueColor?: string;
  valuePrefix?: string;
  onPress?: () => void;
}

export function SummaryCard({
  icon,
  label,
  value,
  subtitle,
  valueColor = colors.textPrimary,
  valuePrefix = '',
  onPress,
}: SummaryCardProps) {
  return (
    <Card shadow="sm" padding="md" style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: valueColor }]}>
        {valuePrefix}{formatCurrency(value)}
      </Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Card>
  );
}

interface SummaryCardRowProps {
  children: React.ReactNode;
}

export function SummaryCardRow({ children }: SummaryCardRowProps) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textDisabled,
    marginTop: 2,
  },
});
