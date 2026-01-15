// ItemCard Component - Displays an item summary in a card
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { ThumbnailImage } from '@/src/components/ui/ThumbnailImage';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Item, ItemStatus } from '@/src/types/database';
import {
  formatCondition,
  getConditionColor,
  calculateItemProfit,
} from '../schemas/item-form-schema';
import { formatCurrency } from '@/src/lib/profit-utils';

interface ItemCardProps {
  item: Item;
  onPress: () => void;
  showPalletBadge?: boolean;
  palletName?: string;
  thumbnailUri?: string | null;
}

const STATUS_CONFIG: Record<ItemStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'info' }> = {
  unlisted: { label: 'Unlisted', variant: 'default' },
  listed: { label: 'Listed', variant: 'info' },
  sold: { label: 'Sold', variant: 'success' },
};

export function ItemCard({
  item,
  onPress,
  showPalletBadge = false,
  palletName,
  thumbnailUri,
}: ItemCardProps) {
  const statusConfig = STATUS_CONFIG[item.status];
  const conditionColor = getConditionColor(item.condition);

  const profit = calculateItemProfit(
    item.sale_price,
    item.allocated_cost,
    item.purchase_cost,
    item.platform_fee,
    item.shipping_cost
  );
  const isProfitable = profit >= 0;
  const hasSold = item.status === 'sold';

  // Determine which prices to show
  const hasRetail = item.retail_price !== null;
  const hasListing = item.listing_price !== null;
  const hasSale = hasSold && item.sale_price !== null;
  const hasCost = item.allocated_cost !== null || item.purchase_cost !== null;

  return (
    <Card shadow="sm" padding="md" onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <ThumbnailImage
          uri={thumbnailUri}
          size={56}
          fallbackIcon="cube-outline"
        />
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Badge variant={statusConfig.variant} size="sm" label={statusConfig.label} />
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.conditionBadge, { backgroundColor: conditionColor + '20' }]}>
              <Text style={[styles.conditionText, { color: conditionColor }]}>
                {formatCondition(item.condition)}
              </Text>
            </View>
            {item.quantity > 1 && (
              <Text style={styles.quantity}>x{item.quantity}</Text>
            )}
            {showPalletBadge && palletName && (
              <View style={styles.palletBadge}>
                <Ionicons name="cube" size={10} color={colors.textSecondary} />
                <Text style={styles.palletText} numberOfLines={1}>{palletName}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.priceGrid}>
        {hasRetail && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>MSRP</Text>
            <Text style={styles.priceValue}>{formatCurrency(item.retail_price!)}</Text>
          </View>
        )}
        {hasListing && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>LISTED</Text>
            <Text style={styles.priceValue}>{formatCurrency(item.listing_price!)}</Text>
          </View>
        )}
        {hasSale && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>SOLD</Text>
            <Text style={[styles.priceValue, styles.soldValue]}>
              {formatCurrency(item.sale_price!)}
            </Text>
          </View>
        )}
        {hasSold ? (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>PROFIT</Text>
            <Text
              style={[
                styles.priceValue,
                { color: isProfitable ? colors.profit : colors.loss },
              ]}
            >
              {isProfitable ? '+' : ''}{formatCurrency(profit)}
            </Text>
          </View>
        ) : hasCost && !hasListing && !hasRetail ? (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>COST</Text>
            <Text style={styles.priceValue}>
              {formatCurrency(item.allocated_cost ?? item.purchase_cost ?? 0)}
            </Text>
          </View>
        ) : null}
      </View>

      {item.storage_location && (
        <View style={styles.footer}>
          <Ionicons name="location-outline" size={12} color={colors.textDisabled} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.storage_location}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  conditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  conditionText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  quantity: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  palletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    maxWidth: 100,
  },
  palletText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  priceGrid: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textDisabled,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  soldValue: {
    color: colors.profit,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  locationText: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
});
