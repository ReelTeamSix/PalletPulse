import { useMemo, useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';
import { formatCurrency } from '@/src/lib/profit-utils';
import {
  HeroCard,
  MetricCard,
  MetricGrid,
  ActionButtonPair,
  RecentActivityFeed,
  InsightsCard,
  Activity,
} from '@/src/features/dashboard/components';
import {
  TimePeriod,
  isWithinTimePeriod,
  generateInsights,
} from '@/src/features/dashboard/utils';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pallets, fetchPallets, isLoading: palletsLoading } = usePalletsStore();
  const { items, fetchItems, isLoading: itemsLoading } = useItemsStore();
  const { expenses, fetchExpenses, isLoading: expensesLoading } = useExpensesStore();
  const { isExpenseTrackingEnabled } = useUserSettingsStore();
  const expenseTrackingEnabled = isExpenseTrackingEnabled();

  // Time period filter for hero card
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');

  useFocusEffect(
    useCallback(() => {
      fetchPallets();
      fetchItems();
      if (expenseTrackingEnabled) {
        fetchExpenses();
      }
    }, [expenseTrackingEnabled]) // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references
  );

  const isLoading = palletsLoading || itemsLoading || (expenseTrackingEnabled && expensesLoading);

  // Metrics filtered by time period (for hero card)
  const periodMetrics = useMemo(() => {
    // Filter sold items by sale date within the time period
    const soldItemsInPeriod = items.filter(
      item => item.status === 'sold' && isWithinTimePeriod(item.sale_date, timePeriod)
    );

    // Revenue from items sold in this period
    const periodRevenue = soldItemsInPeriod.reduce((sum, item) => {
      return sum + (item.sale_price ?? 0);
    }, 0);

    // For period profit, we calculate cost of goods sold for items sold in this period
    const periodCOGS = soldItemsInPeriod.reduce((sum, item) => {
      return sum + (item.allocated_cost ?? item.purchase_cost ?? 0);
    }, 0);

    // Platform fees and shipping for items sold in this period
    const periodFees = soldItemsInPeriod.reduce((sum, item) => {
      return sum + (item.platform_fee ?? 0) + (item.shipping_cost ?? 0);
    }, 0);

    // Expenses in this period (if expense tracking enabled)
    const periodExpenses = expenseTrackingEnabled
      ? expenses
          .filter(e => isWithinTimePeriod(e.expense_date, timePeriod))
          .reduce((sum, e) => sum + e.amount, 0)
      : 0;

    const periodProfit = periodRevenue - periodCOGS - periodFees - periodExpenses;

    return {
      profit: periodProfit,
      soldCount: soldItemsInPeriod.length,
      isProfitable: periodProfit >= 0,
    };
  }, [items, expenses, expenseTrackingEnabled, timePeriod]);

  // All-time metrics (for metric cards - not filtered by period)
  const allTimeMetrics = useMemo(() => {
    const listedItems = items.filter(item => item.status === 'listed');
    const soldItems = items.filter(item => item.status === 'sold');

    // Calculate active inventory value (listed items at listing price)
    const activeValue = listedItems.reduce((sum, item) => {
      return sum + (item.listing_price ?? item.purchase_cost ?? 0);
    }, 0);

    return {
      soldCount: soldItems.length,
      activeValue,
    };
  }, [items]);

  // Get stale threshold from user settings
  const { settings } = useUserSettingsStore();
  const staleThresholdDays = settings?.stale_threshold_days ?? 30;

  // Generate smart insights
  const insights = useMemo(() => {
    return generateInsights({
      pallets,
      items,
      staleThresholdDays,
    });
  }, [pallets, items, staleThresholdDays]);

  // Build recent activity from sales, listings, and new pallets
  const recentActivity: Activity[] = useMemo(() => {
    const activities: Activity[] = [];

    // Add sold items
    items
      .filter(item => item.status === 'sold' && item.sale_date)
      .slice(0, 5)
      .forEach(item => {
        const profit = (item.sale_price ?? 0) - (item.allocated_cost ?? item.purchase_cost ?? 0);
        activities.push({
          id: `sale-${item.id}`,
          type: 'sale',
          title: item.name,
          subtitle: item.sales_channel ? `Sold on ${item.sales_channel}` : 'Sold',
          value: profit,
          timestamp: new Date(item.sale_date!),
        });
      });

    // Add recently listed items
    items
      .filter(item => item.status === 'listed' && item.listing_date)
      .slice(0, 3)
      .forEach(item => {
        activities.push({
          id: `listed-${item.id}`,
          type: 'listed',
          title: item.name,
          subtitle: 'Listed for sale',
          timestamp: new Date(item.listing_date!),
        });
      });

    // Add recent pallets
    pallets
      .slice(0, 2)
      .forEach(pallet => {
        activities.push({
          id: `pallet-${pallet.id}`,
          type: 'pallet',
          title: pallet.name,
          subtitle: pallet.supplier || 'New pallet',
          timestamp: new Date(pallet.created_at),
        });
      });

    // Sort by timestamp and take top 5
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  }, [items, pallets]);

  const handleRefresh = useCallback(async () => {
    const promises = [fetchPallets(), fetchItems()];
    if (expenseTrackingEnabled) {
      promises.push(fetchExpenses());
    }
    await Promise.all(promises);
  }, [expenseTrackingEnabled]); // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references

  const handleActivityPress = (activity: Activity) => {
    if (activity.type === 'sale' || activity.type === 'listed') {
      const itemId = activity.id.replace('sale-', '').replace('listed-', '');
      router.push(`/items/${itemId}`);
    } else if (activity.type === 'pallet') {
      const palletId = activity.id.replace('pallet-', '');
      router.push(`/pallets/${palletId}`);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md }]}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
        </View>
      </View>

      <HeroCard
        totalProfit={periodMetrics.profit}
        soldCount={periodMetrics.soldCount}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
      />

      <MetricGrid>
        <MetricCard
          icon="checkmark-done"
          value={allTimeMetrics.soldCount}
          label="Items Sold"
          color={colors.profit}
          onPress={() => router.push('/(tabs)/inventory')}
        />
        <MetricCard
          icon="wallet-outline"
          value={formatCurrency(allTimeMetrics.activeValue)}
          label="Active Value"
          color={colors.primary}
          onPress={() => router.push('/(tabs)/inventory')}
        />
      </MetricGrid>

      <InsightsCard insights={insights} />

      <ActionButtonPair
        primaryLabel="Add Pallet"
        primaryIcon="add"
        primaryOnPress={() => router.push('/pallets/new')}
        secondaryLabel="Process Items"
        secondaryIcon="scan-outline"
        secondaryOnPress={() => router.push('/(tabs)/inventory')}
      />

      <RecentActivityFeed
        activities={recentActivity}
        onActivityPress={handleActivityPress}
        onViewAll={() => router.push('/(tabs)/inventory')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
