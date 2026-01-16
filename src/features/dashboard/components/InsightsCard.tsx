import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Insight, InsightType, InsightIcon } from '../utils/insights-engine';

interface InsightsCardProps {
  insights: Insight[];
  onInsightPress?: (insight: Insight) => void;
}

const ICON_MAP: Record<InsightIcon, keyof typeof Ionicons.glyphMap> = {
  trophy: 'trophy',
  'alert-circle': 'alert-circle',
  'trending-up': 'trending-up',
  time: 'time-outline',
  bulb: 'bulb-outline',
  cart: 'cart-outline',
  cash: 'cash-outline',
};

const TYPE_COLORS: Record<InsightType, string> = {
  success: colors.profit,
  warning: colors.warning,
  info: colors.primary,
  tip: colors.textSecondary,
};

const TYPE_BG_COLORS: Record<InsightType, string> = {
  success: colors.profit + '15',
  warning: colors.warning + '15',
  info: colors.primary + '15',
  tip: colors.border,
};

export function InsightsCard({ insights, onInsightPress }: InsightsCardProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <Card shadow="sm" padding="md" style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="bulb" size={18} color={colors.warning} />
        <Text style={styles.title}>Insights</Text>
      </View>

      <View style={styles.insightsList}>
        {insights.map((insight, index) => (
          <Pressable
            key={insight.id}
            style={[
              styles.insightRow,
              index < insights.length - 1 && styles.insightRowBorder,
            ]}
            onPress={() => onInsightPress?.(insight)}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: TYPE_BG_COLORS[insight.type] },
              ]}
            >
              <Ionicons
                name={ICON_MAP[insight.icon]}
                size={16}
                color={TYPE_COLORS[insight.type]}
              />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightMessage} numberOfLines={2}>
                {insight.message}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  insightsList: {
    gap: 0,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  insightRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  insightMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
});
