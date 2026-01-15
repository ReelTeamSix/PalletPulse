// Analytics Screen - Phase 9C
// Dashboard with hero metrics, pallet leaderboard, type comparison, and stale inventory
// Features tier gating: free tier sees limited data with upgrade prompts
import { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { shadows } from '@/src/constants/shadows';
import { Card } from '@/src/components/ui';
import { SubscriptionTier, TIER_LIMITS } from '@/src/constants/tier-limits';

// Stores
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';

// Analytics utilities
import {
  calculateHeroMetrics,
  calculatePalletLeaderboard,
  calculateTypeComparison,
  getStaleItems,
  calculateProfitTrend,
} from '@/src/features/analytics/utils/analytics-calculations';

// CSV Export utilities
import {
  exportItems,
  exportPallets,
  exportExpenses,
  exportPalletPerformance,
  exportTypeComparison as exportTypeComparisonCSV,
  ExportType,
} from '@/src/features/analytics/utils/csv-export';

// Analytics components
import {
  HeroMetricsCard,
  PalletLeaderboard,
  TypeComparisonTable,
  StaleInventoryList,
  TrendChartTeaser,
  TrendChart,
} from '@/src/features/analytics/components';

// Date range filter
import { DateRangeFilter, DateRange } from '@/src/components/ui/DateRangeFilter';

// TODO: Replace with actual subscription hook when RevenueCat is integrated (Phase 10)
function useSubscriptionTier(): SubscriptionTier {
  // For now, default to 'free' to test tier gating
  // In production, this will check RevenueCat subscription status
  return 'free';
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Get user's subscription tier
  const tier = useSubscriptionTier();
  const isPaidTier = tier !== 'free';

  // Stores
  const { pallets, fetchPallets, isLoading: palletsLoading } = usePalletsStore();
  const { items, fetchItems, isLoading: itemsLoading } = useItemsStore();
  const { expenses, fetchExpenses, isLoading: expensesLoading } = useExpensesStore();
  const { settings } = useUserSettingsStore();

  // Date range state - default to this year
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: 'this_year',
  });

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Export modal state (paid tier only)
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data on mount and focus
  useFocusEffect(
    useCallback(() => {
      fetchPallets();
      fetchItems();
      fetchExpenses();
    }, [])
  );

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPallets(), fetchItems(), fetchExpenses()]);
    setRefreshing(false);
  };

  // Calculate analytics metrics
  const heroMetrics = useMemo(
    () => calculateHeroMetrics(pallets, items, expenses, dateRange),
    [pallets, items, expenses, dateRange]
  );

  const leaderboard = useMemo(
    () => calculatePalletLeaderboard(pallets, items, expenses),
    [pallets, items, expenses]
  );

  const typeComparison = useMemo(
    () => calculateTypeComparison(pallets, items, expenses),
    [pallets, items, expenses]
  );

  const staleThreshold = settings?.stale_threshold_days ?? 30;
  const staleItems = useMemo(
    () => getStaleItems(items, pallets, staleThreshold),
    [items, pallets, staleThreshold]
  );

  // Calculate trend data for paid tier
  const trendData = useMemo(
    () => calculateProfitTrend(items, 'monthly', dateRange),
    [items, dateRange]
  );

  // Tier gating - limit visible data for free tier
  const FREE_TIER_LIMITS = {
    leaderboard: 3,
    typeComparison: 2,
    staleItems: 3,
  };

  const visibleLeaderboard = isPaidTier
    ? leaderboard
    : leaderboard.slice(0, FREE_TIER_LIMITS.leaderboard);

  const visibleTypeComparison = isPaidTier
    ? typeComparison
    : typeComparison.slice(0, FREE_TIER_LIMITS.typeComparison);

  const visibleStaleItems = isPaidTier
    ? staleItems
    : staleItems.slice(0, FREE_TIER_LIMITS.staleItems);

  // Check if there's hidden data
  const hasMoreLeaderboard = !isPaidTier && leaderboard.length > FREE_TIER_LIMITS.leaderboard;
  const hasMoreTypeComparison = !isPaidTier && typeComparison.length > FREE_TIER_LIMITS.typeComparison;
  const hasMoreStaleItems = !isPaidTier && staleItems.length > FREE_TIER_LIMITS.staleItems;
  const hiddenLeaderboardCount = Math.max(0, leaderboard.length - FREE_TIER_LIMITS.leaderboard);
  const hiddenStaleCount = Math.max(0, staleItems.length - FREE_TIER_LIMITS.staleItems);

  // Navigation handlers
  const handleUpgrade = () => {
    router.push('/settings/subscription');
  };

  const handlePalletPress = (palletId: string) => {
    router.push(`/pallets/${palletId}`);
  };

  const handleItemPress = (itemId: string) => {
    router.push(`/items/${itemId}`);
  };

  // Export handler (paid tier only)
  const handleExport = async (exportType: ExportType) => {
    setIsExporting(true);
    setShowExportModal(false);

    try {
      let result;

      switch (exportType) {
        case 'items':
          result = await exportItems(items, pallets);
          break;
        case 'pallets':
          result = await exportPallets(pallets);
          break;
        case 'expenses':
          result = await exportExpenses(expenses, pallets);
          break;
        case 'pallet_performance':
          result = await exportPalletPerformance(leaderboard);
          break;
        case 'type_comparison':
          result = await exportTypeComparisonCSV(typeComparison);
          break;
        default:
          throw new Error('Unknown export type');
      }

      if (!result.success) {
        Alert.alert('Export Failed', result.error || 'Failed to export data');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export data';
      Alert.alert('Export Failed', message);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = palletsLoading || itemsLoading || expensesLoading;

  // Empty state check
  const hasData = pallets.length > 0 || items.length > 0;

  if (!hasData && !isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Track your business performance</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add pallets and items to see your analytics dashboard come to life.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Track your business performance</Text>
          </View>
          {isPaidTier && (
            <Pressable
              style={styles.exportButton}
              onPress={() => setShowExportModal(true)}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                  <Text style={styles.exportButtonText}>Export</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Date Range Filter */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Hero Metrics - Always visible */}
      <HeroMetricsCard metrics={heroMetrics} />

      {/* Pallet Leaderboard */}
      {leaderboard.length > 0 && (
        <PalletLeaderboard
          data={visibleLeaderboard}
          hiddenCount={hiddenLeaderboardCount}
          onPalletPress={handlePalletPress}
          onSeeMore={handleUpgrade}
        />
      )}

      {/* Type Comparison */}
      {typeComparison.length > 0 && (
        <TypeComparisonTable
          data={visibleTypeComparison}
          blurred={hasMoreTypeComparison}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* Trend Chart Teaser (Free Tier) or Real Chart (Paid) */}
      {!isPaidTier && <TrendChartTeaser onUpgrade={handleUpgrade} />}
      {isPaidTier && trendData.length > 0 && <TrendChart data={trendData} />}

      {/* Stale Inventory */}
      {staleItems.length > 0 && (
        <StaleInventoryList
          items={visibleStaleItems}
          hiddenCount={hasMoreStaleItems ? hiddenStaleCount : 0}
          onItemPress={handleItemPress}
          onSeeMore={handleUpgrade}
        />
      )}

      {/* Analytics Retention Notice for Free Tier */}
      {!isPaidTier && (
        <View style={styles.retentionNotice}>
          <Text style={styles.retentionText}>
            Free tier: {TIER_LIMITS.free.analyticsRetentionDays}-day analytics history.
            Upgrade for unlimited history.
          </Text>
        </View>
      )}

      {/* Export Modal (Paid Tier Only) */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowExportModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Data</Text>
              <Pressable onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.exportOptions}>
              <ExportOption
                icon="cube-outline"
                label="Pallets"
                description="All pallet data"
                onPress={() => handleExport('pallets')}
              />
              <ExportOption
                icon="pricetags-outline"
                label="Items"
                description="All items with profit data"
                onPress={() => handleExport('items')}
              />
              <ExportOption
                icon="receipt-outline"
                label="Expenses"
                description="All expense records"
                onPress={() => handleExport('expenses')}
              />
              <ExportOption
                icon="trophy-outline"
                label="Pallet Performance"
                description="Analytics by pallet"
                onPress={() => handleExport('pallet_performance')}
              />
              <ExportOption
                icon="grid-outline"
                label="Type Comparison"
                description="Analytics by source type"
                onPress={() => handleExport('type_comparison')}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// Export option component for modal
function ExportOption({
  icon,
  label,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.exportOption} onPress={onPress}>
      <View style={styles.exportOptionIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.exportOptionText}>
        <Text style={styles.exportOptionLabel}>{label}</Text>
        <Text style={styles.exportOptionDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retentionNotice: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  retentionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Header with export button
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    justifyContent: 'center',
  },
  exportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  // Export modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  exportOptions: {
    gap: spacing.sm,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  exportOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  exportOptionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
