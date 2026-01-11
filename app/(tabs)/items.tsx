import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { useItemsStore } from '@/src/stores/items-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { ItemCard } from '@/src/features/items';
import { Item, SalesPlatform } from '@/src/types/database';
import {
  formatCurrency,
  formatROI,
  getROIColor,
  calculateItemROIFromValues,
} from '@/src/lib/profit-utils';
import {
  PLATFORM_OPTIONS,
  calculatePlatformFee,
  calculateNetProfit,
} from '@/src/features/sales/schemas/sale-form-schema';

type FilterType = 'all' | 'listed' | 'sold' | 'unlisted';

export default function ItemsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, isLoading, error, fetchItems, markAsSold, deleteItem } = useItemsStore();
  const { pallets, getPalletById } = usePalletsStore();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Quick sell state
  const [quickSellItem, setQuickSellItem] = useState<Item | null>(null);
  const [quickSellPrice, setQuickSellPrice] = useState('');
  const [quickSellPlatform, setQuickSellPlatform] = useState<SalesPlatform | null>(null);
  const [isQuickSelling, setIsQuickSelling] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // Fetch items on focus
  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [])
  );

  const handleAddItem = () => {
    router.push('/items/new');
  };

  const handleItemPress = (item: Item) => {
    // Close any open swipeable first
    swipeableRefs.current.forEach((ref) => ref?.close());
    router.push(`/items/${item.id}`);
  };

  const handleRefresh = () => {
    fetchItems();
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
      Alert.alert('Invalid Price', 'Please enter a valid sale price');
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
        fetchItems();
      } else {
        Alert.alert('Error', result.error || 'Failed to mark item as sold');
      }
    } finally {
      setIsQuickSelling(false);
    }
  };

  // Get item cost for profit calculation
  const getItemCost = useCallback((item: Item) => {
    if (item.allocated_cost !== null) return item.allocated_cost;
    if (item.pallet_id) {
      const pallet = getPalletById(item.pallet_id);
      if (pallet) {
        const palletItems = items.filter(i => i.pallet_id === pallet.id);
        const palletCost = pallet.purchase_cost + (pallet.sales_tax || 0);
        return palletItems.length > 0 ? palletCost / palletItems.length : 0;
      }
    }
    return item.purchase_cost ?? 0;
  }, [items, pallets, getPalletById]);

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
          onPress={() => handleDelete(item)}
        >
          <FontAwesome name="trash" size={20} color={colors.background} />
          <Text style={styles.deleteButtonText}>DELETE</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderItemCard = ({ item }: { item: Item }) => {
    // Get pallet name if item belongs to a pallet
    const pallet = item.pallet_id ? getPalletById(item.pallet_id) : null;

    return (
      <Swipeable
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
        <ItemCard
          item={item}
          onPress={() => handleItemPress(item)}
          showPalletBadge={!!pallet}
          palletName={pallet?.name}
        />
      </Swipeable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.placeholder}>
      <FontAwesome name="cube" size={48} color={colors.neutral} />
      <Text style={styles.placeholderTitle}>No items yet</Text>
      <Text style={styles.placeholderText}>
        Tap the + button to add your first item. Items from pallets and individual finds will appear here.
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

  // Filter and search items
  const filteredItems = useMemo(() => {
    let result = items;

    // Apply status filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'unlisted') {
        result = result.filter(i => i.status !== 'listed' && i.status !== 'sold');
      } else {
        result = result.filter(i => i.status === activeFilter);
      }
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const descriptionMatch = item.description?.toLowerCase().includes(query);
        const barcodeMatch = item.barcode?.toLowerCase().includes(query);
        const notesMatch = item.notes?.toLowerCase().includes(query);
        const locationMatch = item.storage_location?.toLowerCase().includes(query);
        // Also search by pallet name
        const pallet = item.pallet_id ? getPalletById(item.pallet_id) : null;
        const palletMatch = pallet?.name.toLowerCase().includes(query);
        return nameMatch || descriptionMatch || barcodeMatch || notesMatch || locationMatch || palletMatch;
      });
    }

    return result;
  }, [items, activeFilter, searchQuery, getPalletById]);

  // Calculate summary stats
  const soldCount = items.filter(i => i.status === 'sold').length;
  const listedCount = items.filter(i => i.status === 'listed').length;
  const unsoldCount = items.filter(i => i.status !== 'sold').length;

  // Delete handler with confirmation
  const handleDelete = (item: Item) => {
    swipeableRefs.current.get(item.id)?.close();

    Alert.alert(
      'Delete Item',
      `Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteItem(item.id);
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  // Quick sell profit preview (now includes platform fees)
  const quickSellPriceNum = parseFloat(quickSellPrice) || 0;
  const quickSellPlatformFee = quickSellPlatform
    ? calculatePlatformFee(quickSellPriceNum, quickSellPlatform, false)
    : 0;
  const quickSellProfit = quickSellItem ? (() => {
    const cost = getItemCost(quickSellItem);
    return calculateNetProfit(quickSellPriceNum, cost, quickSellPlatformFee, null);
  })() : 0;
  const quickSellROI = quickSellItem ? (() => {
    const cost = getItemCost(quickSellItem);
    // ROI = profit / cost
    return cost > 0 ? (quickSellProfit / cost) * 100 : quickSellProfit > 0 ? 100 : 0;
  })() : 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Items</Text>
          <Text style={styles.swipeHint}>
            {items.length > 0 ? '← Delete | Sell →' : ''}
          </Text>
        </View>
        <Text style={styles.subtitle}>
          {items.length > 0
            ? `${items.length} item${items.length === 1 ? '' : 's'} • ${listedCount} listed • ${soldCount} sold`
            : 'All your inventory items'}
        </Text>

        {/* Search Bar */}
        {items.length > 0 && (
          <View style={styles.searchContainer}>
            <FontAwesome name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, barcode, notes..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <FontAwesome name="times-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        )}

        {/* Filter Chips */}
        {items.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {(['all', 'listed', 'sold', 'unlisted'] as FilterType[]).map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.filterChip,
                  activeFilter === filter && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === filter && styles.filterChipTextActive,
                  ]}
                >
                  {filter === 'all' ? 'All' : filter === 'unlisted' ? 'Unlisted' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  {filter === 'all' && ` (${items.length})`}
                  {filter === 'listed' && ` (${listedCount})`}
                  {filter === 'sold' && ` (${soldCount})`}
                  {filter === 'unlisted' && ` (${items.length - listedCount - soldCount})`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      ) : error && items.length === 0 ? (
        renderErrorState()
      ) : items.length === 0 ? (
        renderEmptyState()
      ) : filteredItems.length === 0 ? (
        <View style={styles.noResults}>
          <FontAwesome name="search" size={32} color={colors.neutral} />
          <Text style={styles.noResultsTitle}>No items found</Text>
          <Text style={styles.noResultsText}>
            {searchQuery ? `No items match "${searchQuery}"` : `No ${activeFilter} items`}
          </Text>
          <Pressable
            style={styles.clearFilterButton}
            onPress={() => {
              setSearchQuery('');
              setActiveFilter('all');
            }}
          >
            <Text style={styles.clearFilterText}>Clear filters</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItemCard}
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
        onPress={handleAddItem}
      >
        <FontAwesome name="plus" size={24} color={colors.background} />
      </Pressable>

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
    </GestureHandlerRootView>
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
  swipeHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  // Filter styles
  filterContainer: {
    marginTop: spacing.sm,
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
  // No results styles
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
  // Swipe styles
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  swipeActionLeft: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  quickSellModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    width: '100%',
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
