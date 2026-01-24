import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
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
  // New consolidated metrics
  roi?: number;
  profitGoal?: number | null;
  goalsEnabled?: boolean;
  pendingToListCount?: number;
  staleItemsCount?: number;
  onPendingPress?: () => void;
  onStalePress?: () => void;
  onGoalPress?: () => void;
}

// Get friendly label for goal period
const getGoalPeriodLabel = (period: TimePeriod): string => {
  switch (period) {
    case 'week': return 'Weekly';
    case 'month': return 'Monthly';
    case 'year': return 'Yearly';
    default: return '';
  }
};

export function HeroCard({
  totalProfit,
  soldCount,
  timePeriod,
  onTimePeriodChange,
  previousPeriodProfit,
  roi,
  profitGoal,
  goalsEnabled = true,
  pendingToListCount = 0,
  staleItemsCount = 0,
  onPendingPress,
  onStalePress,
  onGoalPress,
}: HeroCardProps) {
  const isProfitable = totalProfit >= 0;
  const displayValue = Math.abs(totalProfit);

  // Calculate goal progress percentage (for any time period except "all")
  const hasGoal = profitGoal !== null && profitGoal !== undefined && profitGoal > 0;
  const goalProgress = hasGoal
    ? Math.min(100, Math.max(0, (totalProfit / profitGoal) * 100))
    : null;

  // Don't show goal section for "all" time or if goals are disabled
  const showGoalSection = timePeriod !== 'all' && goalsEnabled;
  const goalPeriodLabel = getGoalPeriodLabel(timePeriod);

  // Show ROI badge when we have ROI data
  const showRoiBadge = roi !== undefined && !isNaN(roi);

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

      {/* Profit Label */}
      <Text style={styles.label}>TOTAL PROFIT</Text>

      {/* Profit Value with ROI Badge */}
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: isProfitable ? colors.profit : colors.loss }]}>
          {!isProfitable && '-'}{formatCurrency(displayValue)}
        </Text>
        {showRoiBadge && (
          <View style={[
            styles.roiBadge,
            { backgroundColor: (roi ?? 0) >= 0 ? colors.profit + '15' : colors.loss + '15' }
          ]}>
            <Text style={[
              styles.roiBadgeText,
              { color: (roi ?? 0) >= 0 ? colors.profit : colors.loss }
            ]}>
              {Math.round(roi ?? 0)}% ROI
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.subtitle}>
        {soldCount === 0
          ? 'No items sold in this period'
          : `Net earnings from ${soldCount} item${soldCount !== 1 ? 's' : ''} sold`}
      </Text>

      {/* Goal Progress Bar (for week/month/year, not "all") */}
      {showGoalSection && (
        <TouchableOpacity
          style={styles.goalSection}
          onPress={onGoalPress}
          activeOpacity={0.7}
        >
          {hasGoal ? (
            <>
              <View style={styles.goalHeader}>
                <View style={styles.goalLabelRow}>
                  <Text style={styles.goalLabel}>{goalPeriodLabel} Goal</Text>
                  <Ionicons name="pencil" size={12} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                </View>
                <Text style={styles.goalPercent}>{Math.round(goalProgress ?? 0)}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${goalProgress ?? 0}%`,
                      backgroundColor: (goalProgress ?? 0) >= 100 ? colors.profit : colors.primary,
                    }
                  ]}
                />
              </View>
              <Text style={styles.goalTarget}>
                Target: {formatCurrency(profitGoal ?? 0)}
              </Text>
            </>
          ) : (
            <View style={styles.setGoalRow}>
              <Ionicons name="flag-outline" size={18} color={colors.primary} />
              <Text style={styles.setGoalText}>Set a {goalPeriodLabel} Profit Goal</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Inline Metrics - Pending to List & Stale Items */}
      <View style={styles.inlineMetrics}>
        <TouchableOpacity
          style={styles.inlineMetric}
          onPress={onPendingPress}
          activeOpacity={0.7}
        >
          <Text style={styles.inlineMetricLabel}>PENDING TO LIST</Text>
          <View style={styles.inlineMetricValue}>
            <Ionicons
              name="layers-outline"
              size={16}
              color={pendingToListCount > 0 ? colors.primary : colors.textSecondary}
            />
            <Text style={[
              styles.inlineMetricNumber,
              { color: pendingToListCount > 0 ? colors.primary : colors.textPrimary }
            ]}>
              {pendingToListCount}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.metricDivider} />

        <TouchableOpacity
          style={styles.inlineMetric}
          onPress={onStalePress}
          activeOpacity={0.7}
        >
          <Text style={styles.inlineMetricLabel}>STALE ITEMS</Text>
          <View style={styles.inlineMetricValue}>
            <Ionicons
              name="time-outline"
              size={16}
              color={staleItemsCount > 0 ? colors.warning : colors.textSecondary}
            />
            <Text style={[
              styles.inlineMetricNumber,
              { color: staleItemsCount > 0 ? colors.warning : colors.textPrimary }
            ]}>
              {staleItemsCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
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
    marginBottom: spacing.lg,
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
  label: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.heroValue,
  },
  roiBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  roiBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  goalSection: {
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalPercent: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  goalTarget: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  setGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  setGoalText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
    flex: 1,
  },
  inlineMetrics: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  inlineMetric: {
    flex: 1,
    alignItems: 'center',
  },
  inlineMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  inlineMetricValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineMetricNumber: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
