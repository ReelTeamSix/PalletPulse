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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { LoadingScreen } from '@/src/components/ui';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { shadows } from '@/src/constants/shadows';
import { fontFamily } from '@/src/constants/fonts';
// UI components from analytics feature
import { TIER_LIMITS } from '@/src/constants/tier-limits';

// Stores
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { useMileageStore } from '@/src/stores/mileage-store';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';

// Analytics utilities
import {
  calculateHeroMetrics,
  calculatePalletLeaderboard,
  calculateTypeComparison,
  calculateSupplierComparison,
  calculatePalletTypeComparison,
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
  SupplierRankingTable,
  PalletTypeRankingTable,
  StaleInventoryList,
  TrendChartTeaser,
  TrendChart,
  ExportDataModal,
  type ExportFormat,
} from '@/src/features/analytics/components';

// PDF Export utilities
import { exportProfitLossPDF, exportAnalyticsSummaryPDF, type AnalyticsSummaryData } from '@/src/features/analytics/utils/pdf-export';
import { calculateProfitLoss } from '@/src/features/analytics/utils/profit-loss-calculations';
import { exportProfitLoss as exportProfitLossCSV } from '@/src/features/analytics/utils/csv-export';

// Date range filter
import { DateRangeFilter, DateRange } from '@/src/components/ui/DateRangeFilter';
import { ConfirmationModal } from '@/src/components/ui';

// Subscription store and paywall
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { useOnboardingStore } from '@/src/stores/onboarding-store';
import { PaywallModal } from '@/src/components/subscription';

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Get user's subscription tier from subscription store
  const { getEffectiveTier, canPerform } = useSubscriptionStore();
  const { isTrialActive } = useOnboardingStore();

  // Check trial status - trial users get Pro access
  const trialActive = isTrialActive();
  const tier = trialActive ? 'pro' : getEffectiveTier();
  const isPaidTier = tier !== 'free';
  const canExportCSV = trialActive || canPerform('csvExport', 0);
  const canExportPDF = trialActive || canPerform('pdfExport', 0);

  // Stores
  const { pallets, fetchPallets, isLoading: palletsLoading } = usePalletsStore();
  const { items, fetchItems, isLoading: itemsLoading } = useItemsStore();
  const { expenses, fetchExpenses, isLoading: expensesLoading } = useExpensesStore();
  const { trips: mileageTrips, fetchTrips: fetchMileage } = useMileageStore();
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
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);

  // Fetch data on mount and focus
  useFocusEffect(
    useCallback(() => {
      fetchPallets();
      fetchItems();
      fetchExpenses();
      fetchMileage();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references
  );

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPallets(), fetchItems(), fetchExpenses(), fetchMileage()]);
    setRefreshing(false);
  };

  // Calculate analytics metrics
  const heroMetrics = useMemo(
    () => calculateHeroMetrics(pallets, items, expenses, dateRange),
    [pallets, items, expenses, dateRange]
  );

  const leaderboard = useMemo(
    () => calculatePalletLeaderboard(pallets, items, expenses, dateRange),
    [pallets, items, expenses, dateRange]
  );

  const typeComparison = useMemo(
    () => calculateTypeComparison(pallets, items, expenses, dateRange),
    [pallets, items, expenses, dateRange]
  );

  const supplierComparison = useMemo(
    () => calculateSupplierComparison(pallets, items, expenses, dateRange),
    [pallets, items, expenses, dateRange]
  );

  const palletTypeComparison = useMemo(
    () => calculatePalletTypeComparison(pallets, items, expenses, dateRange),
    [pallets, items, expenses, dateRange]
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
    supplierComparison: 2,
    palletTypeComparison: 2,
    staleItems: 3,
  };

  const visibleLeaderboard = isPaidTier
    ? leaderboard
    : leaderboard.slice(0, FREE_TIER_LIMITS.leaderboard);

  const visibleTypeComparison = isPaidTier
    ? typeComparison
    : typeComparison.slice(0, FREE_TIER_LIMITS.typeComparison);

  const visibleSupplierComparison = isPaidTier
    ? supplierComparison
    : supplierComparison.slice(0, FREE_TIER_LIMITS.supplierComparison);

  const visiblePalletTypeComparison = isPaidTier
    ? palletTypeComparison
    : palletTypeComparison.slice(0, FREE_TIER_LIMITS.palletTypeComparison);

  const visibleStaleItems = isPaidTier
    ? staleItems
    : staleItems.slice(0, FREE_TIER_LIMITS.staleItems);

  // Check if there's hidden data
  const hasMoreTypeComparison = !isPaidTier && typeComparison.length > FREE_TIER_LIMITS.typeComparison;
  const hasMoreSupplierComparison = !isPaidTier && supplierComparison.length > FREE_TIER_LIMITS.supplierComparison;
  const hasMorePalletTypeComparison = !isPaidTier && palletTypeComparison.length > FREE_TIER_LIMITS.palletTypeComparison;
  const hasMoreStaleItems = !isPaidTier && staleItems.length > FREE_TIER_LIMITS.staleItems;
  const hiddenLeaderboardCount = Math.max(0, leaderboard.length - FREE_TIER_LIMITS.leaderboard);
  const hiddenStaleCount = Math.max(0, staleItems.length - FREE_TIER_LIMITS.staleItems);

  // Navigation handlers
  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  const handlePalletPress = (palletId: string) => {
    router.push(`/pallets/${palletId}`);
  };

  const handleItemPress = (itemId: string) => {
    router.push(`/items/${itemId}`);
  };

  // Export handler (paid tier only)
  const handleExport = async (exportType: ExportType, format: ExportFormat) => {
    setIsExporting(true);

    try {
      let result;

      // Get date range for reports
      const exportDateRange = dateRange.start && dateRange.end
        ? { start: dateRange.start.toISOString().split('T')[0], end: dateRange.end.toISOString().split('T')[0] }
        : undefined;

      // Handle specific export types
      switch (exportType) {
        case 'profit_loss':
          // P&L has both CSV and PDF versions
          const plSummary = calculateProfitLoss(items, pallets, expenses, mileageTrips, exportDateRange);
          if (format === 'pdf') {
            result = await exportProfitLossPDF(plSummary);
          } else {
            result = await exportProfitLossCSV(plSummary);
          }
          break;

        case 'analytics_summary':
          // Analytics Summary is PDF-only
          const analyticsSummaryData: AnalyticsSummaryData = {
            heroMetrics,
            supplierRankings: supplierComparison,
            palletTypeRankings: palletTypeComparison,
            palletLeaderboard: leaderboard,
            typeComparison,
            periodStart: exportDateRange?.start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
            periodEnd: exportDateRange?.end || new Date().toISOString().split('T')[0],
          };
          result = await exportAnalyticsSummaryPDF(analyticsSummaryData);
          break;

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

      if (result.success) {
        // Close modal on success
        setShowExportModal(false);
      } else {
        setErrorModal({
          visible: true,
          title: 'Export Failed',
          message: result.error || 'Failed to export data',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export data';
      setErrorModal({
        visible: true,
        title: 'Export Failed',
        message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = palletsLoading || itemsLoading || expensesLoading;

  // Empty state check
  const hasData = pallets.length > 0 || items.length > 0;

  // Show full-screen centered loading for initial data load
  if (isLoading && !hasData) {
    return <LoadingScreen />;
  }

  if (!hasData && !isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }]}>
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
          {canExportCSV && (
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

      {/* Supplier Ranking */}
      {supplierComparison.length > 0 && (
        <SupplierRankingTable
          data={visibleSupplierComparison}
          blurred={hasMoreSupplierComparison}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* Pallet Type Ranking */}
      {palletTypeComparison.length > 0 && (
        <PalletTypeRankingTable
          data={visiblePalletTypeComparison}
          blurred={hasMorePalletTypeComparison}
          onUpgrade={handleUpgrade}
        />
      )}

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
      <ExportDataModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isExporting={isExporting}
        canExportPDF={canExportPDF}
        onUpgrade={handleUpgrade}
      />

      {/* Error Modal */}
      <ConfirmationModal
        visible={errorModal.visible}
        type="warning"
        title={errorModal.title}
        message={errorModal.message}
        primaryLabel="OK"
        onPrimary={() => setErrorModal({ ...errorModal, visible: false })}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
      />

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        requiredTier="starter"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
});
