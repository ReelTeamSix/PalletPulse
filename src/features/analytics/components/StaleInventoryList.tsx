// StaleInventoryList - Warning list of items that need attention
// Shows top 3 stale items for free tier, full list for paid
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { shadows } from '@/src/constants/shadows';
import type { StaleItem } from '../types/analytics';
import { formatCurrency } from '@/src/lib/profit-utils';
import { UpgradeInline } from './UpgradeOverlay';

interface StaleInventoryListProps {
  items: StaleItem[];
  /** Number of hidden items beyond what's shown */
  hiddenCount?: number;
  onSeeMore?: () => void;
  onItemPress?: (itemId: string) => void;
}

export function StaleInventoryList({
  items,
  hiddenCount = 0,
  onSeeMore,
  onItemPress,
}: StaleInventoryListProps) {
  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="checkmark-circle" size={20} color={colors.profit} />
            <Text style={styles.title}>Inventory Health</Text>
          </View>
        </View>
        <View style={styles.healthyState}>
          <Text style={styles.healthyText}>All caught up!</Text>
          <Text style={styles.healthySubtext}>No stale inventory items</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="warning-outline" size={18} color={colors.warning} />
          <Text style={styles.title}>Needs Attention</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {items.length + hiddenCount}
          </Text>
        </View>
      </View>

      {items.map((item) => (
        <StaleItemRow
          key={item.id}
          item={item}
          onPress={onItemPress ? () => onItemPress(item.id) : undefined}
        />
      ))}

      {hiddenCount > 0 && onSeeMore && (
        <UpgradeInline count={hiddenCount} onUpgrade={onSeeMore} />
      )}
    </View>
  );
}

interface StaleItemRowProps {
  item: StaleItem;
  onPress?: () => void;
}

function StaleItemRow({ item, onPress }: StaleItemRowProps) {
  const urgencyColor = item.daysListed >= 60
    ? colors.loss
    : item.daysListed >= 45
      ? colors.warning
      : colors.textSecondary;

  return (
    <Pressable
      style={styles.itemRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.palletName && (
          <Text style={styles.palletName} numberOfLines={1}>
            {item.palletName}
          </Text>
        )}
      </View>
      <View style={styles.itemMeta}>
        <Text style={[styles.daysText, { color: urgencyColor }]}>
          {item.daysListed}d
        </Text>
        {item.listingPrice && (
          <Text style={styles.priceText}>
            {formatCurrency(item.listingPrice)}
          </Text>
        )}
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      )}
    </Pressable>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full || 12,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.warning,
  },
  // Item row styles
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  palletName: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemMeta: {
    alignItems: 'flex-end',
  },
  daysText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  priceText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Healthy state
  healthyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  healthyText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: colors.profit,
    marginTop: spacing.xs,
  },
  healthySubtext: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
