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
  const percentChange = (() => {
    if (previousPeriodProfit === undefined || previousPeriodProfit === 0) {
      // If no previous data, show change based on current profit
      return totalProfit > 0 ? 100 : totalProfit < 0 ? -100 : 0;
    }
    return ((totalProfit - previousPeriodProfit) / Math.abs(previousPeriodProfit)) * 100;
  })();

  const isPositiveChange = percentChange >= 0;
  const hasSignificantChange = Math.abs(percentChange) >= 0.1;

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
          { backgroundColor: isPositiveChange ? colors.profit + '15' : colors.loss + '15' }
        ]}>
          <Ionicons
            name={isPositiveChange ? 'trending-up' : 'trending-down'}
            size={14}
            color={isPositiveChange ? colors.profit : colors.loss}
          />
          {hasSignificantChange && (
            <Text style={[
              styles.percentText,
              { color: isPositiveChange ? colors.profit : colors.loss }
            ]}>
              {isPositiveChange ? '+' : ''}{Math.round(percentChange)}%
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
