import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { formatCurrency } from '@/src/lib/profit-utils';

interface HeroCardProps {
  totalProfit: number;
  soldCount: number;
}

export function HeroCard({
  totalProfit,
  soldCount,
}: HeroCardProps) {
  const isProfitable = totalProfit >= 0;
  const displayValue = Math.abs(totalProfit);

  return (
    <Card shadow="lg" padding="lg" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>TOTAL PROFIT</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: isProfitable ? colors.profit + '15' : colors.loss + '15' }
        ]}>
          <Ionicons
            name={isProfitable ? 'trending-up' : 'trending-down'}
            size={16}
            color={isProfitable ? colors.profit : colors.loss}
          />
        </View>
      </View>

      <Text style={[styles.value, { color: isProfitable ? colors.profit : colors.loss }]}>
        {!isProfitable && '-'}{formatCurrency(displayValue)}
      </Text>

      <Text style={styles.subtitle}>
        Net profit calculated from {soldCount} sold item{soldCount !== 1 ? 's' : ''}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...typography.heroValue,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
