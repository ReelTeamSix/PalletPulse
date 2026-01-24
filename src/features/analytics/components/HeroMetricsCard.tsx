// HeroMetricsCard - Displays 4 key analytics metrics in individual cards
// Always visible for all tiers - proves value to free users
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import type { HeroMetrics } from '../types/analytics';
import { formatCurrency, formatROI, getROIColor } from '@/src/lib/profit-utils';

interface HeroMetricsCardProps {
  metrics: HeroMetrics;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  isNegative?: boolean;
}

// Warm coral/salmon color for loss backgrounds (matches inspiration)
const LOSS_BACKGROUND = '#FEF2F2'; // Warm coral tint
const NEUTRAL_BACKGROUND = '#FFFFFF';

function MetricCard({ label, value, icon, accentColor, isNegative }: MetricCardProps) {
  // For negative metrics (loss), use a warm coral/salmon background
  const cardBackground = isNegative ? LOSS_BACKGROUND : NEUTRAL_BACKGROUND;
  const labelColor = isNegative ? colors.loss : colors.textSecondary;

  return (
    <View style={[styles.metricCard, { backgroundColor: cardBackground }]}>
      <View style={[styles.iconContainer, { backgroundColor: accentColor + '12' }]}>
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={[styles.metricLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

export function HeroMetricsCard({ metrics }: HeroMetricsCardProps) {
  const profitColor = metrics.totalProfit >= 0 ? colors.profit : colors.loss;
  const roiColor = getROIColor(metrics.avgROI, true);
  const isProfitNegative = metrics.totalProfit < 0;
  const isROINegative = metrics.avgROI < 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <MetricCard
          label="Total Profit"
          value={formatCurrency(metrics.totalProfit)}
          icon="cash-outline"
          accentColor={profitColor}
          isNegative={isProfitNegative}
        />
        <MetricCard
          label="Items Sold"
          value={metrics.totalItemsSold.toString()}
          icon="cart-outline"
          accentColor={colors.primary}
        />
      </View>
      <View style={styles.row}>
        <MetricCard
          label="Avg ROI"
          value={formatROI(metrics.avgROI)}
          icon={isROINegative ? 'trending-down-outline' : 'trending-up-outline'}
          accentColor={roiColor}
          isNegative={isROINegative}
        />
        <MetricCard
          label="In Stock"
          value={formatCurrency(metrics.activeInventoryValue)}
          icon="cube-outline"
          accentColor={colors.primary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16, // Softer, more rounded corners
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    // Softer shadow for floating effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    // Subtle border for definition
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metricValue: {
    fontSize: 22, // Slightly larger for emphasis
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
});
