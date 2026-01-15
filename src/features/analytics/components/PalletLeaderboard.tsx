// PalletLeaderboard - Ranked list of top performing pallets
// Shows top 3 for free tier, full list for paid
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import type { PalletAnalytics } from '../types/analytics';
import { formatCurrency, formatROI, getROIColor } from '@/src/lib/profit-utils';
import { UpgradeInline } from './UpgradeOverlay';

interface PalletLeaderboardProps {
  data: PalletAnalytics[];
  /** Number of hidden items beyond what's shown */
  hiddenCount?: number;
  onSeeMore?: () => void;
  onPalletPress?: (palletId: string) => void;
}

// Medal colors for top 3
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze

export function PalletLeaderboard({
  data,
  hiddenCount = 0,
  onSeeMore,
  onPalletPress,
}: PalletLeaderboardProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Top Pallets</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No pallet data yet</Text>
          <Text style={styles.emptySubtext}>Add pallets to see your leaderboard</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Pallets</Text>
        {hiddenCount > 0 && onSeeMore && (
          <Pressable style={styles.seeAllButton} onPress={onSeeMore}>
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {data.map((pallet, index) => (
        <LeaderboardItem
          key={pallet.id}
          pallet={pallet}
          rank={index + 1}
          onPress={onPalletPress ? () => onPalletPress(pallet.id) : undefined}
        />
      ))}

      {hiddenCount > 0 && onSeeMore && (
        <UpgradeInline count={hiddenCount} onUpgrade={onSeeMore} />
      )}
    </View>
  );
}

interface LeaderboardItemProps {
  pallet: PalletAnalytics;
  rank: number;
  onPress?: () => void;
}

function LeaderboardItem({ pallet, rank, onPress }: LeaderboardItemProps) {
  const isTopThree = rank <= 3;
  const medalColor = isTopThree ? MEDAL_COLORS[rank - 1] : undefined;
  const profitColor = pallet.profit >= 0 ? colors.profit : colors.loss;
  const roiColor = getROIColor(pallet.roi, true);

  return (
    <Pressable
      style={[styles.itemContainer, onPress && styles.itemPressable]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Rank indicator */}
      <View style={[styles.rankContainer, isTopThree && { backgroundColor: medalColor + '20' }]}>
        {isTopThree ? (
          <Ionicons name="trophy" size={16} color={medalColor} />
        ) : (
          <Text style={styles.rankNumber}>{rank}</Text>
        )}
      </View>

      {/* Pallet info */}
      <View style={styles.palletInfo}>
        <Text style={styles.palletName} numberOfLines={1}>
          {pallet.name}
        </Text>
        <Text style={styles.palletMeta}>
          {pallet.soldCount}/{pallet.itemCount} sold
          {pallet.sellThroughRate > 0 && ` (${Math.round(pallet.sellThroughRate)}%)`}
        </Text>
      </View>

      {/* Metrics */}
      <View style={styles.metricsContainer}>
        <Text style={[styles.profitValue, { color: profitColor }]}>
          {formatCurrency(pallet.profit)}
        </Text>
        <Text style={[styles.roiValue, { color: roiColor }]}>
          {formatROI(pallet.roi)}
        </Text>
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
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  // Item styles
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  itemPressable: {
    // Additional styling for pressable items
  },
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  palletInfo: {
    flex: 1,
  },
  palletName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  palletMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricsContainer: {
    alignItems: 'flex-end',
  },
  profitValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  roiValue: {
    fontSize: fontSize.xs,
    fontWeight: '500',
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
