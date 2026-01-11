// PalletCard Component - Displays a pallet summary in a list
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Pallet, PalletStatus } from '@/src/types/database';

interface PalletCardProps {
  pallet: Pallet;
  itemCount?: number;
  totalProfit?: number;
  onPress: () => void;
}

const STATUS_CONFIG: Record<PalletStatus, { label: string; color: string }> = {
  unprocessed: { label: 'Unprocessed', color: colors.statusUnprocessed },
  processing: { label: 'Processing', color: colors.statusListed },
  completed: { label: 'Completed', color: colors.statusSold },
};

export function PalletCard({
  pallet,
  itemCount = 0,
  totalProfit = 0,
  onPress,
}: PalletCardProps) {
  const statusConfig = STATUS_CONFIG[pallet.status];
  const totalCost = pallet.purchase_cost + (pallet.sales_tax || 0);
  const roi = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(0) : '0';
  const isProfitable = totalProfit >= 0;
  const isCompleted = pallet.status === 'completed';

  // Profit color: only show green/red for completed pallets, otherwise neutral
  const profitColor = isCompleted
    ? (isProfitable ? colors.profit : colors.loss)
    : colors.neutral;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {pallet.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <Text style={styles.statusText}>{statusConfig.label}</Text>
          </View>
        </View>
        {pallet.supplier && (
          <Text style={styles.supplier} numberOfLines={1}>
            {pallet.supplier}
          </Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cost</Text>
          <Text style={styles.statValue}>{formatCurrency(totalCost)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Items</Text>
          <Text style={styles.statValue}>{itemCount}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Profit</Text>
          <Text
            style={[
              styles.statValue,
              { color: profitColor },
            ]}
          >
            {formatCurrency(totalProfit)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>ROI</Text>
          <Text
            style={[
              styles.statValue,
              { color: profitColor },
            ]}
          >
            {roi}%
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.date}>
          Purchased {formatDate(pallet.purchase_date)}
        </Text>
        <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
      </View>
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
    marginBottom: spacing.md,
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
  supplier: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
