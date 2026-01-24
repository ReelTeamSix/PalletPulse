import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';
import { useNotificationsStore } from '@/src/stores/notifications-store';
import { NotificationSheet } from '@/src/components/ui';
import { TrialBanner } from '@/src/components/onboarding';
import { checkStaleInventoryNotification, createTrialEndingNotification } from '@/src/lib/notification-triggers';
import { useOnboardingStore } from '@/src/stores/onboarding-store';
import {
  HeroCard,
  GoalModal,
  RecentActivityFeed,
  InsightsCard,
  Activity,
} from '@/src/features/dashboard/components';
import {
  TimePeriod,
  isWithinTimePeriod,
  isWithinDateRange,
  getPreviousPeriodRange,
  generateInsights,
  getUserStage,
  getEmptyStateContent,
} from '@/src/features/dashboard/utils';

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pallets, fetchPallets, isLoading: palletsLoading } = usePalletsStore();
  const { items, fetchItems, isLoading: itemsLoading } = useItemsStore();
  const { expenses, fetchExpenses, isLoading: expensesLoading } = useExpensesStore();
  const { unreadCount, fetchNotifications } = useNotificationsStore();

  // Time period filter for hero card
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Get profit goals from user settings
  const { profitGoals, setProfitGoal, profitGoalsEnabled, setProfitGoalsEnabled } = useUserSettingsStore();

  // Get the goal for the current time period (no goal for "all" time)
  const currentGoal = timePeriod === 'all' ? null : profitGoals[timePeriod];

  useFocusEffect(
    useCallback(() => {
      fetchPallets();
      fetchItems();
      // Always fetch expenses for accurate profit calculation
      // (even if user doesn't have access to expenses UI)
      fetchExpenses();
      fetchNotifications();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references
  );

  // Get trial status for notification checks
  const { isTrialActive, getTrialDaysRemaining } = useOnboardingStore();

  // Check for stale inventory and trial ending notifications
  useEffect(() => {
    if (items.length > 0 && !itemsLoading) {
      checkStaleInventoryNotification(items, staleThresholdDays);
    }

    // Check for trial ending notification (notify when 3 or fewer days remaining)
    if (isTrialActive()) {
      const daysRemaining = getTrialDaysRemaining();
      if (daysRemaining <= 3 && daysRemaining > 0) {
        createTrialEndingNotification(daysRemaining);
      }
    }
  }, [items, staleThresholdDays, itemsLoading, isTrialActive, getTrialDaysRemaining]);

  const isLoading = palletsLoading || itemsLoading || expensesLoading;

  // Helper to calculate profit for a set of sold items and expenses
  const calculatePeriodProfit = useCallback((
    soldItems: typeof items,
    periodExpensesAmount: number
  ) => {
    const revenue = soldItems.reduce((sum, item) => sum + (item.sale_price ?? 0), 0);
    const cogs = soldItems.reduce((sum, item) => sum + (item.allocated_cost ?? item.purchase_cost ?? 0), 0);
    const fees = soldItems.reduce((sum, item) => sum + (item.platform_fee ?? 0) + (item.shipping_cost ?? 0), 0);
    return revenue - cogs - fees - periodExpensesAmount;
  }, []);

  // Metrics filtered by time period (for hero card)
  const periodMetrics = useMemo(() => {
    // Filter sold items by sale date within the time period
    const soldItemsInPeriod = items.filter(
      item => item.status === 'sold' && isWithinTimePeriod(item.sale_date, timePeriod)
    );

    // Always include expenses for accurate profit calculation
    const periodExpensesAmount = expenses
      .filter(e => isWithinTimePeriod(e.expense_date, timePeriod))
      .reduce((sum, e) => sum + e.amount, 0);

    const periodProfit = calculatePeriodProfit(soldItemsInPeriod, periodExpensesAmount);

    // Calculate ROI for the period
    const totalCost = soldItemsInPeriod.reduce(
      (sum, item) => sum + (item.allocated_cost ?? item.purchase_cost ?? 0),
      0
    ) + periodExpensesAmount;
    const roi = totalCost > 0 ? (periodProfit / totalCost) * 100 : 0;

    // Calculate previous period profit for comparison
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(timePeriod);
    let previousProfit: number | undefined;

    if (prevStart && prevEnd) {
      const soldItemsInPrevPeriod = items.filter(
        item => item.status === 'sold' && isWithinDateRange(item.sale_date, prevStart, prevEnd)
      );

      const prevExpensesAmount = expenses
        .filter(e => isWithinDateRange(e.expense_date, prevStart, prevEnd))
        .reduce((sum, e) => sum + e.amount, 0);

      previousProfit = calculatePeriodProfit(soldItemsInPrevPeriod, prevExpensesAmount);
    }

    return {
      profit: periodProfit,
      soldCount: soldItemsInPeriod.length,
      isProfitable: periodProfit >= 0,
      previousProfit,
      roi,
    };
  }, [items, expenses, timePeriod, calculatePeriodProfit]);

  // Get stale threshold from user settings (needed for metrics calculation)
  const { settings } = useUserSettingsStore();
  const staleThresholdDays = settings?.stale_threshold_days ?? 30;

  // Actionable metrics for metric cards
  const actionableMetrics = useMemo(() => {
    const now = new Date();

    // Pending to list: items with status 'unlisted' (added but not listed for sale)
    const unlistedItems = items.filter(item => item.status === 'unlisted');

    // Stale items: listed items where listing_date is older than threshold
    const staleItems = items.filter(item => {
      if (item.status !== 'listed' || !item.listing_date) return false;
      const listingDate = new Date(item.listing_date);
      const daysSinceListed = Math.floor((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceListed >= staleThresholdDays;
    });

    return {
      pendingToListCount: unlistedItems.length,
      staleItemsCount: staleItems.length,
    };
  }, [items, staleThresholdDays]);

  // Generate smart insights and empty state content
  const { insights, emptyState } = useMemo(() => {
    const insightsInput = { pallets, items, staleThresholdDays };
    const generatedInsights = generateInsights(insightsInput);
    const userStage = getUserStage(insightsInput);
    const emptyStateContent = getEmptyStateContent(userStage);

    return {
      insights: generatedInsights,
      emptyState: emptyStateContent,
    };
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
    await Promise.all([fetchPallets(), fetchItems(), fetchExpenses()]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references

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
    <View style={styles.container}>
      {/* Trial Banner - shows in last 3 days of trial */}
      <View style={{ marginTop: insets.top }}>
        <TrialBanner />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.greeting}>{getGreeting()}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => setShowNotifications(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <HeroCard
        totalProfit={periodMetrics.profit}
        soldCount={periodMetrics.soldCount}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
        previousPeriodProfit={periodMetrics.previousProfit}
        roi={periodMetrics.roi}
        profitGoal={currentGoal}
        goalsEnabled={profitGoalsEnabled}
        pendingToListCount={actionableMetrics.pendingToListCount}
        staleItemsCount={actionableMetrics.staleItemsCount}
        onPendingPress={() => router.push({ pathname: '/(tabs)/inventory', params: { filter: 'unlisted', segment: 'items' } })}
        onStalePress={() => router.push({ pathname: '/(tabs)/inventory', params: { filter: 'stale', segment: 'items' } })}
        onGoalPress={() => setShowGoalModal(true)}
      />

      {/* Strategy Insight Section */}
      <View style={styles.sectionHeader}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
        <Text style={styles.sectionHeaderText}>STRATEGY INSIGHT</Text>
      </View>

      <InsightsCard
        insights={insights}
        emptyState={emptyState}
        onInsightPress={(insight) => {
          // Use navigation data if available
          if (insight.navigation) {
            const { type, id } = insight.navigation;
            if (type === 'item' && id) {
              router.push(`/items/${id}`);
            } else if (type === 'pallet' && id) {
              router.push(`/pallets/${id}`);
            } else {
              router.push('/(tabs)/inventory');
            }
          } else {
            // Fallback for insights without navigation data
            router.push('/(tabs)/inventory');
          }
        }}
      />

      <RecentActivityFeed
        activities={recentActivity}
        onActivityPress={handleActivityPress}
        onViewAll={() => router.push('/(tabs)/inventory')}
      />

        <NotificationSheet
          visible={showNotifications}
          onClose={() => setShowNotifications(false)}
        />

        {/* Goal Modal - only show for week/month/year, not "all" */}
        {timePeriod !== 'all' && (
          <GoalModal
            visible={showGoalModal}
            period={timePeriod}
            currentGoal={currentGoal}
            onSave={(goal) => setProfitGoal(timePeriod, goal)}
            onClose={() => setShowGoalModal(false)}
            onDisable={() => setProfitGoalsEnabled(false)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContainer: {
    flex: 1,
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
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.loss,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
});
