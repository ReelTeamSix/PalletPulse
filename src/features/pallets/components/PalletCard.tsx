// PalletCard Component - Displays a pallet summary in a card
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize } from '@/src/constants/spacing';
import { Pallet, PalletStatus } from '@/src/types/database';
import { formatCurrency } from '@/src/lib/profit-utils';

interface PalletCardProps {
  pallet: Pallet;
  itemCount?: number;
  processedCount?: number;
  totalProfit?: number;
  onPress: () => void;
}

const STATUS_CONFIG: Record<PalletStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'info' }> = {
  unprocessed: { label: 'Unprocessed', variant: 'default' },
  processing: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
};

export function PalletCard({
  pallet,
  itemCount = 0,
  processedCount = 0,
  totalProfit = 0,
  onPress,
}: PalletCardProps) {
  const statusConfig = STATUS_CONFIG[pallet.status];
  const totalCost = pallet.purchase_cost + (pallet.sales_tax || 0);
  const roi = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(0) : '0';
  const isProfitable = totalProfit >= 0;

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card shadow="sm" padding="md" onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {pallet.name}
            </Text>
            <Badge variant={statusConfig.variant} size="sm" label={statusConfig.label} />
          </View>
          <Text style={styles.date}>
            Purchased {formatDate(pallet.purchase_date)}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cost</Text>
          <Text style={styles.statValue}>{formatCurrency(totalCost)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Profit</Text>
          <Text
            style={[
              styles.statValue,
              { color: isProfitable ? colors.profit : colors.loss },
            ]}
          >
            {isProfitable ? '+' : ''}{formatCurrency(totalProfit)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>ROI</Text>
          <Text
            style={[
              styles.statValue,
              { color: isProfitable ? colors.profit : colors.loss },
            ]}
          >
            {roi}%
          </Text>
        </View>
      </View>

      {itemCount > 0 && (
        <View style={styles.progressSection}>
          <ProgressBar
            current={processedCount}
            total={itemCount}
            label="Items Processed"
            color={pallet.status === 'completed' ? colors.profit : colors.primary}
          />
        </View>
      )}

      {pallet.supplier && (
        <View style={styles.footer}>
          <Ionicons name="business-outline" size={12} color={colors.textDisabled} />
          <Text style={styles.supplierText} numberOfLines={1}>
            {pallet.supplier}
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
    marginBottom: spacing.md,
  },
  headerContent: {
    flex: 1,
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
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.textDisabled,
    marginBottom: 2,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressSection: {
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  supplierText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
  },
});
