// SupplierRankingTable - Compare performance by supplier (vendor)
// Shows top 2 suppliers for free tier with blur overlay for rest
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { shadows } from '@/src/constants/shadows';
import type { SupplierComparison } from '../types/analytics';
import { formatROI, getROIColor, formatCurrency } from '@/src/lib/profit-utils';
import { UpgradeOverlay } from './UpgradeOverlay';

interface SupplierRankingTableProps {
  data: SupplierComparison[];
  /** Whether to blur/hide data beyond first 2 suppliers */
  blurred?: boolean;
  onUpgrade?: () => void;
}

export function SupplierRankingTable({
  data,
  blurred = false,
  onUpgrade,
}: SupplierRankingTableProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="business-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.title}>Top Suppliers</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No supplier data yet</Text>
          <Text style={styles.emptySubtext}>Add pallets with supplier info</Text>
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
          <Ionicons name="business-outline" size={18} color={colors.primary} />
        </View>
        <Text style={styles.title}>Top Suppliers</Text>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.supplierCell]}>Supplier</Text>
        <Text style={[styles.headerCell, styles.metricCell]}>Profit</Text>
        <Text style={[styles.headerCell, styles.metricCell]}>ROI</Text>
        <Text style={[styles.headerCell, styles.metricCell]}>Pallets</Text>
      </View>

      {/* Table Body */}
      <ScrollView style={styles.tableBody} nestedScrollEnabled>
        {visibleData.map((supplier, index) => (
          <SupplierRow key={supplier.supplier} supplier={supplier} rank={index + 1} />
        ))}

        {/* Placeholder rows for blurred state */}
        {hasHiddenData && (
          <View style={styles.placeholderRows}>
            {data.slice(2).map((supplier) => (
              <View key={supplier.supplier} style={styles.placeholderRow}>
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
          message="Unlock full supplier comparison"
          onUpgrade={onUpgrade}
          position="bottom"
          bottomHeight={50}
        />
      )}
    </View>
  );
}

interface SupplierRowProps {
  supplier: SupplierComparison;
  rank: number;
}

function SupplierRow({ supplier, rank }: SupplierRowProps) {
  const roiColor = getROIColor(supplier.avgROI, true);
  const profitColor = supplier.totalProfit >= 0 ? colors.profit : colors.loss;

  return (
    <View style={styles.tableRow}>
      <View style={[styles.cell, styles.supplierCell]}>
        <View style={styles.rankIndicator}>
          <Text style={styles.rankBadge}>{rank}</Text>
        </View>
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName} numberOfLines={1}>
            {supplier.supplier}
          </Text>
          <Text style={styles.supplierMeta}>{supplier.totalItemsSold} sold</Text>
        </View>
      </View>
      <View style={[styles.cell, styles.metricCell]}>
        <Text style={[styles.metricValue, { color: profitColor }]}>
          {formatCurrency(supplier.totalProfit)}
        </Text>
      </View>
      <View style={[styles.cell, styles.metricCell]}>
        <Text style={[styles.metricValue, { color: roiColor }]}>
          {formatROI(supplier.avgROI)}
        </Text>
      </View>
      <View style={[styles.cell, styles.metricCell]}>
        <Text style={styles.metricValue}>{supplier.palletCount}</Text>
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
  supplierCell: {
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
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  supplierMeta: {
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
