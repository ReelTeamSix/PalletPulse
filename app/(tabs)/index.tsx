import { useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';
import { formatCurrency, calculateItemProfit } from '@/src/lib/profit-utils';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pallets, fetchPallets, isLoading: palletsLoading } = usePalletsStore();
  const { items, fetchItems, isLoading: itemsLoading } = useItemsStore();
  const { expenses, fetchExpenses, isLoading: expensesLoading } = useExpensesStore();
  const { isExpenseTrackingEnabled } = useUserSettingsStore();
  const expenseTrackingEnabled = isExpenseTrackingEnabled();

  // Fetch data on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPallets();
      fetchItems();
      // Only fetch expenses if expense tracking is enabled
      if (expenseTrackingEnabled) {
        fetchExpenses();
      }
    }, [expenseTrackingEnabled])
  );

  const isLoading = palletsLoading || itemsLoading || (expenseTrackingEnabled && expensesLoading);

  // Calculate dashboard metrics
  const metrics = useMemo(() => {
    const soldItems = items.filter(item => item.status === 'sold');

    // Calculate total revenue from sold items
    const totalRevenue = soldItems.reduce((sum, item) => {
      return sum + (item.sale_price ?? 0);
    }, 0);

    // Calculate total costs:
    // 1. All pallet costs (purchase_cost + sales_tax)
    const totalPalletCosts = pallets.reduce((sum, pallet) => {
      return sum + pallet.purchase_cost + (pallet.sales_tax || 0);
    }, 0);

    // 2. Individual item costs (items without pallet_id)
    const individualItemsCost = items
      .filter(item => !item.pallet_id && item.purchase_cost)
      .reduce((sum, item) => sum + (item.purchase_cost ?? 0), 0);

    // 3. Expenses - only include if expense tracking is enabled
    const totalExpenses = expenseTrackingEnabled
      ? expenses.reduce((sum, e) => sum + e.amount, 0)
      : 0;

    // Total profit = Revenue - All Costs - All Expenses (if enabled)
    const totalProfit = totalRevenue - totalPalletCosts - individualItemsCost - totalExpenses;

    return {
      totalProfit,
      palletsCount: pallets.length,
      itemsCount: items.length,
      soldCount: soldItems.length,
      isProfitable: totalProfit >= 0,
    };
  }, [pallets, items, expenses, expenseTrackingEnabled]);

  const handleRefresh = useCallback(async () => {
    const promises = [fetchPallets(), fetchItems()];
    if (expenseTrackingEnabled) {
      promises.push(fetchExpenses());
    }
    await Promise.all(promises);
  }, [expenseTrackingEnabled]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md }]}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Your PalletPulse overview</Text>

      <View style={[styles.heroCard, { backgroundColor: metrics.isProfitable ? colors.profit : colors.loss + 'B0' }]}>
        <Text style={styles.heroLabel}>Total Profit</Text>
        <Text style={styles.heroValue}>
          {metrics.isProfitable ? '' : '-'}{formatCurrency(Math.abs(metrics.totalProfit))}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Pressable
          style={styles.statCard}
          onPress={() => router.push('/(tabs)/pallets')}
        >
          <FontAwesome name="archive" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{metrics.palletsCount}</Text>
          <Text style={styles.statLabel}>Pallets</Text>
        </Pressable>
        <Pressable
          style={styles.statCard}
          onPress={() => router.push('/(tabs)/items')}
        >
          <FontAwesome name="cube" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{metrics.itemsCount}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </Pressable>
        <View style={styles.statCard}>
          <FontAwesome name="check-circle" size={24} color={colors.profit} />
          <Text style={styles.statValue}>{metrics.soldCount}</Text>
          <Text style={styles.statLabel}>Sold</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <Pressable
          style={styles.actionCard}
          onPress={() => router.push('/pallets/new')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
            <FontAwesome name="plus" size={20} color={colors.primary} />
          </View>
          <Text style={styles.actionTitle}>Add Pallet</Text>
          <Text style={styles.actionSubtitle}>Start tracking a new pallet</Text>
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push('/items/new')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.profit + '15' }]}>
            <FontAwesome name="cube" size={20} color={colors.profit} />
          </View>
          <Text style={styles.actionTitle}>Add Item</Text>
          <Text style={styles.actionSubtitle}>Log an individual find</Text>
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/pallets')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.warning + '15' }]}>
            <FontAwesome name="list" size={20} color={colors.warning} />
          </View>
          <Text style={styles.actionTitle}>View Pallets</Text>
          <Text style={styles.actionSubtitle}>Manage your inventory</Text>
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/analytics')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.statusListed + '15' }]}>
            <FontAwesome name="bar-chart" size={20} color={colors.statusListed} />
          </View>
          <Text style={styles.actionTitle}>Analytics</Text>
          <Text style={styles.actionSubtitle}>View your performance</Text>
        </Pressable>
      </View>

      {items.length === 0 && pallets.length === 0 ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Get started by adding your first pallet or item!
          </Text>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {metrics.soldCount > 0
              ? `You've sold ${metrics.soldCount} item${metrics.soldCount === 1 ? '' : 's'}. Keep it up!`
              : 'Mark items as sold to see your profit grow!'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.profit,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroLabel: {
    fontSize: fontSize.md,
    color: colors.background,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.background,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  placeholder: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
