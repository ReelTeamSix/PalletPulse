import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius } from '@/src/constants/spacing';

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color?: string;
  trend?: number; // Optional percentage change
  onPress?: () => void;
}

export function MetricCard({
  icon,
  value,
  label,
  color = colors.primary,
  trend,
  onPress,
}: MetricCardProps) {
  const trendColor = trend && trend >= 0 ? colors.profit : colors.loss;
  const trendIcon = trend && trend >= 0 ? 'trending-up' : 'trending-down';

  const content = (
    <>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trendColor + '15' }]}>
            <Ionicons name={trendIcon} size={12} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {trend >= 0 ? '+' : ''}{trend}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </>
  );

  if (onPress) {
    return (
      <Card shadow="sm" padding="md" style={styles.card} onPress={onPress}>
        {content}
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="md" style={styles.card}>
      {content}
    </Card>
  );
}

interface MetricGridProps {
  children: React.ReactNode;
}

export function MetricGrid({ children }: MetricGridProps) {
  return (
    <View style={styles.grid}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
});
