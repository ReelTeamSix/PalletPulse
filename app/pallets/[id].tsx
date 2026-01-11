import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { PalletStatus, Item, Expense } from '@/src/types/database';
import { formatCondition, getConditionColor, getStatusColor } from '@/src/features/items/schemas/item-form-schema';
import {
  calculatePalletProfit,
  formatCurrency,
  formatProfit,
  formatROI,
  getROIColor,
} from '@/src/lib/profit-utils';

const STATUS_CONFIG: Record<PalletStatus, { label: string; color: string }> = {
  unprocessed: { label: 'Unprocessed', color: colors.statusUnprocessed },
  processing: { label: 'Processing', color: colors.statusListed },
  completed: { label: 'Completed', color: colors.statusSold },
};

export default function PalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pallets, getPalletById, deletePallet, isLoading, fetchPallets } = usePalletsStore();
  const { items, fetchItems, fetchItemsByPallet } = useItemsStore();
  const { fetchExpensesByPallet } = useExpensesStore();
  const [palletItems, setPalletItems] = useState<Item[]>([]);
  const [palletExpenses, setPalletExpenses] = useState<Expense[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch pallets if not loaded
  useEffect(() => {
    if (pallets.length === 0) {
      fetchPallets();
    }
  }, []);

  // Fetch items and expenses for this pallet
  useEffect(() => {
    async function loadData() {
      if (id) {
        setLoadingItems(true);
        const [itemsList, expensesList] = await Promise.all([
          fetchItemsByPallet(id),
          fetchExpensesByPallet(id),
        ]);
        setPalletItems(itemsList);
        setPalletExpenses(expensesList);
        setLoadingItems(false);
      }
    }
    loadData();
  }, [id]);

  const pallet = useMemo(() => {
    if (!id) return null;
    return getPalletById(id);
  }, [id, pallets]);

  const handleAddItem = () => {
    router.push({ pathname: '/items/new', params: { palletId: id } });
  };

  const handleItemPress = (itemId: string) => {
    router.push(`/items/${itemId}`);
  };

  const handleEdit = () => {
    router.push({ pathname: '/pallets/edit', params: { id } });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Pallet',
      `Are you sure you want to delete "${pallet?.name}"? This will also delete all items in this pallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            const result = await deletePallet(id);
            if (result.success) {
              router.back();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete pallet');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate profit metrics
  const profitMetrics = useMemo(() => {
    if (!pallet) return null;
    return calculatePalletProfit(pallet, palletItems, palletExpenses);
  }, [pallet, palletItems, palletExpenses]);

  if (isLoading && !pallet) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (!pallet) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={48} color={colors.loss} />
            <Text style={styles.errorTitle}>Pallet Not Found</Text>
            <Text style={styles.errorText}>
              This pallet may have been deleted or doesn't exist.
            </Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  const statusConfig = STATUS_CONFIG[pallet.status];
  const totalCost = profitMetrics?.totalCost ?? 0;
  const totalProfit = profitMetrics?.netProfit ?? 0;
  const roi = profitMetrics?.roi ?? 0;
  const isProfitable = totalProfit >= 0;
  const profitFormatted = formatProfit(totalProfit);
  const roiColor = getROIColor(roi);

  return (
    <>
      <Stack.Screen
        options={{
          title: pallet.name,
          headerBackTitle: 'Pallets',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable style={styles.headerButton} onPress={handleEdit}>
                <FontAwesome name="pencil" size={18} color={colors.primary} />
              </Pressable>
              <Pressable style={styles.headerButton} onPress={handleDelete}>
                <FontAwesome name="trash" size={18} color={colors.loss} />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{pallet.name}</Text>
            {pallet.source_name && (
              <Text style={styles.subtitle}>{pallet.source_name}</Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(totalCost)}</Text>
              <Text style={styles.statLabel}>Cost</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: profitFormatted.isPositive ? colors.profit + '15' : colors.loss + '15' }]}>
              <Text style={[styles.statValue, { color: profitFormatted.color }]}>
                {profitFormatted.value}
              </Text>
              <Text style={styles.statLabel}>Profit</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: roiColor }]}>
                {formatROI(roi)}
              </Text>
              <Text style={styles.statLabel}>ROI</Text>
            </View>
          </View>

          {/* Progress Summary */}
          {profitMetrics && (
            <View style={styles.progressSummary}>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{profitMetrics.soldItemsCount}</Text>
                <Text style={styles.progressLabel}>Sold</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{profitMetrics.unsoldItemsCount}</Text>
                <Text style={styles.progressLabel}>Unsold</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{formatCurrency(profitMetrics.totalRevenue)}</Text>
                <Text style={styles.progressLabel}>Revenue</Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items ({palletItems.length})</Text>
            {loadingItems ? (
              <View style={styles.placeholder}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.placeholderText}>Loading items...</Text>
              </View>
            ) : palletItems.length === 0 ? (
              <View style={styles.placeholder}>
                <FontAwesome name="cube" size={48} color={colors.neutral} />
                <Text style={styles.placeholderText}>
                  No items yet. Add items to this pallet to start tracking.
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {palletItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() => handleItemPress(item.id)}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.itemMeta}>
                        <View style={[styles.itemConditionBadge, { backgroundColor: getConditionColor(item.condition) }]}>
                          <Text style={styles.itemConditionText}>{formatCondition(item.condition)}</Text>
                        </View>
                        <View style={[styles.itemStatusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                          <Text style={styles.itemStatusText}>
                            {item.status === 'unlisted' ? 'Unlisted' : item.status === 'listed' ? 'Listed' : 'Sold'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.itemPriceSection}>
                      {item.listing_price !== null && (
                        <Text style={styles.itemPrice}>{formatCurrency(item.listing_price)}</Text>
                      )}
                      <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Supplier</Text>
                <Text style={styles.detailValue}>
                  {pallet.supplier || 'Not set'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source / Type</Text>
                <Text style={styles.detailValue}>
                  {pallet.source_name || 'Not set'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purchase Cost</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(pallet.purchase_cost)}
                </Text>
              </View>
              {pallet.sales_tax !== null && pallet.sales_tax > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sales Tax</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(pallet.sales_tax)}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purchase Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(pallet.purchase_date)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                  <Text style={styles.statusText}>{statusConfig.label}</Text>
                </View>
              </View>
              {pallet.notes && (
                <View style={[styles.detailRow, styles.notesRow]}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.notesValue}>{pallet.notes}</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <Pressable
          style={[styles.fab, { bottom: Math.max(insets.bottom, spacing.lg) }]}
          onPress={handleAddItem}
        >
          <FontAwesome name="plus" size={24} color={colors.background} />
        </Pressable>
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
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.lg,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressSummary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  placeholder: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  itemConditionBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  itemConditionText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '500',
  },
  itemStatusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  itemStatusText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '500',
  },
  itemPriceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemPrice: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  notesRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  notesValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.background,
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
