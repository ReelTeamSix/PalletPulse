import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { useExpensesStore, ExpenseWithPallets } from '@/src/stores/expenses-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useMileageStore, MileageTripWithPallets } from '@/src/stores/mileage-store';
import { ExpenseCard } from '@/src/features/expenses/components/ExpenseCard';
import { MileageTripCard, formatDeduction, formatMiles } from '@/src/features/mileage';
import {
  formatExpenseAmount,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  ExpenseCategory,
} from '@/src/features/expenses';
import {
  DateRangeFilter,
  DateRange,
  isWithinDateRange,
} from '@/src/components/ui/DateRangeFilter';

type CategoryFilter = 'all' | ExpenseCategory;
type Segment = 'expenses' | 'mileage';

const SEGMENT_STORAGE_KEY = '@expenses_tab_segment';

export default function ExpensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { expenses, isLoading, error, fetchExpenses } = useExpensesStore();
  const { pallets, getPalletById, fetchPallets } = usePalletsStore();
  const { items, fetchItems } = useItemsStore();
  const {
    trips,
    isLoading: mileageLoading,
    fetchTrips,
    getYTDSummary,
    currentMileageRate,
    fetchCurrentMileageRate,
  } = useMileageStore();

  const [activeSegment, setActiveSegment] = useState<Segment>('expenses');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: 'all',
  });

  // Load saved segment on mount
  useEffect(() => {
    AsyncStorage.getItem(SEGMENT_STORAGE_KEY).then((value) => {
      if (value === 'expenses' || value === 'mileage') {
        setActiveSegment(value);
      }
    });
  }, []);

  // Save segment when changed
  const handleSegmentChange = (segment: Segment) => {
    setActiveSegment(segment);
    AsyncStorage.setItem(SEGMENT_STORAGE_KEY, segment);
  };

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
      fetchPallets();
      fetchItems();
      fetchTrips();
      fetchCurrentMileageRate();
    }, [])
  );

  // Filter expenses by category and date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Category filter
      if (activeCategory !== 'all' && e.category !== activeCategory) {
        return false;
      }
      // Date range filter - use expense_date field
      if (e.expense_date && !isWithinDateRange(e.expense_date, dateRange)) {
        return false;
      }
      return true;
    });
  }, [expenses, activeCategory, dateRange]);

  // Filter mileage trips by date range
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => isWithinDateRange(trip.trip_date, dateRange));
  }, [trips, dateRange]);

  // Calculate mileage summary based on filtered trips
  const mileageSummary = useMemo(() => {
    const totalMiles = filteredTrips.reduce((sum, trip) => sum + trip.miles, 0);
    const totalDeduction = filteredTrips.reduce(
      (sum, trip) => sum + trip.miles * trip.mileage_rate,
      0
    );
    return { totalMiles, totalDeduction };
  }, [filteredTrips]);

  // Calculate total operating expenses
  const totalOperatingExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Break down operating expenses by category
  const expensesByCategory = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const category = e.category || 'other';
      breakdown[category] = (breakdown[category] || 0) + e.amount;
    });
    return breakdown;
  }, [filteredExpenses]);

  // Calculate sales costs (platform fees + shipping) from sold items
  const salesCosts = useMemo(() => {
    const soldItems = items.filter(item => {
      if (item.status !== 'sold') return false;
      // Filter by date range using sale_date
      if (item.sale_date && !isWithinDateRange(item.sale_date, dateRange)) {
        return false;
      }
      return true;
    });

    const platformFees = soldItems.reduce((sum, item) => sum + (item.platform_fee || 0), 0);
    const shippingCosts = soldItems.reduce((sum, item) => sum + (item.shipping_cost || 0), 0);
    const itemCount = soldItems.length;

    return { platformFees, shippingCosts, itemCount };
  }, [items, dateRange]);

  // Combined total for header display
  const totalAllExpenses = totalOperatingExpenses + salesCosts.platformFees + salesCosts.shippingCosts;

  const handleAddExpense = () => {
    router.push('/expenses/new');
  };

  const handleAddMileage = () => {
    router.push('/mileage/new');
  };

  const handleExpensePress = (expense: ExpenseWithPallets) => {
    router.push(`/expenses/${expense.id}`);
  };

  const handleMileagePress = (trip: MileageTripWithPallets) => {
    router.push(`/mileage/${trip.id}`);
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchExpenses(),
      fetchPallets(),
      fetchItems(),
      fetchTrips(),
      fetchCurrentMileageRate(),
    ]);
  }, []);

  // Get linked pallets for an expense
  const getLinkedPallets = (expense: ExpenseWithPallets) => {
    const palletIds = expense.pallet_ids?.length
      ? expense.pallet_ids
      : expense.pallet_id
        ? [expense.pallet_id]
        : [];
    return palletIds
      .map(id => getPalletById(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
  };

  // Get pallet names for mileage trips
  const getPalletNames = useCallback(
    (palletIds: string[]) => {
      return palletIds
        .map((id) => getPalletById(id)?.name)
        .filter((name): name is string => !!name);
    },
    [pallets]
  );

  const renderExpenseCard = ({ item }: { item: ExpenseWithPallets }) => {
    const linkedPallets = getLinkedPallets(item);
    return (
      <ExpenseCard
        expense={item}
        palletNames={linkedPallets.map(p => p.name)}
        onPress={() => handleExpensePress(item)}
      />
    );
  };

  const renderMileageCard = ({ item }: { item: MileageTripWithPallets }) => (
    <MileageTripCard
      trip={item}
      onPress={() => handleMileagePress(item)}
      palletNames={getPalletNames(item.pallet_ids)}
    />
  );

  // Summary card showing sales costs + operating expenses breakdown
  const hasSalesCosts = salesCosts.platformFees > 0 || salesCosts.shippingCosts > 0;
  const hasOperatingExpenses = totalOperatingExpenses > 0;

  // Get icon for expense category
  const getCategoryIcon = (category: string): React.ComponentProps<typeof FontAwesome>['name'] => {
    switch (category) {
      case 'storage': return 'home';
      case 'supplies': return 'shopping-bag';
      case 'subscriptions': return 'refresh';
      case 'equipment': return 'wrench';
      case 'gas': return 'car';
      case 'mileage': return 'road';
      case 'fees': return 'money';
      case 'shipping': return 'truck';
      default: return 'ellipsis-h';
    }
  };

  const renderExpensesSummaryCard = () => {
    // Show if there are sales costs OR operating expenses
    if (!hasSalesCosts && !hasOperatingExpenses) return null;

    const categoryEntries = Object.entries(expensesByCategory).filter(([_, amount]) => amount > 0);

    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <FontAwesome name="pie-chart" size={16} color={colors.primary} />
          <Text style={styles.summaryTitle}>Cost Breakdown</Text>
        </View>

        {/* From Sales section - only show if there are sales costs */}
        {hasSalesCosts && (
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionLabel}>From Sales ({salesCosts.itemCount} items)</Text>
            {salesCosts.platformFees > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                  <FontAwesome name="credit-card" size={12} color={colors.textSecondary} />
                  <Text style={styles.summaryRowLabel}>Platform Fees</Text>
                </View>
                <Text style={styles.summaryRowValue}>{formatExpenseAmount(salesCosts.platformFees)}</Text>
              </View>
            )}
            {salesCosts.shippingCosts > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                  <FontAwesome name="truck" size={12} color={colors.textSecondary} />
                  <Text style={styles.summaryRowLabel}>Shipping</Text>
                </View>
                <Text style={styles.summaryRowValue}>{formatExpenseAmount(salesCosts.shippingCosts)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Operating Expenses section - broken down by category */}
        {hasOperatingExpenses && (
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionLabel}>Operating Expenses</Text>
            {categoryEntries.map(([category, amount]) => (
              <View key={category} style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                  <FontAwesome name={getCategoryIcon(category)} size={12} color={colors.textSecondary} />
                  <Text style={styles.summaryRowLabel}>{EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category}</Text>
                </View>
                <Text style={styles.summaryRowValue}>{formatExpenseAmount(amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Total */}
        <View style={styles.summaryTotal}>
          <Text style={styles.summaryTotalLabel}>Total Expenses</Text>
          <Text style={styles.summaryTotalValue}>{formatExpenseAmount(totalAllExpenses)}</Text>
        </View>

        {/* Note about already accounted - only show if there are sales costs */}
        {hasSalesCosts && (
          <View style={styles.summaryNote}>
            <FontAwesome name="info-circle" size={10} color={colors.textSecondary} />
            <Text style={styles.summaryNoteText}>
              Sales costs are already deducted from item profits
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderMileageSummaryCard = () => {
    if (filteredTrips.length === 0) return null;

    const displaySummary = dateRange.preset === 'all' ? getYTDSummary() : mileageSummary;

    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <FontAwesome name="road" size={16} color={colors.primary} />
          <Text style={styles.summaryTitle}>
            {dateRange.preset === 'all' ? `${new Date().getFullYear()} Year-to-Date` : 'Period Summary'}
          </Text>
          <View style={styles.rateTag}>
            <Text style={styles.rateTagText}>${currentMileageRate.toFixed(3)}/mi</Text>
          </View>
        </View>

        <View style={styles.mileageStats}>
          <View style={styles.mileageStat}>
            <Text style={styles.mileageStatValue}>{filteredTrips.length}</Text>
            <Text style={styles.mileageStatLabel}>Trips</Text>
          </View>
          <View style={styles.mileageStatDivider} />
          <View style={styles.mileageStat}>
            <Text style={styles.mileageStatValue}>{formatMiles(displaySummary.totalMiles)}</Text>
            <Text style={styles.mileageStatLabel}>Miles</Text>
          </View>
          <View style={styles.mileageStatDivider} />
          <View style={styles.mileageStat}>
            <Text style={[styles.mileageStatValue, styles.deductionValue]}>
              {formatDeduction(displaySummary.totalDeduction)}
            </Text>
            <Text style={styles.mileageStatLabel}>Deduction</Text>
          </View>
        </View>

        <View style={styles.mileageDisclaimer}>
          <FontAwesome name="info-circle" size={12} color={colors.warning} />
          <Text style={styles.mileageDisclaimerText}>
            Consult a tax professional. PalletPulse is not tax advice.
          </Text>
        </View>
      </View>
    );
  };

  const renderExpensesEmptyState = () => (
    <View style={styles.placeholder}>
      <FontAwesome name="dollar" size={48} color={colors.neutral} />
      <Text style={styles.placeholderTitle}>No overhead expenses</Text>
      <Text style={styles.placeholderText}>
        Tap the + button to log your first expense. Track storage, supplies, subscriptions, and more.
      </Text>
    </View>
  );

  const renderMileageEmptyState = () => (
    <View style={styles.placeholder}>
      <FontAwesome name="road" size={48} color={colors.neutral} />
      <Text style={styles.placeholderTitle}>No mileage trips</Text>
      <Text style={styles.placeholderText}>
        Tap the + button to log your first trip. Track business miles for tax deductions.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.placeholder}>
      <FontAwesome name="exclamation-circle" size={48} color={colors.loss} />
      <Text style={styles.placeholderTitle}>Something went wrong</Text>
      <Text style={styles.placeholderText}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </Pressable>
    </View>
  );

  const handleClearFilters = () => {
    setActiveCategory('all');
    setDateRange({ start: null, end: null, preset: 'all' });
  };

  const getNoResultsMessage = () => {
    if (activeSegment === 'mileage') {
      return 'No mileage trips in the selected date range';
    }

    const hasDateFilter = dateRange.preset !== 'all';
    const hasCategoryFilter = activeCategory !== 'all';

    if (hasDateFilter && hasCategoryFilter) {
      return `No "${activeCategory}" overhead expenses in the selected date range`;
    } else if (hasDateFilter) {
      return 'No overhead expenses in the selected date range';
    } else if (hasCategoryFilter) {
      return `No overhead expenses in the "${activeCategory}" category`;
    }
    return 'No overhead expenses match your filters';
  };

  const renderNoResults = () => (
    <View style={styles.noResults}>
      <FontAwesome name="filter" size={32} color={colors.neutral} />
      <Text style={styles.noResultsTitle}>No results found</Text>
      <Text style={styles.noResultsText}>{getNoResultsMessage()}</Text>
      <Pressable
        style={styles.clearFilterButton}
        onPress={handleClearFilters}
      >
        <Text style={styles.clearFilterText}>Clear filters</Text>
      </Pressable>
    </View>
  );

  // Category options for filter
  const categoryOptions: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    ...EXPENSE_CATEGORIES.map(cat => ({ value: cat as CategoryFilter, label: EXPENSE_CATEGORY_LABELS[cat] })),
  ];

  const isLoadingData = activeSegment === 'expenses' ? isLoading : mileageLoading;
  const hasData = activeSegment === 'expenses' ? expenses.length > 0 : trips.length > 0;
  const filteredData = activeSegment === 'expenses' ? filteredExpenses : filteredTrips;

  // Compute header amounts
  // Combined total for prominent display (overhead + mileage deductions)
  const combinedTotal = totalAllExpenses + mileageSummary.totalDeduction;
  const hasCombinedData = expenses.length > 0 || trips.length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Deductions</Text>
          <View style={styles.headerRight}>
            <Text style={styles.totalAmount}>
              {hasCombinedData ? formatExpenseAmount(combinedTotal) : '$0.00'}
            </Text>
            <Text style={styles.totalLabel}>total</Text>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <Pressable
            style={[
              styles.segmentButton,
              activeSegment === 'expenses' && styles.segmentButtonActive,
            ]}
            onPress={() => handleSegmentChange('expenses')}
          >
            <FontAwesome
              name="dollar"
              size={14}
              color={activeSegment === 'expenses' ? colors.background : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentButtonText,
                activeSegment === 'expenses' && styles.segmentButtonTextActive,
              ]}
            >
              Overhead
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.segmentButton,
              activeSegment === 'mileage' && styles.segmentButtonActive,
            ]}
            onPress={() => handleSegmentChange('mileage')}
          >
            <FontAwesome
              name="road"
              size={14}
              color={activeSegment === 'mileage' ? colors.background : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentButtonText,
                activeSegment === 'mileage' && styles.segmentButtonTextActive,
              ]}
            >
              Mileage
            </Text>
          </Pressable>
        </View>

        {/* Date Range Filter */}
        {hasData && (
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            compact
          />
        )}

        {/* Category Filter (Expenses only) */}
        {activeSegment === 'expenses' && expenses.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {categoryOptions.map((cat) => (
              <Pressable
                key={cat.value}
                style={[
                  styles.filterChip,
                  activeCategory === cat.value && styles.filterChipActive,
                ]}
                onPress={() => setActiveCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeCategory === cat.value && styles.filterChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Content */}
      {isLoadingData && !hasData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            Loading {activeSegment === 'expenses' ? 'overhead expenses' : 'mileage'}...
          </Text>
        </View>
      ) : error && !hasData ? (
        renderErrorState()
      ) : !hasData ? (
        activeSegment === 'expenses' ? renderExpensesEmptyState() : renderMileageEmptyState()
      ) : filteredData.length === 0 ? (
        renderNoResults()
      ) : activeSegment === 'expenses' ? (
        <FlatList
          data={filteredExpenses}
          renderItem={renderExpenseCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderExpensesSummaryCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <FlatList
          data={filteredTrips}
          renderItem={renderMileageCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderMileageSummaryCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={mileageLoading}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* FAB - context-aware */}
      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom, spacing.lg) }]}
        onPress={activeSegment === 'expenses' ? handleAddExpense : handleAddMileage}
      >
        <FontAwesome name="plus" size={24} color={colors.background} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  totalLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: -4,
  },
  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentButtonTextActive: {
    color: colors.background,
  },
  // Filter
  filterContainer: {
    marginHorizontal: -spacing.lg,
    marginTop: spacing.xs,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full || 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.background,
  },
  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  // Empty/Error states
  placeholder: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  noResultsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  noResultsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  clearFilterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  clearFilterText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '500',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  // Summary Card (Expenses)
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  summarySection: {
    marginBottom: spacing.md,
  },
  summarySectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryRowLabel: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  summaryRowValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryTotalLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.loss,
  },
  summaryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryNoteText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  // Mileage Summary
  rateTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  rateTagText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  mileageStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mileageStat: {
    flex: 1,
    alignItems: 'center',
  },
  mileageStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  mileageStatValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  mileageStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deductionValue: {
    color: colors.profit,
  },
  mileageDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mileageDisclaimerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
});
