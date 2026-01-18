import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import {
  Insight,
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

export function InsightsCard({ insights, emptyState, onInsightPress }: InsightsCardProps) {
  const router = useRouter();
  const hasInsights = insights.length > 0;

  const handleActionPress = () => {
    if (emptyState.actionRoute) {
      router.push(emptyState.actionRoute as any);
    }
  };

  return (
    <LinearGradient
      colors={['#8B5CF6', '#6366F1', '#3B82F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {hasInsights ? (
        <View style={styles.insightsList}>
          {insights.map((insight) => (
            <Pressable
              key={insight.id}
              style={styles.insightRow}
              onPress={() => onInsightPress?.(insight)}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={ICON_MAP[insight.icon]}
                  size={20}
                  color="#8B5CF6"
                />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightMessage} numberOfLines={2}>
                  {insight.message}
                </Text>
              </View>
              <View style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.emptyTitle}>{emptyState.title}</Text>
          <Text style={styles.emptyMessage}>{emptyState.message}</Text>
          {emptyState.actionLabel && (
            <Pressable style={styles.actionButton} onPress={handleActionPress}>
              <Text style={styles.actionButtonText}>{emptyState.actionLabel}</Text>
              <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
            </Pressable>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  insightsList: {
    gap: spacing.sm,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  insightMessage: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: fontSize.sm * 1.4,
  },
  viewButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
  },
  viewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#6366F1',
  },
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.85)',
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
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#6366F1',
  },
});
