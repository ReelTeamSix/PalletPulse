import { useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { PalletCard } from '@/src/features/pallets';
import { Pallet } from '@/src/types/database';
import { calculatePalletProfit } from '@/src/lib/profit-utils';

export default function PalletsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pallets, isLoading: palletsLoading, error, fetchPallets } = usePalletsStore();
  const { items, fetchItems, isLoading: itemsLoading } = useItemsStore();
  const { expenses, fetchExpenses, isLoading: expensesLoading } = useExpensesStore();

  const isLoading = palletsLoading || itemsLoading || expensesLoading;

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      fetchPallets();
      fetchItems();
      fetchExpenses();
    }, [])
  );

  // Calculate metrics for each pallet
  const palletMetrics = useMemo(() => {
    const metrics: Record<string, { itemCount: number; profit: number }> = {};

    pallets.forEach(pallet => {
      const palletItems = items.filter(item => item.pallet_id === pallet.id);
      const palletExpenses = expenses.filter(expense => expense.pallet_id === pallet.id);
      const profitResult = calculatePalletProfit(pallet, palletItems, palletExpenses);

      metrics[pallet.id] = {
        itemCount: palletItems.length,
        profit: profitResult.netProfit,
      };
    });

    return metrics;
  }, [pallets, items, expenses]);

  const handleAddPallet = () => {
    router.push('/pallets/new');
  };

  const handlePalletPress = (pallet: Pallet) => {
    router.push(`/pallets/${pallet.id}`);
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchPallets(),
      fetchItems(),
      fetchExpenses(),
    ]);
  }, []);

  const renderPalletCard = ({ item }: { item: Pallet }) => {
    const metrics = palletMetrics[item.id] || { itemCount: 0, profit: 0 };

    return (
      <PalletCard
        pallet={item}
        itemCount={metrics.itemCount}
        totalProfit={metrics.profit}
        onPress={() => handlePalletPress(item)}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.placeholder}>
      <FontAwesome name="archive" size={48} color={colors.neutral} />
      <Text style={styles.placeholderTitle}>No pallets yet</Text>
      <Text style={styles.placeholderText}>
        Tap the + button to add your first pallet and start tracking your inventory.
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

  // Calculate totals for subtitle
  const totalItems = items.filter(i => pallets.some(p => p.id === i.pallet_id)).length;
  const totalProfit = Object.values(palletMetrics).reduce((sum, m) => sum + m.profit, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Pallets</Text>
        <Text style={styles.subtitle}>
          {pallets.length > 0
            ? `${pallets.length} pallet${pallets.length === 1 ? '' : 's'} • ${totalItems} items`
            : 'Manage your pallet inventory'}
        </Text>
      </View>

      {isLoading && pallets.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading pallets...</Text>
        </View>
      ) : error && pallets.length === 0 ? (
        renderErrorState()
      ) : pallets.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={pallets}
          renderItem={renderPalletCard}
          keyExtractor={(item) => item.id}
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

      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom, spacing.lg) }]}
        onPress={handleAddPallet}
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
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
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
});
