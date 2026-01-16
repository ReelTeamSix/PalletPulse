import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import {
  Insight,
  InsightType,
  InsightIcon,
  EmptyStateContent,
} from '../utils/insights-engine';

interface InsightsCardProps {
  insights: Insight[];
  emptyState: EmptyStateContent;
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

export function InsightsCard({ insights, emptyState, onInsightPress }: InsightsCardProps) {
  const router = useRouter();
  const hasInsights = insights.length > 0;

  const handleActionPress = () => {
    if (emptyState.actionRoute) {
      router.push(emptyState.actionRoute as any);
    }
  };

  return (
    <Card shadow="sm" padding="md" style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="bulb" size={18} color={colors.warning} />
        <Text style={styles.title}>Insights</Text>
      </View>

      {hasInsights ? (
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
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{emptyState.title}</Text>
          <Text style={styles.emptyMessage}>{emptyState.message}</Text>
          {emptyState.actionLabel && (
            <Pressable style={styles.actionButton} onPress={handleActionPress}>
              <Text style={styles.actionButtonText}>{emptyState.actionLabel}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>
      )}
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
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
    paddingHorizontal: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
