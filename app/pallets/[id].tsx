import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { ConfirmationModal, ProgressBar } from '@/src/components/ui';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useExpensesStore, ExpenseWithPallets } from '@/src/stores/expenses-store';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';
import { PalletStatus, Item, SalesPlatform } from '@/src/types/database';
import { formatCondition, getConditionColor, getStatusColor } from '@/src/features/items/schemas/item-form-schema';
import { PALLET_STATUS_OPTIONS } from '@/src/features/pallets/schemas/pallet-form-schema';
import {
  calculatePalletProfit,
  formatCurrency,
  formatProfit,
  formatROI,
  getROIColor,
} from '@/src/lib/profit-utils';
import {
  ExpenseCardCompact,
  formatExpenseAmount,
} from '@/src/features/expenses';
import {
  PLATFORM_OPTIONS,
  calculatePlatformFee,
  calculateNetProfit,
} from '@/src/features/sales/schemas/sale-form-schema';

const STATUS_CONFIG: Record<PalletStatus, { label: string; color: string }> = {
  unprocessed: { label: 'Unprocessed', color: colors.statusUnprocessed },
  processing: { label: 'In Progress', color: colors.statusListed },
  completed: { label: 'Processed', color: colors.statusSold },
};

export default function PalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pallets, getPalletById, deletePallet, updatePallet, isLoading, fetchPallets } = usePalletsStore();
  const { fetchItemsByPallet, markAsSold, deleteItem, fetchThumbnails } = useItemsStore();
  const { fetchExpensesByPallet } = useExpensesStore();
  const { isExpenseTrackingEnabled } = useUserSettingsStore();
  const expenseTrackingEnabled = isExpenseTrackingEnabled();
  const [palletItems, setPalletItems] = useState<Item[]>([]);
  const [palletExpenses, setPalletExpenses] = useState<ExpenseWithPallets[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [quickSellItem, setQuickSellItem] = useState<Item | null>(null);
  const [quickSellPrice, setQuickSellPrice] = useState('');
  const [quickSellPlatform, setQuickSellPlatform] = useState<SalesPlatform | null>(null);
  const [isQuickSelling, setIsQuickSelling] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // Modal states
  const [showDeletePalletModal, setShowDeletePalletModal] = useState(false);
  const [deleteItemModal, setDeleteItemModal] = useState<Item | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Fetch pallets if not loaded
  useEffect(() => {
    if (pallets.length === 0) {
      fetchPallets();
    }
  }, [pallets.length, fetchPallets]);

  // Load data function
  const loadData = useCallback(async () => {
    if (id) {
      setLoadingItems(true);
      // Only fetch expenses if expense tracking is enabled
      if (expenseTrackingEnabled) {
        const [itemsList, expensesList] = await Promise.all([
          fetchItemsByPallet(id),
          fetchExpensesByPallet(id),
        ]);
        setPalletItems(itemsList);
        setPalletExpenses(expensesList);
        // Fetch thumbnails for items
        if (itemsList.length > 0) {
          const thumbs = await fetchThumbnails(itemsList.map(i => i.id));
          setThumbnails(thumbs);
        }
      } else {
        const itemsList = await fetchItemsByPallet(id);
        setPalletItems(itemsList);
        setPalletExpenses([]);
        // Fetch thumbnails for items
        if (itemsList.length > 0) {
          const thumbs = await fetchThumbnails(itemsList.map(i => i.id));
          setThumbnails(thumbs);
        }
      }
      setLoadingItems(false);
    }
  }, [id, fetchItemsByPallet, fetchExpensesByPallet, fetchThumbnails, expenseTrackingEnabled]);

  // Fetch items and expenses on focus (refreshes when coming back from other screens)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pallet = useMemo(() => {
    if (!id) return null;
    return getPalletById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pallets triggers re-fetch
  }, [id, pallets, getPalletById]);

  const handleAddItem = () => {
    router.push({ pathname: '/items/new', params: { palletId: id } });
  };

  const handleExpensePress = (expenseId: string) => {
    router.push(`/expenses/${expenseId}`);
  };

  const handleItemPress = (itemId: string) => {
    // Close any open swipeable first
    swipeableRefs.current.forEach((ref) => ref?.close());
    router.push(`/items/${itemId}`);
  };

  const handleEdit = () => {
    router.push({ pathname: '/pallets/edit', params: { id } });
  };

  const handleDelete = () => {
    setShowDeletePalletModal(true);
  };

  const handleConfirmDeletePallet = async () => {
    if (!id) return;
    setShowDeletePalletModal(false);
    const result = await deletePallet(id);
    if (result.success) {
      router.back();
    } else {
      setErrorModal({ visible: true, title: 'Error', message: result.error || 'Failed to delete pallet.' });
    }
  };

  const handleStatusChange = async (newStatus: PalletStatus) => {
    if (!id) return;
    setShowStatusPicker(false);
    const result = await updatePallet(id, { status: newStatus });
    if (!result.success) {
      setErrorModal({ visible: true, title: 'Error', message: result.error || 'Failed to update status.' });
    }
  };

  // Quick sell handlers
  const handleQuickSell = (item: Item) => {
    // Close the swipeable
    swipeableRefs.current.get(item.id)?.close();

    // Pre-fill with listing price and reset platform
    setQuickSellPrice(item.listing_price?.toString() || '');
    setQuickSellPlatform(null);
    setQuickSellItem(item);
  };

  const handleConfirmQuickSell = async () => {
    if (!quickSellItem) return;

    const price = parseFloat(quickSellPrice);
    if (isNaN(price) || price < 0) {
      setErrorModal({ visible: true, title: 'Invalid Price', message: 'Please enter a valid sale price.' });
      return;
    }

    // Calculate platform fee if platform selected
    const platformFee = quickSellPlatform
      ? calculatePlatformFee(price, quickSellPlatform, false)
      : undefined;

    setIsQuickSelling(true);
    try {
      const result = await markAsSold(quickSellItem.id, {
        sale_price: price,
        platform: quickSellPlatform ?? undefined,
        platform_fee: platformFee,
      });
      if (result.success) {
        setQuickSellItem(null);
        setQuickSellPrice('');
        setQuickSellPlatform(null);
        // Refresh the items list
        loadData();
      } else {
        setErrorModal({ visible: true, title: 'Error', message: result.error || 'Failed to mark item as sold.' });
      }
    } finally {
      setIsQuickSelling(false);
    }
  };

  // Item delete handler with confirmation
  const handleItemDelete = (item: Item) => {
    swipeableRefs.current.get(item.id)?.close();
    setDeleteItemModal(item);
  };

  const handleConfirmDeleteItem = async () => {
    if (!deleteItemModal) return;
    const result = await deleteItem(deleteItemModal.id);
    if (result.success) {
      loadData(); // Refresh the items list
    } else {
      setErrorModal({ visible: true, title: 'Error', message: result.error || 'Failed to delete item.' });
    }
    setDeleteItemModal(null);
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

  // Calculate allocated cost for quick sell preview
  const getItemAllocatedCost = useCallback((item: Item) => {
    if (item.allocated_cost !== null) return item.allocated_cost;
    if (!pallet) return item.purchase_cost ?? 0;
    const palletCost = pallet.purchase_cost + (pallet.sales_tax || 0);
    return palletItems.length > 0 ? palletCost / palletItems.length : 0;
  }, [pallet, palletItems]);

  // Render right swipe action (Sell)
  const renderRightActions = (item: Item, progress: Animated.AnimatedInterpolation<number>) => {
    if (item.status === 'sold') return null;

    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });

    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX }] }]}>
        <Pressable
          style={styles.sellButton}
          onPress={() => handleQuickSell(item)}
        >
          <FontAwesome name="dollar" size={20} color={colors.background} />
          <Text style={styles.sellButtonText}>SELL</Text>
        </Pressable>
      </Animated.View>
    );
  };

  // Render left swipe action (Delete)
  const renderLeftActions = (item: Item, progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 0],
    });

    return (
      <Animated.View style={[styles.swipeActionLeft, { transform: [{ translateX }] }]}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleItemDelete(item)}
        >
          <FontAwesome name="trash" size={20} color={colors.background} />
          <Text style={styles.deleteButtonText}>DELETE</Text>
        </Pressable>
      </Animated.View>
    );
  };

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
              {"This pallet may have been deleted or doesn't exist."}
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
  const profitFormatted = formatProfit(totalProfit);
  const roiColor = getROIColor(roi);

  // Quick sell profit preview (now includes platform fees)
  const quickSellPriceNum = parseFloat(quickSellPrice) || 0;
  const quickSellPlatformFee = quickSellPlatform
    ? calculatePlatformFee(quickSellPriceNum, quickSellPlatform, false)
    : 0;
  const quickSellProfit = quickSellItem ? (() => {
    const cost = getItemAllocatedCost(quickSellItem);
    return calculateNetProfit(quickSellPriceNum, cost, quickSellPlatformFee, null);
  })() : 0;
  const quickSellROI = quickSellItem ? (() => {
    const cost = getItemAllocatedCost(quickSellItem);
    // ROI = profit / cost
    return cost > 0 ? (quickSellProfit / cost) * 100 : quickSellProfit > 0 ? 100 : 0;
  })() : 0;

  return (
    <GestureHandlerRootView style={styles.container}>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items ({palletItems.length})</Text>
              {palletItems.some(i => i.status !== 'sold') && (
                <Text style={styles.swipeHint}>← Delete | Sell →</Text>
              )}
            </View>
            {palletItems.length > 0 && profitMetrics && (
              <View style={styles.itemsProgressContainer}>
                <ProgressBar
                  current={profitMetrics.soldItemsCount}
                  total={palletItems.length}
                  color={colors.profit}
                  height={6}
                  showCount={false}
                />
                <Text style={styles.itemsProgressText}>
                  {Math.round((profitMetrics.soldItemsCount / palletItems.length) * 100)}% Inventory Sold
                </Text>
              </View>
            )}
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
                  <Swipeable
                    key={item.id}
                    ref={(ref) => {
                      if (ref) swipeableRefs.current.set(item.id, ref);
                    }}
                    renderRightActions={(progress) => renderRightActions(item, progress)}
                    renderLeftActions={(progress) => renderLeftActions(item, progress)}
                    rightThreshold={40}
                    leftThreshold={40}
                    overshootRight={false}
                    overshootLeft={false}
                  >
                    <Pressable
                      style={styles.itemCard}
                      onPress={() => handleItemPress(item.id)}
                    >
                      {/* Thumbnail with status badge overlay */}
                      <View style={styles.itemThumbnailContainer}>
                        {thumbnails[item.id] ? (
                          <Image
                            source={{ uri: thumbnails[item.id] }}
                            style={styles.itemThumbnail}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.itemThumbnail, styles.itemThumbnailPlaceholder]}>
                            <Ionicons name="cube-outline" size={28} color={colors.textDisabled} />
                          </View>
                        )}
                        <View style={[
                          styles.itemStatusOverlay,
                          { backgroundColor: getStatusColor(item.status) }
                        ]}>
                          <Text style={styles.itemStatusOverlayText}>
                            {item.status === 'unlisted' ? 'Unlisted' : item.status === 'listed' ? 'Listed' : 'Sold'}
                          </Text>
                        </View>
                      </View>
                      {/* Item content */}
                      <View style={styles.itemContent}>
                        <View style={styles.itemHeader}>
                          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </View>
                        <View style={styles.itemDetails}>
                          <View style={styles.itemConditionRow}>
                            <Text style={styles.itemConditionLabel}>CONDITION</Text>
                            <View style={[styles.itemConditionBadge, { backgroundColor: getConditionColor(item.condition) + '20' }]}>
                              <Text style={[styles.itemConditionText, { color: getConditionColor(item.condition) }]}>
                                {formatCondition(item.condition)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.itemPriceColumn}>
                            <Text style={styles.itemPriceLabel}>PRICE</Text>
                            {item.status === 'sold' && item.sale_price !== null ? (
                              <Text style={[styles.itemPriceValue, { color: colors.profit }]}>
                                {formatCurrency(item.sale_price)}
                              </Text>
                            ) : item.listing_price !== null ? (
                              <Text style={styles.itemPriceValue}>{formatCurrency(item.listing_price)}</Text>
                            ) : (
                              <Text style={[styles.itemPriceValue, { color: colors.textSecondary }]}>-</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </Swipeable>
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
              <Pressable
                style={styles.detailRow}
                onPress={() => setShowStatusPicker(true)}
              >
                <Text style={styles.detailLabel}>Status</Text>
                <View style={styles.statusTouchable}>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                    <Text style={styles.statusText}>{statusConfig.label}</Text>
                  </View>
                  <FontAwesome name="chevron-down" size={12} color={colors.textSecondary} />
                </View>
              </Pressable>
              {pallet.notes && (
                <View style={[styles.detailRow, styles.notesRow]}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.notesValue}>{pallet.notes}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Expenses Section - read-only, only shown when has expenses */}
          {expenseTrackingEnabled && palletExpenses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Expenses ({palletExpenses.length})
                <Text style={styles.expensesTotalInline}>
                  {' '} - {formatExpenseAmount(
                    palletExpenses.reduce((sum, e) => {
                      const palletCount = e.pallet_ids?.length || 1;
                      return sum + (e.amount / palletCount);
                    }, 0)
                  )}
                </Text>
              </Text>
              <View style={styles.expensesList}>
                {palletExpenses.map((expense) => {
                  const palletCount = expense.pallet_ids?.length || 1;
                  const splitAmount = expense.amount / palletCount;
                  return (
                    <ExpenseCardCompact
                      key={expense.id}
                      expense={expense}
                      onPress={() => handleExpensePress(expense.id)}
                      splitAmount={splitAmount}
                      totalPallets={palletCount}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <Pressable
          style={[styles.fab, { bottom: Math.max(insets.bottom, spacing.lg) }]}
          onPress={handleAddItem}
        >
          <FontAwesome name="plus" size={24} color={colors.background} />
        </Pressable>
      </View>

      {/* Status Picker Modal */}
      <Modal
        visible={showStatusPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowStatusPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Status</Text>
            {PALLET_STATUS_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.statusOption,
                  pallet.status === option.value && styles.statusOptionSelected,
                ]}
                onPress={() => handleStatusChange(option.value)}
              >
                <View style={[styles.statusDot, { backgroundColor: STATUS_CONFIG[option.value].color }]} />
                <Text style={[
                  styles.statusOptionText,
                  pallet.status === option.value && styles.statusOptionTextSelected,
                ]}>
                  {STATUS_CONFIG[option.value].label}
                </Text>
                {pallet.status === option.value && (
                  <FontAwesome name="check" size={16} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Quick Sell Modal */}
      <Modal
        visible={quickSellItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickSellItem(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setQuickSellItem(null)}
        >
          <Pressable style={styles.quickSellModal} onPress={(e) => e.stopPropagation()}>
            {quickSellItem && (
              <>
                <View style={styles.quickSellHeader}>
                  <Text style={styles.quickSellTitle} numberOfLines={1}>
                    {quickSellItem.name}
                  </Text>
                  {quickSellItem.listing_price !== null && (
                    <Text style={styles.quickSellListing}>
                      Listed: {formatCurrency(quickSellItem.listing_price)}
                    </Text>
                  )}
                </View>

                <Text style={styles.quickSellLabel}>Sale Price</Text>
                <View style={styles.quickSellInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.quickSellInput}
                    value={quickSellPrice}
                    onChangeText={setQuickSellPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                  />
                </View>

                {/* Platform Quick Select */}
                <Text style={styles.quickSellLabel}>Platform (optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickSellPlatformScroll}
                >
                  {PLATFORM_OPTIONS.slice(0, 6).map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.quickSellPlatformChip,
                        quickSellPlatform === option.value && styles.quickSellPlatformChipSelected,
                      ]}
                      onPress={() => setQuickSellPlatform(
                        quickSellPlatform === option.value ? null : option.value
                      )}
                    >
                      <Text
                        style={[
                          styles.quickSellPlatformText,
                          quickSellPlatform === option.value && styles.quickSellPlatformTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={styles.quickSellPreview}>
                  {quickSellPlatformFee > 0 && (
                    <View style={styles.quickSellPreviewRow}>
                      <Text style={styles.quickSellPreviewLabel}>Platform Fee</Text>
                      <Text style={[styles.quickSellPreviewValue, { color: colors.loss }]}>
                        -{formatCurrency(quickSellPlatformFee)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.quickSellPreviewRow}>
                    <Text style={styles.quickSellPreviewLabel}>Net Profit</Text>
                    <Text style={[
                      styles.quickSellPreviewValue,
                      { color: quickSellProfit >= 0 ? colors.profit : colors.loss }
                    ]}>
                      {quickSellProfit >= 0 ? '+' : ''}{formatCurrency(quickSellProfit)}
                    </Text>
                  </View>
                  <View style={styles.quickSellPreviewRow}>
                    <Text style={styles.quickSellPreviewLabel}>ROI</Text>
                    <Text style={[
                      styles.quickSellPreviewValue,
                      { color: getROIColor(quickSellROI) }
                    ]}>
                      {formatROI(quickSellROI)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.quickSellButton, isQuickSelling && styles.quickSellButtonDisabled]}
                  onPress={handleConfirmQuickSell}
                  disabled={isQuickSelling}
                >
                  <FontAwesome name="check" size={18} color={colors.background} />
                  <Text style={styles.quickSellButtonText}>
                    {isQuickSelling ? 'Saving...' : 'Confirm Sale'}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Pallet Confirmation Modal */}
      <ConfirmationModal
        visible={showDeletePalletModal}
        type="delete"
        title={`Delete ${pallet?.name || 'Pallet'}?`}
        message="This will also delete all items in this pallet."
        infoText="This action is permanent and cannot be undone."
        primaryLabel="Delete Pallet"
        secondaryLabel="Cancel"
        onPrimary={handleConfirmDeletePallet}
        onSecondary={() => setShowDeletePalletModal(false)}
        onClose={() => setShowDeletePalletModal(false)}
      />

      {/* Delete Item Confirmation Modal */}
      <ConfirmationModal
        visible={deleteItemModal !== null}
        type="delete"
        title={`Delete ${deleteItemModal?.name || 'Item'}?`}
        message="This action is permanent and cannot be undone."
        primaryLabel="Delete Item"
        secondaryLabel="Cancel"
        onPrimary={handleConfirmDeleteItem}
        onSecondary={() => setDeleteItemModal(null)}
        onClose={() => setDeleteItemModal(null)}
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
    </GestureHandlerRootView>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  swipeHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
    gap: spacing.md,
  },
  itemsProgressContainer: {
    marginBottom: spacing.md,
  },
  itemsProgressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
  },
  itemThumbnailContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  itemThumbnail: {
    width: '100%',
    height: '100%',
  },
  itemThumbnailPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemStatusOverlay: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  itemStatusOverlayText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemConditionRow: {
    flexDirection: 'column',
  },
  itemConditionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemConditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  itemConditionText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  itemPriceColumn: {
    alignItems: 'flex-end',
  },
  itemPriceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemPriceValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellButton: {
    backgroundColor: colors.profit,
    width: 70,
    height: '100%',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sellButtonText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginTop: 4,
  },
  swipeActionLeft: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: colors.loss,
    width: 70,
    height: '100%',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  deleteButtonText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginTop: 4,
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
  statusTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  statusOptionSelected: {
    backgroundColor: colors.primary + '15',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  statusOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    flex: 1,
  },
  statusOptionTextSelected: {
    fontWeight: '600',
  },
  // Quick Sell Modal
  quickSellModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  quickSellHeader: {
    marginBottom: spacing.lg,
  },
  quickSellTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  quickSellListing: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  quickSellLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  quickSellInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  currencySymbol: {
    fontSize: fontSize.xxl,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  quickSellInput: {
    flex: 1,
    fontSize: fontSize.xxl,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  quickSellPreview: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  quickSellPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  quickSellPreviewLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  quickSellPreviewValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  quickSellButton: {
    backgroundColor: colors.profit,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  quickSellButtonDisabled: {
    opacity: 0.6,
  },
  quickSellButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Expenses Section
  expensesTotalInline: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  expensesList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  // Quick sell platform picker styles
  quickSellPlatformScroll: {
    marginBottom: spacing.md,
  },
  quickSellPlatformChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full || 20,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickSellPlatformChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickSellPlatformText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  quickSellPlatformTextSelected: {
    color: colors.background,
  },
});
