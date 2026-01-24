import { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import { typography } from '@/src/constants/typography';
import { fontFamily } from '@/src/constants/fonts';
import { useExpensesStore, ExpenseWithPallets } from '@/src/stores/expenses-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useMileageStore, MileageTripWithPallets } from '@/src/stores/mileage-store';
import { Card } from '@/src/components/ui/Card';
import { ConfirmationModal } from '@/src/components/ui';
import {
  SummaryCard,
  SummaryCardRow,
  TopCategoriesScroll,
  EXPENSE_CATEGORY_LABELS,
  ExpenseExportModal,
  ExpenseExportType,
  ExportFormat,
} from '@/src/features/expenses';
import { formatCurrency } from '@/src/lib/profit-utils';
import { ExpenseCategory } from '@/src/types/database';
import {
  DateRangeFilter,
  DateRange,
  isWithinDateRange,
} from '@/src/components/ui/DateRangeFilter';
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { UpgradePrompt } from '@/src/components/subscription';
import { exportExpenses, exportMileageTrips, exportProfitLoss } from '@/src/features/analytics/utils/csv-export';
import { exportExpensesPDF, exportMileagePDF, exportProfitLossPDF } from '@/src/features/analytics/utils/pdf-export';
import { calculateProfitLoss } from '@/src/features/analytics/utils/profit-loss-calculations';

// Unified activity item type
type ActivityItem =
  | { type: 'expense'; data: ExpenseWithPallets; timestamp: Date }
  | { type: 'mileage'; data: MileageTripWithPallets; timestamp: Date };

export default function ExpensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Check subscription tier for expense tracking access
  const { canPerform } = useSubscriptionStore();
  const canAccessExpenses = canPerform('expenseTracking', 0);
  const canExportCSV = canPerform('csvExport', 0);
  const canExportPDF = canPerform('pdfExport', 0);

  const { expenses, isLoading, error, fetchExpenses } = useExpensesStore();
  const { pallets, getPalletById, fetchPallets } = usePalletsStore();
  const { items, fetchItems } = useItemsStore();
  const {
    trips,
    isLoading: mileageLoading,
    fetchTrips,
    fetchCurrentMileageRate,
  } = useMileageStore();

  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: 'this_year',
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
      fetchPallets();
      fetchItems();
      fetchTrips();
      fetchCurrentMileageRate();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references
  );

  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (e.expense_date && !isWithinDateRange(e.expense_date, dateRange)) {
        return false;
      }
      return true;
    });
  }, [expenses, dateRange]);

  // Filter mileage trips by date range
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => isWithinDateRange(trip.trip_date, dateRange));
  }, [trips, dateRange]);

  // Calculate summaries
  const totalOverhead = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const mileageSummary = useMemo(() => {
    const totalMiles = filteredTrips.reduce((sum, trip) => sum + trip.miles, 0);
    const totalDeduction = filteredTrips.reduce(
      (sum, trip) => sum + trip.miles * trip.mileage_rate,
      0
    );
    return { totalMiles, totalDeduction };
  }, [filteredTrips]);

  // Expense categories breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: { category: ExpenseCategory; amount: number; label: string }[] = [];
    const categoryTotals: Record<string, number> = {};

    filteredExpenses.forEach(e => {
      const category = e.category || 'other';
      categoryTotals[category] = (categoryTotals[category] || 0) + e.amount;
    });

    Object.entries(categoryTotals).forEach(([category, amount]) => {
      breakdown.push({
        category: category as ExpenseCategory,
        amount,
        label: EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category,
      });
    });

    return breakdown;
  }, [filteredExpenses]);

  // Combine and sort activity
  const recentActivity: ActivityItem[] = useMemo(() => {
    const activities: ActivityItem[] = [];

    filteredExpenses.forEach(expense => {
      activities.push({
        type: 'expense',
        data: expense,
        timestamp: new Date(expense.expense_date),
      });
    });

    filteredTrips.forEach(trip => {
      activities.push({
        type: 'mileage',
        data: trip,
        timestamp: new Date(trip.trip_date),
      });
    });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }, [filteredExpenses, filteredTrips]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchExpenses(),
      fetchPallets(),
      fetchItems(),
      fetchTrips(),
      fetchCurrentMileageRate(),
    ]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references

  const handleAddExpense = () => router.push('/expenses/new');
  const handleAddMileage = () => router.push('/mileage/new');
  const handleExpensePress = (expense: ExpenseWithPallets) => router.push(`/expenses/${expense.id}`);
  const handleMileagePress = (trip: MileageTripWithPallets) => router.push(`/mileage/${trip.id}`);
  const handleViewAll = () => router.push('/expenses/list');

  // Export handler for paid members
  const handleExport = async (exportType: ExpenseExportType, format: ExportFormat) => {
    setIsExporting(true);
    try {
      let result;
      const palletMap = new Map(pallets.map(p => [p.id, p.name]));
      // Convert Date objects to ISO strings for export functions
      // Only pass dateRange if both start and end are set
      const startStr = dateRange.start?.toISOString().split('T')[0];
      const endStr = dateRange.end?.toISOString().split('T')[0];
      const exportDateRange = startStr && endStr ? { start: startStr, end: endStr } : undefined;
      // Also keep nullable version for calculateProfitLoss which accepts nulls
      const profitLossDateRange = { start: startStr ?? null, end: endStr ?? null };

      if (format === 'pdf') {
        // PDF exports
        switch (exportType) {
          case 'expenses':
            result = await exportExpensesPDF(filteredExpenses, palletMap, exportDateRange);
            break;
          case 'mileage':
            result = await exportMileagePDF(filteredTrips, palletMap, exportDateRange);
            break;
          case 'profit_loss':
            const summaryPDF = calculateProfitLoss(items, pallets, expenses, trips, profitLossDateRange);
            result = await exportProfitLossPDF(summaryPDF);
            break;
          default:
            throw new Error('Unknown export type');
        }
      } else {
        // CSV exports
        switch (exportType) {
          case 'expenses':
            result = await exportExpenses(filteredExpenses, pallets);
            break;
          case 'mileage':
            result = await exportMileageTrips(filteredTrips, pallets);
            break;
          case 'profit_loss':
            const summaryCSV = calculateProfitLoss(items, pallets, expenses, trips, profitLossDateRange);
            result = await exportProfitLoss(summaryCSV);
            break;
          default:
            throw new Error('Unknown export type');
        }
      }

      if (result.success) {
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

  const getPalletNames = (palletIds: string[]) => {
    return palletIds
      .map(id => getPalletById(id)?.name)
      .filter((name): name is string => !!name);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMiles = (miles: number) => {
    return `${miles.toFixed(1)} mi`;
  };

  const isLoadingData = isLoading || mileageLoading;
  const hasData = expenses.length > 0 || trips.length > 0;

  const renderActivityItem = (item: ActivityItem, index: number) => {
    const isLast = index === recentActivity.length - 1;

    if (item.type === 'expense') {
      const expense = item.data;
      const linkedPalletIds = expense.pallet_ids?.length
        ? expense.pallet_ids
        : expense.pallet_id
          ? [expense.pallet_id]
          : [];
      const palletNames = getPalletNames(linkedPalletIds);

      return (
        <Pressable
          key={`expense-${expense.id}`}
          style={({ pressed }) => [
            styles.activityRow,
            !isLast && styles.activityRowBorder,
            pressed && styles.activityRowPressed,
          ]}
          onPress={() => handleExpensePress(expense)}
        >
          <View style={[styles.activityIcon, { backgroundColor: colors.loss + '15' }]}>
            <Ionicons name="receipt" size={18} color={colors.loss} />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle} numberOfLines={1}>
              {expense.description || EXPENSE_CATEGORY_LABELS[expense.category] || 'Expense'}
            </Text>
            <Text style={styles.activitySubtitle} numberOfLines={1}>
              {formatDate(expense.expense_date)}
              {palletNames.length > 0 ? ` - ${palletNames[0]}` : ''}
            </Text>
          </View>
          <Text style={[styles.activityValue, { color: colors.loss }]}>
            -{formatCurrency(expense.amount)}
          </Text>
        </Pressable>
      );
    }

    // Mileage trip
    const trip = item.data;
    const deduction = trip.miles * trip.mileage_rate;
    const palletNames = getPalletNames(trip.pallet_ids);

    return (
      <Pressable
        key={`mileage-${trip.id}`}
        style={({ pressed }) => [
          styles.activityRow,
          !isLast && styles.activityRowBorder,
          pressed && styles.activityRowPressed,
        ]}
        onPress={() => handleMileagePress(trip)}
      >
        <View style={[styles.activityIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="car" size={18} color={colors.primary} />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle} numberOfLines={1}>
            {trip.notes || 'Mileage Trip'}
          </Text>
          <Text style={styles.activitySubtitle} numberOfLines={1}>
            {formatDate(trip.trip_date)} - {formatMiles(trip.miles)}
            {palletNames.length > 0 ? ` - ${palletNames[0]}` : ''}
          </Text>
        </View>
        <Text style={[styles.activityValue, { color: colors.loss }]}>
          -{formatCurrency(deduction)}
        </Text>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet" size={48} color={colors.textDisabled} />
      <Text style={styles.emptyTitle}>No expenses yet</Text>
      <Text style={styles.emptyText}>
        Track your business expenses and mileage to maximize your tax deductions.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle" size={48} color={colors.loss} />
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.emptyText}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </Pressable>
    </View>
  );

  // Show upgrade prompt for free tier users
  if (!canAccessExpenses) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>Track overheads & mileage</Text>
        </View>
        <UpgradePrompt
          limitType="expenseTracking"
          currentCount={0}
          requiredTier="starter"
          variant="card"
        />
        <View style={styles.featurePreview}>
          <Text style={styles.featurePreviewTitle}>What you get with Starter:</Text>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.profit} />
            <Text style={styles.featureText}>Track business expenses by category</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.profit} />
            <Text style={styles.featureText}>Log mileage trips for tax deductions</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.profit} />
            <Text style={styles.featureText}>Attach receipt photos to expenses</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.profit} />
            <Text style={styles.featureText}>Calculate IRS mileage deductions</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Show loading state for initial data load (header visible, loading centered)
  if (isLoadingData && !hasData) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerFixed, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Expenses</Text>
            <Text style={styles.subtitle}>Track overheads & mileage</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingData}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>Track overheads & mileage</Text>
        </View>
        {canExportCSV && hasData && (
          <Pressable
            style={styles.exportButton}
            onPress={() => setShowExportModal(true)}
          >
            <Ionicons name="download-outline" size={16} color={colors.primary} />
            <Text style={styles.exportButtonText}>Export</Text>
          </Pressable>
        )}
      </View>

      {/* Date Filter */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {error && !hasData ? (
        renderErrorState()
      ) : !hasData ? (
        renderEmptyState()
      ) : (
        <>
          {/* Summary Cards */}
          <SummaryCardRow>
            <SummaryCard
              icon="receipt"
              label="Overhead"
              value={totalOverhead}
              subtitle={`${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? 's' : ''}`}
            />
            <SummaryCard
              icon="car"
              label="Mileage"
              value={mileageSummary.totalDeduction}
              subtitle={`${mileageSummary.totalMiles.toFixed(0)} mi logged`}
            />
          </SummaryCardRow>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleAddExpense}
            >
              <Ionicons name="add" size={18} color={colors.background} />
              <Text style={styles.primaryButtonText}>Add Expense</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleAddMileage}
            >
              <Ionicons name="car" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Add Trip</Text>
            </Pressable>
          </View>

          {/* Top Categories */}
          {categoryBreakdown.length > 0 && (
            <TopCategoriesScroll categories={categoryBreakdown} />
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <View style={styles.activitySection}>
              <View style={styles.activityHeader}>
                <Text style={styles.activityHeaderTitle}>RECENT ACTIVITY</Text>
                <Pressable onPress={handleViewAll} hitSlop={8}>
                  <Text style={styles.viewAllLink}>View All</Text>
                </Pressable>
              </View>
              <Card shadow="sm" padding={0}>
                {recentActivity.map((item, index) => renderActivityItem(item, index))}
              </Card>
            </View>
          )}

          {/* Tax Disclaimer */}
          {(filteredExpenses.length > 0 || filteredTrips.length > 0) && (
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={14} color={colors.textDisabled} />
              <Text style={styles.disclaimerText}>
                Business expenses may be tax deductible. Consult a tax professional.
              </Text>
            </View>
          )}
        </>
      )}
      </ScrollView>

      {/* Export Modal */}
      <ExpenseExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isExporting={isExporting}
        canExportPDF={canExportPDF}
        onUpgrade={() => {
          setShowExportModal(false);
          router.push('/settings/subscription');
        }}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerFixed: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  exportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    fontFamily: fontFamily.regular,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  retryText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.background,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  activitySection: {
    marginBottom: spacing.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activityHeaderTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  viewAllLink: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityRowPressed: {
    backgroundColor: colors.surface,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  activityTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  activityValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  disclaimerText: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    fontFamily: fontFamily.regular,
  },
  featurePreview: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  featurePreviewTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    flex: 1,
    fontFamily: fontFamily.regular,
  },
});
