// PalletCard Component - Displays a pallet summary in a card
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { Pallet, PalletStatus } from '@/src/types/database';
import { formatCurrency } from '@/src/lib/profit-utils';

interface PalletCardProps {
  pallet: Pallet;
  itemCount?: number;
  processedCount?: number;
  totalProfit?: number;
  onPress: () => void;
}

// Status configuration for badges and colors
const STATUS_CONFIG: Record<PalletStatus, {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'info';
  accentColor: string;
}> = {
  unprocessed: { label: 'Unprocessed', variant: 'default', accentColor: colors.primary },
  processing: { label: 'In Progress', variant: 'warning', accentColor: colors.warning },
  completed: { label: 'Completed', variant: 'success', accentColor: colors.profit },
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

  // Only show accent bar for "In Progress" status
  const showAccentBar = pallet.status === 'processing';

  return (
    <Card shadow="sm" padding={0} onPress={onPress} style={styles.card}>
      {/* Status accent bar at top of card - only for In Progress */}
      {showAccentBar && (
        <View style={[styles.accentBar, { backgroundColor: statusConfig.accentColor }]} />
      )}

      {/* Card content with padding */}
      <View style={styles.content}>
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
              label="Items Listed"
              color={statusConfig.accentColor}
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
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: spacing.md,
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
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  date: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
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
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
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
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textDisabled,
  },
});
