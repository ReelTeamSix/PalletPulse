// Skeleton Loading Component
// Displays animated placeholder content while data is loading
// Research: Users perceive pages loading 20-30% faster with skeleton screens vs spinners

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';
import { colors } from '@/src/constants/colors';
import { borderRadius, spacing } from '@/src/constants/spacing';

interface SkeletonProps {
  /** Width of the skeleton (number for pixels, string for percentage) */
  width?: DimensionValue;
  /** Height of the skeleton */
  height?: DimensionValue;
  /** Border radius */
  radius?: number;
  /** Whether to show shimmer animation */
  animated?: boolean;
  /** Custom style */
  style?: ViewStyle;
  /** Shape variant */
  variant?: 'rectangle' | 'circle' | 'text';
}

/**
 * Base Skeleton component with shimmer animation
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = borderRadius.md,
  animated = true,
  style,
  variant = 'rectangle',
}: SkeletonProps) {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [animated, shimmerValue]);

  const opacity = animated
    ? shimmerValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
      })
    : 0.5;

  const computedRadius = variant === 'circle' ? 9999 : radius;
  const computedWidth = variant === 'circle' && typeof height === 'number' ? height : width;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: computedWidth,
          height,
          borderRadius: computedRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton text line
 */
export function SkeletonText({
  width = '80%',
  height = 14,
  style,
}: Pick<SkeletonProps, 'width' | 'height' | 'style'>) {
  return <Skeleton width={width} height={height} radius={borderRadius.sm} style={style} />;
}

/**
 * Skeleton avatar/circle
 */
export function SkeletonCircle({
  size = 40,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return <Skeleton width={size} height={size} variant="circle" style={style} />;
}

/**
 * Skeleton card layout for pallet/item cards
 */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {/* Image placeholder */}
      <Skeleton width={80} height={80} radius={borderRadius.md} />

      {/* Content */}
      <View style={styles.cardContent}>
        <SkeletonText width="70%" height={16} />
        <SkeletonText width="50%" height={14} style={styles.mt8} />
        <View style={styles.cardFooter}>
          <SkeletonText width="30%" height={12} />
          <Skeleton width={60} height={24} radius={borderRadius.full} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton row for list items
 */
export function SkeletonRow({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.row, style]}>
      <SkeletonCircle size={36} />
      <View style={styles.rowContent}>
        <SkeletonText width="60%" height={14} />
        <SkeletonText width="40%" height={12} style={styles.mt4} />
      </View>
      <Skeleton width={60} height={16} radius={borderRadius.sm} />
    </View>
  );
}

/**
 * Skeleton metric card for dashboard
 */
export function SkeletonMetric({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.metric, style]}>
      <Skeleton width={36} height={36} variant="circle" />
      <SkeletonText width="60%" height={12} style={styles.mt8} />
      <SkeletonText width="80%" height={24} style={styles.mt4} />
    </View>
  );
}

/**
 * Skeleton list with multiple items
 */
export function SkeletonList({
  count = 3,
  variant = 'card',
  style,
}: {
  count?: number;
  variant?: 'card' | 'row';
  style?: ViewStyle;
}) {
  const Component = variant === 'card' ? SkeletonCard : SkeletonRow;

  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <Component key={index} style={index < count - 1 ? styles.mb12 : undefined} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.skeletonBase,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  cardContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  rowContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  mt4: {
    marginTop: 4,
  },
  mt8: {
    marginTop: 8,
  },
  mb12: {
    marginBottom: 12,
  },
});
