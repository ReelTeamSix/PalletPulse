// HeroMetricsCard - Displays 4 key analytics metrics
// Always visible for all tiers - proves value to free users
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import type { HeroMetrics } from '../types/analytics';
import { formatCurrency, formatROI, getROIColor } from '@/src/lib/profit-utils';

interface HeroMetricsCardProps {
  metrics: HeroMetrics;
}

interface MetricItemProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}

function MetricItem({ label, value, icon, color }: MetricItemProps) {
  return (
    <View style={styles.metricItem}>
      <View style={[styles.iconContainer, color && { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color || colors.primary} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function HeroMetricsCard({ metrics }: HeroMetricsCardProps) {
  const profitColor = metrics.totalProfit >= 0 ? colors.profit : colors.loss;
  const roiColor = getROIColor(metrics.avgROI, true);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <MetricItem
          label="Total Profit"
          value={formatCurrency(metrics.totalProfit)}
          icon="cash-outline"
          color={profitColor}
        />
        <MetricItem
          label="Items Sold"
          value={metrics.totalItemsSold.toString()}
          icon="cart-outline"
          color={colors.primary}
        />
      </View>
      <View style={styles.row}>
        <MetricItem
          label="Avg ROI"
          value={formatROI(metrics.avgROI)}
          icon="trending-up-outline"
          color={roiColor}
        />
        <MetricItem
          label="Active Value"
          value={formatCurrency(metrics.activeInventoryValue)}
          icon="cube-outline"
          color={colors.textSecondary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
