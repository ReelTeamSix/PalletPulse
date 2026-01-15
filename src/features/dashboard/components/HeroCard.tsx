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
  trendPercentage?: number;
  periodLabel?: string;
}

export function HeroCard({
  totalProfit,
  soldCount,
  trendPercentage,
  periodLabel = 'all time',
}: HeroCardProps) {
  const isProfitable = totalProfit >= 0;
  const displayValue = Math.abs(totalProfit);

  return (
    <Card shadow="lg" padding="lg" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>TOTAL PROFIT</Text>
        {trendPercentage !== undefined && (
          <View style={[
            styles.trendBadge,
            { backgroundColor: trendPercentage >= 0 ? colors.profit + '20' : colors.loss + '20' }
          ]}>
            <Ionicons
              name={trendPercentage >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={trendPercentage >= 0 ? colors.profit : colors.loss}
            />
            <Text style={[
              styles.trendText,
              { color: trendPercentage >= 0 ? colors.profit : colors.loss }
            ]}>
              {trendPercentage >= 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: isProfitable ? colors.profit : colors.loss }]}>
        {!isProfitable && '-'}{formatCurrency(displayValue)}
      </Text>

      <Text style={styles.subtitle}>
        Net profit from {soldCount} sold item{soldCount !== 1 ? 's' : ''}
      </Text>

      <View style={styles.chartContainer}>
        <MiniBarChart />
      </View>
    </Card>
  );
}

function MiniBarChart() {
  const bars = [0.3, 0.5, 0.7, 0.85, 1.0, 0.9];

  return (
    <View style={styles.barChart}>
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: 40 * height,
              backgroundColor: index === bars.length - 1 ? colors.profit : colors.profit + '60',
            }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  trendText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  value: {
    ...typography.heroValue,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  chartContainer: {
    marginTop: spacing.sm,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40,
    gap: spacing.sm,
  },
  bar: {
    flex: 1,
    borderRadius: borderRadius.sm,
    minWidth: 24,
  },
});
