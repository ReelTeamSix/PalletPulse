// ItemCard Component - Displays an item summary in a list
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Item, ItemCondition, ItemStatus } from '@/src/types/database';
import {
  formatCondition,
  formatStatus,
  getConditionColor,
  getStatusColor,
  calculateItemProfit,
} from '../schemas/item-form-schema';

interface ItemCardProps {
  item: Item;
  onPress: () => void;
  showPalletBadge?: boolean;
  palletName?: string;
}

export function ItemCard({
  item,
  onPress,
  showPalletBadge = false,
  palletName,
}: ItemCardProps) {
  const statusColor = getStatusColor(item.status);
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.conditionBadge, { backgroundColor: conditionColor }]}>
            <Text style={styles.conditionText}>{formatCondition(item.condition)}</Text>
          </View>
          {item.quantity > 1 && (
            <Text style={styles.quantity}>x{item.quantity}</Text>
          )}
          {showPalletBadge && palletName && (
            <View style={styles.palletBadge}>
              <FontAwesome name="archive" size={10} color={colors.textSecondary} />
              <Text style={styles.palletText} numberOfLines={1}>{palletName}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.priceRow}>
        {item.listing_price !== null && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Listed</Text>
            <Text style={styles.priceValue}>{formatCurrency(item.listing_price)}</Text>
          </View>
        )}

        {hasSold && item.sale_price !== null && (
          <>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Sold</Text>
              <Text style={[styles.priceValue, styles.soldPrice]}>
                {formatCurrency(item.sale_price)}
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Profit</Text>
              <Text
                style={[
                  styles.priceValue,
                  { color: isProfitable ? colors.profit : colors.loss },
                ]}
              >
                {formatCurrency(profit)}
              </Text>
            </View>
          </>
        )}

        {!hasSold && item.listing_price === null && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Cost</Text>
            <Text style={styles.priceValue}>
              {formatCurrency(item.allocated_cost ?? item.purchase_cost)}
            </Text>
          </View>
        )}
      </View>

      {item.storage_location && (
        <View style={styles.footer}>
          <FontAwesome name="map-marker" size={12} color={colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.storage_location}
          </Text>
        </View>
      )}
    </Pressable>
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
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  conditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  conditionText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '500',
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
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    maxWidth: 120,
  },
  palletText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  soldPrice: {
    color: colors.profit,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
