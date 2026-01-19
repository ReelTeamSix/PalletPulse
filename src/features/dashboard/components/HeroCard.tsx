import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { shadows } from '@/src/constants/shadows';
import { formatCurrency } from '@/src/lib/profit-utils';
import {
  TimePeriod,
  TIME_PERIOD_OPTIONS,
  getTimePeriodLabel,
} from '../utils/time-period-filter';

interface HeroCardProps {
  totalProfit: number;
  soldCount: number;
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  previousPeriodProfit?: number;
}

export function HeroCard({
  totalProfit,
  soldCount,
  timePeriod,
  onTimePeriodChange,
  previousPeriodProfit,
}: HeroCardProps) {
  const isProfitable = totalProfit >= 0;
  const displayValue = Math.abs(totalProfit);

  // Calculate percentage change from previous period
  // Only show when:
  // - Previous period data exists and had significant activity (> $1)
  // - Current period is PROFITABLE (don't show % when losing money - it's confusing)
  // - Not "All Time" period (no comparison possible)
  // - Actual change occurred (current != previous)
  const hasMeaningfulComparison =
    previousPeriodProfit !== undefined &&
    Math.abs(previousPeriodProfit) > 1 &&
    totalProfit > 0 && // Only show % when profitable
    totalProfit !== previousPeriodProfit &&
    timePeriod !== 'all';

  const percentChange = hasMeaningfulComparison
    ? ((totalProfit - previousPeriodProfit) / Math.abs(previousPeriodProfit)) * 100
    : null;

  const isPositiveChange = percentChange !== null ? percentChange >= 0 : isProfitable;
  // Only show if there's a meaningful change (at least 1%)
  const showPercentage = percentChange !== null && Math.abs(percentChange) >= 1;

  return (
    <Card shadow="lg" padding="lg" style={styles.card}>
      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        {TIME_PERIOD_OPTIONS.map((option) => {
          const isSelected = option.value === timePeriod;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.periodPill,
                isSelected && styles.periodPillSelected,
              ]}
              onPress={() => onTimePeriodChange(option.value)}
            >
              <Text
                style={[
                  styles.periodPillText,
                  isSelected && styles.periodPillTextSelected,
                ]}
              >
                {option.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.header}>
        <Text style={styles.label}>{getTimePeriodLabel(timePeriod).toUpperCase()} PROFIT</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: isProfitable ? colors.profit + '15' : colors.loss + '15' }
        ]}>
          <Ionicons
            name={isProfitable ? 'trending-up' : 'trending-down'}
            size={14}
            color={isProfitable ? colors.profit : colors.loss}
          />
          {showPercentage && (
            <Text style={[
              styles.percentText,
              // Color matches profit status for visual consistency
              { color: isProfitable ? colors.profit : colors.loss }
            ]}>
              {isPositiveChange ? '+' : ''}{Math.round(percentChange!)}%
            </Text>
          )}
        </View>
      </View>

      <Text style={[styles.value, { color: isProfitable ? colors.profit : colors.loss }]}>
        {!isProfitable && '-'}{formatCurrency(displayValue)}
      </Text>

      <Text style={styles.subtitle}>
        {soldCount === 0
          ? 'No items sold in this period'
          : `From ${soldCount} sold item${soldCount !== 1 ? 's' : ''}`}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  periodPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillSelected: {
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  periodPillText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  periodPillTextSelected: {
    color: colors.primary,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  percentText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
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
