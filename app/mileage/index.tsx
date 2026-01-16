import { useMemo, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { useMileageStore, MileageTripWithPallets } from '@/src/stores/mileage-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { MileageTripCard, formatDeduction, formatMiles } from '@/src/features/mileage';
import {
  DateRangeFilter,
  DateRange,
  isWithinDateRange,
} from '@/src/components/ui/DateRangeFilter';
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { UpgradePrompt } from '@/src/components/subscription';

export default function MileageLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Check subscription tier for mileage tracking access
  const { canPerform } = useSubscriptionStore();
  const canAccessMileage = canPerform('mileageTracking', 0);

  const {
    trips,
    isLoading,
    fetchTrips,
    fetchCurrentMileageRate,
    currentMileageRate,
  } = useMileageStore();
  const { pallets, fetchPallets, getPalletById } = usePalletsStore();

  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: 'this_year',
  });

  // Fetch data on mount and focus
  useFocusEffect(
    useCallback(() => {
      fetchTrips();
      fetchPallets();
      fetchCurrentMileageRate();
    }, [fetchTrips, fetchPallets, fetchCurrentMileageRate])
  );

  // Filter trips by date range
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => isWithinDateRange(trip.trip_date, dateRange));
  }, [trips, dateRange]);

  // Calculate summary based on filtered trips
  const filteredSummary = useMemo(() => {
    const totalMiles = filteredTrips.reduce((sum, trip) => sum + trip.miles, 0);
    const totalDeduction = filteredTrips.reduce(
      (sum, trip) => sum + trip.miles * trip.mileage_rate,
      0
    );
    return { totalMiles, totalDeduction };
  }, [filteredTrips]);

  // Use filtered summary for display (matches selected date range)
  const displaySummary = filteredSummary;

  // Get pallet names for display
  const getPalletNames = useCallback(
    (palletIds: string[]) => {
      return palletIds
        .map((id) => getPalletById(id)?.name)
        .filter((name): name is string => !!name);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pallets triggers re-fetch
    [pallets, getPalletById]
  );

  const handleAddTrip = () => {
    router.push('/mileage/new');
  };

  const handleTripPress = (trip: MileageTripWithPallets) => {
    router.push(`/mileage/${trip.id}`);
  };

  const handleClearFilters = () => {
    setDateRange({ start: null, end: null, preset: 'this_year' });
  };

  // True empty state - no trips at all
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome name="road" size={64} color={colors.border} />
      <Text style={styles.emptyTitle}>No Mileage Trips</Text>
      <Text style={styles.emptySubtitle}>
        Track your business miles for tax deductions
      </Text>
      <Pressable style={styles.emptyButton} onPress={handleAddTrip}>
        <FontAwesome name="plus" size={16} color={colors.background} />
        <Text style={styles.emptyButtonText}>Log Your First Trip</Text>
      </Pressable>
    </View>
  );

  // Filtered empty state - trips exist but none match filter
  const renderNoResults = () => (
    <View style={styles.emptyState}>
      <FontAwesome name="filter" size={48} color={colors.border} />
      <Text style={styles.emptyTitle}>No trips found</Text>
      <Text style={styles.emptySubtitle}>
        No mileage trips in the selected date range
      </Text>
      <Pressable style={styles.emptyButton} onPress={handleClearFilters}>
        <Text style={styles.emptyButtonText}>Show all trips</Text>
      </Pressable>
    </View>
  );

  // Determine which empty component to show
  const getEmptyComponent = () => {
    // If there are trips but none match the filter, show no results
    if (trips.length > 0 && filteredTrips.length === 0) {
      return renderNoResults();
    }
    // Otherwise show true empty state
    return renderEmptyState();
  };

  // Get dynamic title based on date range
  const getSummaryTitle = () => {
    if (dateRange.preset === 'this_month') {
      return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (dateRange.preset === 'this_year') {
      return `${new Date().getFullYear()} Full Year`;
    }
    if (dateRange.preset === 'last_year') {
      return `${new Date().getFullYear() - 1} Full Year`;
    }
    return 'Custom Period';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Date Range Filter */}
      <DateRangeFilter
        value={dateRange}
        onChange={setDateRange}
      />

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>{getSummaryTitle()}</Text>
          <View style={styles.rateTag}>
            <Text style={styles.rateTagText}>
              ${currentMileageRate.toFixed(3)}/mi
            </Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredTrips.length}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatMiles(displaySummary.totalMiles)}</Text>
            <Text style={styles.statLabel}>Miles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.deductionValue]}>
              {formatDeduction(displaySummary.totalDeduction)}
            </Text>
            <Text style={styles.statLabel}>Deduction</Text>
          </View>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <FontAwesome name="info-circle" size={14} color={colors.warning} />
        <Text style={styles.disclaimerText}>
          Consult a tax professional. Pallet Pro is not tax advice.
        </Text>
      </View>
    </View>
  );

  const renderTrip = ({ item }: { item: MileageTripWithPallets }) => (
    <MileageTripCard
      trip={item}
      onPress={() => handleTripPress(item)}
      palletNames={getPalletNames(item.pallet_ids)}
    />
  );

  // Show upgrade prompt for free tier users
  if (!canAccessMileage) {
    return (
      <>
        <Stack.Screen options={{ title: 'Mileage Log' }} />
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          <View style={styles.upgradeContainer}>
            <UpgradePrompt
              limitType="mileageTracking"
              currentCount={0}
              requiredTier="starter"
              variant="card"
            />
            <View style={styles.featurePreview}>
              <Text style={styles.featurePreviewTitle}>What you get with Starter:</Text>
              <View style={styles.featureItem}>
                <FontAwesome name="check-circle" size={20} color={colors.profit} />
                <Text style={styles.featureText}>Log unlimited mileage trips</Text>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome name="check-circle" size={20} color={colors.profit} />
                <Text style={styles.featureText}>Automatic IRS rate calculations</Text>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome name="check-circle" size={20} color={colors.profit} />
                <Text style={styles.featureText}>Link trips to pallets</Text>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome name="check-circle" size={20} color={colors.profit} />
                <Text style={styles.featureText}>Year-end tax deduction totals</Text>
              </View>
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Mileage Log',
          headerRight: () => (
            <Pressable onPress={handleAddTrip} style={styles.headerButton}>
              <FontAwesome name="plus" size={20} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {isLoading && trips.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredTrips}
            keyExtractor={(item) => item.id}
            renderItem={renderTrip}
            ListHeaderComponent={trips.length > 0 ? renderHeader : null}
            ListEmptyComponent={getEmptyComponent}
            contentContainerStyle={[
              styles.listContent,
              filteredTrips.length === 0 && styles.emptyContent,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={fetchTrips}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB for adding trips */}
        {trips.length > 0 && (
          <Pressable style={styles.fab} onPress={handleAddTrip}>
            <FontAwesome name="plus" size={24} color={colors.background} />
          </Pressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerButton: {
    padding: spacing.sm,
  },
  header: {
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
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
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deductionValue: {
    color: colors.profit,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  disclaimerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emptyButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  upgradeContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  featurePreview: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  featurePreviewTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
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
  },
});
