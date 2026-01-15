// TypeComparisonTable - Compare performance by pallet source type
// Shows top 2 types for free tier with blur overlay for rest
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import type { TypeComparison } from '../types/analytics';
import { formatROI, getROIColor } from '@/src/lib/profit-utils';
import { getSourceTypeLabel } from '../utils/analytics-calculations';
import { UpgradeOverlay } from './UpgradeOverlay';

interface TypeComparisonTableProps {
  data: TypeComparison[];
  /** Whether to blur/hide data beyond first 2 types */
  blurred?: boolean;
  onUpgrade?: () => void;
}

export function TypeComparisonTable({
  data,
  blurred = false,
  onUpgrade,
}: TypeComparisonTableProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Performance by Type</Text>
        </View>
        <View style={styles.emptyState}>
          <FontAwesome name="cubes" size={24} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No type data yet</Text>
          <Text style={styles.emptySubtext}>Add pallets with different source types</Text>
        </View>
      </View>
    );
  }

  const visibleData = blurred ? data.slice(0, 2) : data;
  const hasHiddenData = blurred && data.length > 2;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance by Type</Text>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.typeCell]}>Type</Text>
        <Text style={[styles.headerCell, styles.metricCell]}>ROI</Text>
        <Text style={[styles.headerCell, styles.metricCell]}>Velocity</Text>
        <Text style={[styles.headerCell, styles.metricCell]}>Sell %</Text>
      </View>

      {/* Table Body */}
      <ScrollView style={styles.tableBody} nestedScrollEnabled>
        {visibleData.map((type, index) => (
          <TypeRow key={type.sourceType} type={type} rank={index + 1} />
        ))}

        {/* Placeholder rows for blurred state */}
        {hasHiddenData && (
          <View style={styles.placeholderRows}>
            {data.slice(2).map((type) => (
              <View key={type.sourceType} style={styles.placeholderRow}>
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
          message="Unlock full type comparison"
          onUpgrade={onUpgrade}
          position="bottom"
          bottomHeight={50}
        />
      )}
    </View>
  );
}

interface TypeRowProps {
  type: TypeComparison;
  rank: number;
}

function TypeRow({ type, rank }: TypeRowProps) {
  const roiColor = getROIColor(type.avgROI, true);
  const velocityDisplay = type.avgDaysToSell !== null
    ? `${Math.round(type.avgDaysToSell)}d`
    : '-';

  return (
    <View style={styles.tableRow}>
      <View style={[styles.cell, styles.typeCell]}>
        <View style={styles.typeIndicator}>
          <Text style={styles.rankBadge}>{rank}</Text>
        </View>
        <View>
          <Text style={styles.typeLabel} numberOfLines={1}>
            {getSourceTypeLabel(type.sourceType)}
          </Text>
          <Text style={styles.typeMeta}>{type.palletCount} pallets</Text>
        </View>
      </View>
      <View style={[styles.cell, styles.metricCell]}>
        <Text style={[styles.metricValue, { color: roiColor }]}>
          {formatROI(type.avgROI)}
        </Text>
      </View>
      <View style={[styles.cell, styles.metricCell]}>
        <Text style={styles.metricValue}>{velocityDisplay}</Text>
      </View>
      <View style={[styles.cell, styles.metricCell]}>
        <Text style={styles.metricValue}>{Math.round(type.sellThroughRate)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 200,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
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
  typeIndicator: {
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
    color: colors.primary,
  },
  typeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  typeMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
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
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
