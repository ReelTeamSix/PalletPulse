import { useCallback, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { useExpensesStore, ExpenseWithPallets } from '@/src/stores/expenses-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { ExpenseCard } from '@/src/features/expenses/components/ExpenseCard';
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

export default function ExpensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { expenses, isLoading, error, fetchExpenses } = useExpensesStore();
  const { pallets, getPalletById, fetchPallets } = usePalletsStore();
  const { items, fetchItems } = useItemsStore();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: 'all',
  });

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
      fetchPallets();
      fetchItems();
    }, [])
  );

  // Filter expenses by category and date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Category filter
      if (activeCategory !== 'all' && e.category !== activeCategory) {
        return false;
      }
      // Date range filter
      if (!isWithinDateRange(e.date, dateRange)) {
        return false;
      }
      return true;
    });
  }, [expenses, activeCategory, dateRange]);

  // Calculate total operating expenses
  const totalOperatingExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
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

  const handleExpensePress = (expense: ExpenseWithPallets) => {
    router.push(`/expenses/${expense.id}`);
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchExpenses(), fetchPallets(), fetchItems()]);
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

  // Summary card showing sales costs + operating expenses breakdown
  const hasSalesCosts = salesCosts.platformFees > 0 || salesCosts.shippingCosts > 0;

  const renderSummaryCard = () => {
    // Only show if there are sales costs to display
    if (!hasSalesCosts) return null;

    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <FontAwesome name="pie-chart" size={16} color={colors.primary} />
          <Text style={styles.summaryTitle}>Cost Breakdown</Text>
        </View>

        {/* From Sales section */}
        <View style={styles.summarySection}>
          <Text style={styles.summarySectionLabel}>From Sales ({salesCosts.itemCount} items)</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryRowLeft}>
              <FontAwesome name="credit-card" size={12} color={colors.textSecondary} />
              <Text style={styles.summaryRowLabel}>Platform Fees</Text>
            </View>
            <Text style={styles.summaryRowValue}>{formatExpenseAmount(salesCosts.platformFees)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryRowLeft}>
              <FontAwesome name="truck" size={12} color={colors.textSecondary} />
              <Text style={styles.summaryRowLabel}>Shipping</Text>
            </View>
            <Text style={styles.summaryRowValue}>{formatExpenseAmount(salesCosts.shippingCosts)}</Text>
          </View>
        </View>

        {/* Operating Expenses section */}
        <View style={styles.summarySection}>
          <Text style={styles.summarySectionLabel}>Operating Expenses</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryRowLeft}>
              <FontAwesome name="building-o" size={12} color={colors.textSecondary} />
              <Text style={styles.summaryRowLabel}>Overhead</Text>
            </View>
            <Text style={styles.summaryRowValue}>{formatExpenseAmount(totalOperatingExpenses)}</Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.summaryTotal}>
          <Text style={styles.summaryTotalLabel}>Total Expenses</Text>
          <Text style={styles.summaryTotalValue}>{formatExpenseAmount(totalAllExpenses)}</Text>
        </View>

        {/* Note about already accounted */}
        <View style={styles.summaryNote}>
          <FontAwesome name="info-circle" size={10} color={colors.textSecondary} />
          <Text style={styles.summaryNoteText}>
            Sales costs are already deducted from item profits
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.placeholder}>
      <FontAwesome name="dollar" size={48} color={colors.neutral} />
      <Text style={styles.placeholderTitle}>No expenses yet</Text>
      <Text style={styles.placeholderText}>
        Tap the + button to log your first expense. Track supplies, mileage, fees, and more.
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
    const hasDateFilter = dateRange.preset !== 'all';
    const hasCategoryFilter = activeCategory !== 'all';

    if (hasDateFilter && hasCategoryFilter) {
      return `No "${activeCategory}" expenses in the selected date range`;
    } else if (hasDateFilter) {
      return 'No expenses in the selected date range';
    } else if (hasCategoryFilter) {
      return `No expenses in the "${activeCategory}" category`;
    }
    return 'No expenses match your filters';
  };

  const renderNoResults = () => (
    <View style={styles.noResults}>
      <FontAwesome name="filter" size={32} color={colors.neutral} />
      <Text style={styles.noResultsTitle}>No expenses found</Text>
      <Text style={styles.noResultsText}>{getNoResultsMessage()}</Text>
      <Pressable
        style={styles.clearFilterButton}
        onPress={handleClearFilters}
      >
        <Text style={styles.clearFilterText}>Show all expenses</Text>
      </Pressable>
    </View>
  );

  // Category options for filter
  const categoryOptions: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    ...EXPENSE_CATEGORIES.map(cat => ({ value: cat as CategoryFilter, label: EXPENSE_CATEGORY_LABELS[cat] })),
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.totalAmount}>{formatExpenseAmount(totalAllExpenses)}</Text>
        </View>
        <Text style={styles.subtitle}>
          {expenses.length > 0
            ? `${filteredExpenses.length} expense${filteredExpenses.length === 1 ? '' : 's'}${activeCategory !== 'all' ? ` in ${activeCategory}` : ''}`
            : 'Track your business expenses'}
        </Text>

        {/* Date Range Filter */}
        {expenses.length > 0 && (
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
          />
        )}

        {/* Category Filter */}
        {expenses.length > 0 && (
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
      {isLoading && expenses.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      ) : error && expenses.length === 0 ? (
        renderErrorState()
      ) : expenses.length === 0 ? (
        renderEmptyState()
      ) : filteredExpenses.length === 0 ? (
        renderNoResults()
      ) : (
        <FlatList
          data={filteredExpenses}
          renderItem={renderExpenseCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderSummaryCard}
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
      )}

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom, spacing.lg) }]}
        onPress={handleAddExpense}
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
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  totalAmount: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.loss,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  // Filter
  filterContainer: {
    marginHorizontal: -spacing.lg,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
    fontSize: fontSize.sm,
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
  // Summary Card
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
});
