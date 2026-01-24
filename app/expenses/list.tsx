// Expenses List Screen - Full list of all expenses and mileage trips
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
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { useExpensesStore, ExpenseWithPallets } from '@/src/stores/expenses-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useMileageStore, MileageTripWithPallets } from '@/src/stores/mileage-store';
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { Card } from '@/src/components/ui/Card';
import { ConfirmationModal } from '@/src/components/ui';
import { EXPENSE_CATEGORY_LABELS, ExpenseExportModal, ExpenseExportType, ExportFormat } from '@/src/features/expenses';
import { formatCurrency } from '@/src/lib/profit-utils';
import { exportExpenses, exportMileageTrips, exportProfitLoss } from '@/src/features/analytics/utils/csv-export';
import { exportExpensesPDF, exportMileagePDF, exportProfitLossPDF } from '@/src/features/analytics/utils/pdf-export';
import { calculateProfitLoss } from '@/src/features/analytics/utils/profit-loss-calculations';
import {
  DateRangeFilter,
  DateRange,
  isWithinDateRange,
} from '@/src/components/ui/DateRangeFilter';

// Filter types
type ActivityFilter = 'all' | 'expenses' | 'mileage';

// Unified activity item type
type ActivityItem =
  | { type: 'expense'; data: ExpenseWithPallets; timestamp: Date }
  | { type: 'mileage'; data: MileageTripWithPallets; timestamp: Date };

export default function ExpensesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { expenses, isLoading, fetchExpenses } = useExpensesStore();
  const { pallets, getPalletById, fetchPallets } = usePalletsStore();
  const { items, fetchItems } = useItemsStore();
  const { trips, isLoading: mileageLoading, fetchTrips } = useMileageStore();
  const { canPerform } = useSubscriptionStore();
  const canExportCSV = canPerform('csvExport', 0);
  const canExportPDF = canPerform('pdfExport', 0);

  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: 'this_year',
  });
  const [filter, setFilter] = useState<ActivityFilter>('all');
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
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
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

  // Combine and sort activity based on filter
  const allActivity: ActivityItem[] = useMemo(() => {
    const activities: ActivityItem[] = [];

    if (filter === 'all' || filter === 'expenses') {
      filteredExpenses.forEach(expense => {
        activities.push({
          type: 'expense',
          data: expense,
          timestamp: new Date(expense.expense_date),
        });
      });
    }

    if (filter === 'all' || filter === 'mileage') {
      filteredTrips.forEach(trip => {
        activities.push({
          type: 'mileage',
          data: trip,
          timestamp: new Date(trip.trip_date),
        });
      });
    }

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [filteredExpenses, filteredTrips, filter]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchExpenses(), fetchPallets(), fetchItems(), fetchTrips()]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpensePress = (expense: ExpenseWithPallets) =>
    router.push(`/expenses/${expense.id}`);
  const handleMileagePress = (trip: MileageTripWithPallets) =>
    router.push(`/mileage/${trip.id}`);

  // Export handler for paid members
  const handleExport = async (exportType: ExpenseExportType, format: ExportFormat) => {
    setIsExporting(true);
    try {
      let result;
      const palletMap = new Map(pallets.map(p => [p.id, p.name]));
      const exportDateRange = { start: dateRange.start, end: dateRange.end };

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
            const summary = calculateProfitLoss(items, pallets, expenses, trips, exportDateRange);
            result = await exportProfitLossPDF(summary);
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
            const summary = calculateProfitLoss(items, pallets, expenses, trips, exportDateRange);
            result = await exportProfitLoss(summary);
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

  const formatMiles = (miles: number) => `${miles.toFixed(1)} mi`;

  const isLoadingData = isLoading || mileageLoading;

  // Calculate totals for summary
  const totals = useMemo(() => {
    const expenseTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const mileageTotal = filteredTrips.reduce(
      (sum, trip) => sum + trip.miles * trip.mileage_rate,
      0
    );
    return {
      expenses: expenseTotal,
      mileage: mileageTotal,
      total: expenseTotal + mileageTotal,
      count: allActivity.length,
    };
  }, [filteredExpenses, filteredTrips, allActivity.length]);

  const renderActivityItem = (item: ActivityItem, index: number) => {
    const isLast = index === allActivity.length - 1;

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
      <Ionicons name="receipt" size={48} color={colors.textDisabled} />
      <Text style={styles.emptyTitle}>No activity found</Text>
      <Text style={styles.emptyText}>
        {filter === 'expenses'
          ? 'No expenses match your filters'
          : filter === 'mileage'
            ? 'No mileage trips match your filters'
            : 'No expenses or mileage trips match your filters'}
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'All Expenses',
          headerShown: true,
          headerStyle: { backgroundColor: colors.backgroundSecondary },
          headerShadowVisible: false,
          headerRight: canExportCSV
            ? () => (
                <Pressable
                  style={styles.exportButton}
                  onPress={() => setShowExportModal(true)}
                >
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                  <Text style={styles.exportButtonText}>Export</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingData}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Date Filter */}
        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        {/* Type Filter */}
        <View style={styles.filterRow}>
          {(['all', 'expenses', 'mileage'] as ActivityFilter[]).map((type) => (
            <Pressable
              key={type}
              style={[styles.filterChip, filter === type && styles.filterChipActive]}
              onPress={() => setFilter(type)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === type && styles.filterChipTextActive,
                ]}
              >
                {type === 'all' ? 'All' : type === 'expenses' ? 'Expenses' : 'Mileage'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>
            {totals.count} {totals.count === 1 ? 'item' : 'items'} totaling
          </Text>
          <Text style={styles.summaryValue}>-{formatCurrency(totals.total)}</Text>
        </View>

        {isLoadingData && allActivity.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : allActivity.length === 0 ? (
          renderEmptyState()
        ) : (
          <Card shadow="sm" padding={0}>
            {allActivity.map((item, index) => renderActivityItem(item, index))}
          </Card>
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  exportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.background,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.loss,
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
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  activityValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
