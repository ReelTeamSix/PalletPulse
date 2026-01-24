// TrendChartTeaser - Placeholder for trend charts (free tier)
// Shows blurred preview to encourage upgrade
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';

interface TrendChartTeaserProps {
  onUpgrade: () => void;
}

export function TrendChartTeaser({ onUpgrade }: TrendChartTeaserProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profit Trend</Text>
        <View style={styles.proBadge}>
          <FontAwesome name="star" size={10} color={colors.background} />
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      </View>

      {/* Fake chart preview */}
      <View style={styles.chartPreview}>
        {/* Fake line chart bars */}
        <View style={styles.chartBars}>
          {[35, 55, 45, 65, 50, 80, 70, 90, 75, 85, 95, 88].map((height, index) => (
            <View
              key={index}
              style={[styles.chartBar, { height: `${height}%` }]}
            />
          ))}
        </View>

        {/* Blur overlay with CTA */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} tint="light" style={styles.blurOverlay}>
            <TeaserContent onUpgrade={onUpgrade} />
          </BlurView>
        ) : (
          <View style={styles.androidOverlay}>
            <TeaserContent onUpgrade={onUpgrade} />
          </View>
        )}
      </View>
    </View>
  );
}

function TeaserContent({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={styles.teaserContent}>
      <View style={styles.iconContainer}>
        <FontAwesome name="line-chart" size={28} color={colors.primary} />
      </View>
      <Text style={styles.teaserTitle}>Track Your Growth</Text>
      <Text style={styles.teaserDescription}>
        Unlock trend charts to visualize your profit over time
      </Text>
      <Pressable style={styles.upgradeButton} onPress={onUpgrade}>
        <FontAwesome name="star" size={14} color={colors.background} />
        <Text style={styles.upgradeText}>Unlock Charts</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full || 12,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  // Chart preview
  chartPreview: {
    height: 180,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
    position: 'relative',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chartBar: {
    width: 20,
    backgroundColor: colors.primary + '30',
    borderRadius: 4,
  },
  // Overlay styles
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Teaser content
  teaserContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  teaserTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  teaserDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    maxWidth: 220,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full || 20,
  },
  upgradeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.background,
  },
});
