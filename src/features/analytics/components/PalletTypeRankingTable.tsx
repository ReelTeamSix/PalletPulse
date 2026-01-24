// PalletTypeRankingTable - Compare performance by pallet type (source_name)
// Shows top 2 pallet types for free tier with blur overlay for rest
// Mystery boxes show gift-outline icon badge
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { shadows } from '@/src/constants/shadows';
import type { PalletTypeComparison } from '../types/analytics';
import { formatROI, getROIColor, formatCurrency } from '@/src/lib/profit-utils';
import { UpgradeOverlay } from './UpgradeOverlay';

interface PalletTypeRankingTableProps {
  data: PalletTypeComparison[];
  /** Whether to blur/hide data beyond first 2 pallet types */
  blurred?: boolean;
  onUpgrade?: () => void;
}

export function PalletTypeRankingTable({
  data,
  blurred = false,
  onUpgrade,
}: PalletTypeRankingTableProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="layers-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.title}>Top Pallet Types</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No pallet type data yet</Text>
          <Text style={styles.emptySubtext}>Add source names to your pallets</Text>
        </View>
      </View>
    );
  }

  const visibleData = blurred ? data.slice(0, 2) : data;
  const hasHiddenData = blurred && data.length > 2;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="layers-outline" size={18} color={colors.primary} />
        </View>
        <Text style={styles.title}>Top Pallet Types</Text>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.typeCell]}>Type</Text>
        <Text style={[styles.headerCell, styles.metricCell]}>Profit</Text>
        <Text style={[styles.headerCell, styles.metricCell]}>ROI</Text>
        <Text style={[styles.headerCell, styles.metricCell]}>Pallets</Text>
      </View>

      {/* Table Body */}
      <ScrollView style={styles.tableBody} nestedScrollEnabled>
        {visibleData.map((palletType, index) => (
          <PalletTypeRow key={palletType.palletType} palletType={palletType} rank={index + 1} />
        ))}

        {/* Placeholder rows for blurred state */}
        {hasHiddenData && (
          <View style={styles.placeholderRows}>
            {data.slice(2).map((palletType) => (
              <View key={palletType.palletType} style={styles.placeholderRow}>
                <View style={styles.placeholderText} />
                <View style={styles.placeholderText} />
                <View style={styles.placeholderText} />
                <View style={styles.placeholderText} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Upgrade overlay for hidden data */}
      {hasHiddenData && onUpgrade && (
        <UpgradeOverlay
          visible
          message="Unlock full pallet type comparison"
          onUpgrade={onUpgrade}
          position="bottom"
          bottomHeight={50}
        />
      )}
    </View>
  );
}

interface PalletTypeRowProps {
  palletType: PalletTypeComparison;
  rank: number;
}

function PalletTypeRow({ palletType, rank }: PalletTypeRowProps) {
  const roiColor = getROIColor(palletType.avgROI, true);
  const profitColor = palletType.totalProfit >= 0 ? colors.profit : colors.loss;

  return (
    <View style={styles.tableRow}>
      <View style={[styles.cell, styles.typeCell]}>
        <View style={styles.rankIndicator}>
          <Text style={styles.rankBadge}>{rank}</Text>
        </View>
        <View style={styles.typeInfo}>
          <View style={styles.typeNameRow}>
            <Text style={styles.typeName} numberOfLines={1}>
              {palletType.palletType}
            </Text>
            {palletType.isMysteryBox && (
              <Ionicons name="gift-outline" size={14} color={colors.primary} style={styles.mysteryIcon} />
            )}
          </View>
          <Text style={styles.typeMeta}>{palletType.totalItemsSold} sold</Text>
        </View>
      </View>
      <View style={[styles.cell, styles.metricCell]}>
        <Text style={[styles.metricValue, { color: profitColor }]}>
          {formatCurrency(palletType.totalProfit)}
        </Text>
      </View>
      <View style={[styles.cell, styles.metricCell]}>
        <Text style={[styles.metricValue, { color: roiColor }]}>
          {formatROI(palletType.avgROI)}
        </Text>
      </View>
      <View style={[styles.cell, styles.metricCell]}>
        <Text style={styles.metricValue}>{palletType.palletCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  // Table styles
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  tableBody: {
    maxHeight: 200,
  },
  headerCell: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  cell: {
    justifyContent: 'center',
  },
  typeCell: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  rankIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  typeInfo: {
    flex: 1,
  },
  typeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    flex: 1,
  },
  mysteryIcon: {
    marginLeft: spacing.xs,
  },
  typeMeta: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  // Placeholder styles for blurred rows
  placeholderRows: {
    opacity: 0.3,
  },
  placeholderRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  placeholderText: {
    flex: 1,
    height: 16,
    backgroundColor: colors.textSecondary,
    borderRadius: 4,
    marginHorizontal: spacing.xs,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
