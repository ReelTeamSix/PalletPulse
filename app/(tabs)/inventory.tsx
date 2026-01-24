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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { fontFamily } from '@/src/constants/fonts';
import { ConfirmationModal } from '@/src/components/ui';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { useItemsStore } from '@/src/stores/items-store';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { PalletCard } from '@/src/features/pallets';
import { ItemCard } from '@/src/features/items';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';
import { Pallet, Item, SalesPlatform } from '@/src/types/database';
import {
  formatCurrency,
  formatROI,
  getROIColor,
  calculatePalletProfit,
} from '@/src/lib/profit-utils';
import {
  PLATFORM_OPTIONS,
  calculatePlatformFee,
  calculateNetProfit,
} from '@/src/features/sales/schemas/sale-form-schema';

type SegmentType = 'pallets' | 'items';
type FilterType = 'all' | 'listed' | 'sold' | 'unlisted' | 'stale';

const SEGMENT_STORAGE_KEY = 'inventory_active_segment';

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: string; segment?: string }>();

  // Stores
  const { pallets, isLoading: palletsLoading, error: palletsError, fetchPallets, markAsCompleted, dismissCompletionPrompt } = usePalletsStore();
  const { settings } = useUserSettingsStore();
  const staleThresholdDays = settings?.stale_threshold_days ?? 30;
  const { items, isLoading: itemsLoading, error: itemsError, fetchItems, markAsSold, deleteItem, fetchThumbnails } = useItemsStore();
  const { expenses, fetchExpenses, isLoading: expensesLoading } = useExpensesStore();
  const { getPalletById } = usePalletsStore();

  const isLoading = palletsLoading || itemsLoading || expensesLoading;
  const error = palletsError || itemsError;

  // Segment state
  const [activeSegment, setActiveSegment] = useState<SegmentType>('pallets');
  const [segmentLoaded, setSegmentLoaded] = useState(false);

  // Items-specific state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Quick sell state
  const [quickSellItem, setQuickSellItem] = useState<Item | null>(null);
  const [quickSellPrice, setQuickSellPrice] = useState('');
  const [quickSellPlatform, setQuickSellPlatform] = useState<SalesPlatform | null>(null);
  const [isQuickSelling, setIsQuickSelling] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // Delete confirmation modal state
  const [deleteModalItem, setDeleteModalItem] = useState<Item | null>(null);

  // Error modal state
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Completion prompt modal state
  const [completionPromptPallet, setCompletionPromptPallet] = useState<Pallet | null>(null);

  // Thumbnail state for item images
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Load saved segment from AsyncStorage
  useEffect(() => {
    const loadSegment = async () => {
      try {
        const saved = await AsyncStorage.getItem(SEGMENT_STORAGE_KEY);
        if (saved === 'pallets' || saved === 'items') {
          setActiveSegment(saved);
        }
      } catch {
        // Ignore errors, use default
      }
      setSegmentLoaded(true);
    };
    loadSegment();
  }, []);

  // Handle URL params for filter and segment (from dashboard navigation)
  useEffect(() => {
    if (params.filter) {
      const validFilters: FilterType[] = ['all', 'listed', 'sold', 'unlisted', 'stale'];
      if (validFilters.includes(params.filter as FilterType)) {
        setActiveFilter(params.filter as FilterType);
      }
    }
    if (params.segment === 'items' || params.segment === 'pallets') {
      setActiveSegment(params.segment);
    }
  }, [params.filter, params.segment]);

  // Save segment when it changes
  const handleSegmentChange = async (segment: SegmentType) => {
    setActiveSegment(segment);
    try {
      await AsyncStorage.setItem(SEGMENT_STORAGE_KEY, segment);
    } catch {
      // Ignore errors
    }
  };

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      fetchPallets();
      fetchItems();
      fetchExpenses();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references
  );

  // Fetch thumbnails when items change
  useEffect(() => {
    const loadThumbnails = async () => {
      if (items.length > 0) {
        const itemIds = items.map(item => item.id);
        const thumbs = await fetchThumbnails(itemIds);
        setThumbnails(thumbs);
      }
    };
    loadThumbnails();
  }, [items, fetchThumbnails]);

  // Calculate pallet metrics
  const palletMetrics = useMemo(() => {
    const metrics: Record<string, { itemCount: number; listedCount: number; profit: number }> = {};
    pallets.forEach(pallet => {
      const palletItems = items.filter(item => item.pallet_id === pallet.id);
      const palletExpenses = expenses.filter(expense => expense.pallet_id === pallet.id);
      const profitResult = calculatePalletProfit(pallet, palletItems, palletExpenses);
      // Count items that are listed or sold (not unlisted/unprocessed)
      const listedItems = palletItems.filter(item => item.status === 'listed' || item.status === 'sold');
      metrics[pallet.id] = {
        itemCount: palletItems.length,
        listedCount: listedItems.length,
        profit: profitResult.netProfit,
      };
    });
    return metrics;
  }, [pallets, items, expenses]);

  // Filter pallets - hide completed pallets from the list
  const activePallets = useMemo(() => {
    return pallets.filter(pallet => pallet.status !== 'completed');
  }, [pallets]);

  // Find pallets ready to be completed (all items listed/sold, not dismissed)
  const palletsReadyToComplete = useMemo(() => {
    return activePallets.filter(pallet => {
      if (pallet.status !== 'processing') return false;
      if (pallet.completion_prompt_dismissed) return false;
      const metrics = palletMetrics[pallet.id];
      if (!metrics || metrics.itemCount === 0) return false;
      return metrics.listedCount === metrics.itemCount; // All items are listed or sold
    });
  }, [activePallets, palletMetrics]);

  // Filter and search items
  const filteredItems = useMemo(() => {
    let result = items;
    if (activeFilter !== 'all') {
      if (activeFilter === 'unlisted') {
        result = result.filter(i => i.status !== 'listed' && i.status !== 'sold');
      } else if (activeFilter === 'stale') {
        // Stale = listed items where listing_date is older than threshold
        const now = new Date();
        result = result.filter(i => {
          if (i.status !== 'listed' || !i.listing_date) return false;
          const listingDate = new Date(i.listing_date);
          const daysSinceListed = Math.floor((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceListed >= staleThresholdDays;
        });
      } else {
        result = result.filter(i => i.status === activeFilter);
      }
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const descriptionMatch = item.description?.toLowerCase().includes(query);
        const barcodeMatch = item.barcode?.toLowerCase().includes(query);
        const notesMatch = item.notes?.toLowerCase().includes(query);
        const locationMatch = item.storage_location?.toLowerCase().includes(query);
        const pallet = item.pallet_id ? getPalletById(item.pallet_id) : null;
        const palletMatch = pallet?.name.toLowerCase().includes(query);
        return nameMatch || descriptionMatch || barcodeMatch || notesMatch || locationMatch || palletMatch;
      });
    }
    return result;
  }, [items, activeFilter, searchQuery, getPalletById, staleThresholdDays]);

  // Navigation handlers
  const handleAddPallet = () => router.push('/pallets/new');
  const handleAddItem = () => router.push('/items/new');
  const handlePalletPress = (pallet: Pallet) => router.push(`/pallets/${pallet.id}`);
  const handleItemPress = (item: Item) => {
    swipeableRefs.current.forEach((ref) => ref?.close());
    router.push(`/items/${item.id}`);
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchPallets(), fetchItems(), fetchExpenses()]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references

  // Quick sell handlers
  const handleQuickSell = (item: Item) => {
    swipeableRefs.current.get(item.id)?.close();
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
        fetchItems();
      } else {
        setErrorModal({ visible: true, title: 'Error', message: result.error || 'Failed to mark item as sold.' });
      }
    } finally {
      setIsQuickSelling(false);
    }
  };

  // Delete handler - opens confirmation modal
  const handleDelete = (item: Item) => {
    swipeableRefs.current.get(item.id)?.close();
    setDeleteModalItem(item);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (!deleteModalItem) return;
    const result = await deleteItem(deleteModalItem.id);
    if (!result.success) {
      setErrorModal({ visible: true, title: 'Error', message: result.error || 'Failed to delete item.' });
    }
    setDeleteModalItem(null);
  };

  // Completion prompt handlers
  const handleMarkPalletComplete = async () => {
    if (!completionPromptPallet) return;
    const result = await markAsCompleted(completionPromptPallet.id);
    if (!result.success) {
      setErrorModal({ visible: true, title: 'Error', message: result.error || 'Failed to mark pallet as completed.' });
    }
    setCompletionPromptPallet(null);
  };

  const handleDismissCompletionPrompt = async () => {
    if (!completionPromptPallet) return;
    await dismissCompletionPrompt(completionPromptPallet.id);
    setCompletionPromptPallet(null);
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
  }, [items, getPalletById]);

  // Render swipe actions for items
  const renderRightActions = (item: Item, progress: Animated.AnimatedInterpolation<number>) => {
    if (item.status === 'sold') return null;
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });
    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX }] }]}>
        <Pressable style={styles.sellButton} onPress={() => handleQuickSell(item)}>
          <Ionicons name="cash-outline" size={22} color={colors.background} />
          <Text style={styles.sellButtonText}>SELL</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderLeftActions = (item: Item, progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 0],
    });
    return (
      <Animated.View style={[styles.swipeActionLeft, { transform: [{ translateX }] }]}>
        <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={22} color={colors.background} />
          <Text style={styles.deleteButtonText}>DELETE</Text>
        </Pressable>
      </Animated.View>
    );
  };

  // Render functions
  const renderPalletCard = ({ item }: { item: Pallet }) => {
    const metrics = palletMetrics[item.id] || { itemCount: 0, listedCount: 0, profit: 0 };
    return (
      <PalletCard
        pallet={item}
        itemCount={metrics.itemCount}
        processedCount={metrics.listedCount}
        totalProfit={metrics.profit}
        onPress={() => handlePalletPress(item)}
      />
    );
  };

  const renderItemCard = ({ item }: { item: Item }) => {
    const pallet = item.pallet_id ? getPalletById(item.pallet_id) : null;
    const thumbnailUri = thumbnails[item.id];
    return (
      <Swipeable
        ref={(ref) => { if (ref) swipeableRefs.current.set(item.id, ref); }}
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
          thumbnailUri={thumbnailUri}
        />
      </Swipeable>
    );
  };

  // Render completion prompt banner
  const renderCompletionPromptBanner = () => {
    if (palletsReadyToComplete.length === 0) return null;
    const firstPallet = palletsReadyToComplete[0];
    const metrics = palletMetrics[firstPallet.id];
    return (
      <Pressable
        style={styles.completionBanner}
        onPress={() => setCompletionPromptPallet(firstPallet)}
      >
        <View style={styles.completionBannerIcon}>
          <Ionicons name="checkmark-circle" size={24} color={colors.profit} />
        </View>
        <View style={styles.completionBannerContent}>
          <Text style={styles.completionBannerTitle}>
            {firstPallet.name} is ready!
          </Text>
          <Text style={styles.completionBannerText}>
            All {metrics?.itemCount} items have been listed. Mark as completed?
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
    );
  };

  const renderEmptyPallets = () => (
    <View style={styles.placeholder}>
      <Ionicons name="cube-outline" size={48} color={colors.neutral} />
      <Text style={styles.placeholderTitle}>No pallets yet</Text>
      <Text style={styles.placeholderText}>
        Tap the + button to add your first pallet and start tracking your inventory.
      </Text>
    </View>
  );

  const renderEmptyItems = () => (
    <View style={styles.placeholder}>
      <Ionicons name="pricetag-outline" size={48} color={colors.neutral} />
      <Text style={styles.placeholderTitle}>No items yet</Text>
      <Text style={styles.placeholderText}>
        Tap the + button to add your first item. Items from pallets and individual finds will appear here.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.placeholder}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.loss} />
      <Text style={styles.placeholderTitle}>Something went wrong</Text>
      <Text style={styles.placeholderText}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </Pressable>
    </View>
  );

  // Calculate stats
  const totalPalletItems = items.filter(i => pallets.some(p => p.id === i.pallet_id)).length;
  const soldCount = items.filter(i => i.status === 'sold').length;
  const listedCount = items.filter(i => i.status === 'listed').length;
  const staleCount = useMemo(() => {
    const now = new Date();
    return items.filter(i => {
      if (i.status !== 'listed' || !i.listing_date) return false;
      const listingDate = new Date(i.listing_date);
      const daysSinceListed = Math.floor((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceListed >= staleThresholdDays;
    }).length;
  }, [items, staleThresholdDays]);

  // Quick sell profit preview
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
    return cost > 0 ? (quickSellProfit / cost) * 100 : quickSellProfit > 0 ? 100 : 0;
  })() : 0;

  // Don't render until segment is loaded from storage
  if (!segmentLoaded) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Inventory</Text>
          {activeSegment === 'items' && items.length > 0 && (
            <Text style={styles.swipeHint}>{'<- Delete | Sell ->'}</Text>
          )}
        </View>
        <Text style={styles.subtitle}>
          {activeSegment === 'pallets'
            ? activePallets.length > 0
              ? `${activePallets.length} pallet${activePallets.length === 1 ? '' : 's'} - ${totalPalletItems} items`
              : 'Manage your pallet inventory'
            : items.length > 0
              ? `${items.length} item${items.length === 1 ? '' : 's'} - ${listedCount} listed - ${soldCount} sold`
              : 'All your inventory items'}
        </Text>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <Pressable
            style={[
              styles.segmentButton,
              activeSegment === 'pallets' && styles.segmentButtonActive,
            ]}
            onPress={() => handleSegmentChange('pallets')}
          >
            <Ionicons
              name="cube-outline"
              size={18}
              color={activeSegment === 'pallets' ? colors.background : colors.textPrimary}
              style={styles.segmentIcon}
            />
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'pallets' && styles.segmentTextActive,
              ]}
            >
              Pallets ({activePallets.length})
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.segmentButton,
              activeSegment === 'items' && styles.segmentButtonActive,
            ]}
            onPress={() => handleSegmentChange('items')}
          >
            <Ionicons
              name="pricetag-outline"
              size={18}
              color={activeSegment === 'items' ? colors.background : colors.textPrimary}
              style={styles.segmentIcon}
            />
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'items' && styles.segmentTextActive,
              ]}
            >
              Items ({items.length})
            </Text>
          </Pressable>
        </View>

        {/* Search and Filter (Items only) */}
        {activeSegment === 'items' && items.length > 0 && (
          <>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
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
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
              contentContainerStyle={styles.filterContent}
            >
              {(['all', 'listed', 'sold', 'unlisted', 'stale'] as FilterType[]).map((filter) => (
                <Pressable
                  key={filter}
                  style={[
                    styles.filterChip,
                    activeFilter === filter && styles.filterChipActive,
                    filter === 'stale' && staleCount > 0 && activeFilter !== filter && styles.filterChipWarning,
                  ]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      activeFilter === filter && styles.filterChipTextActive,
                      filter === 'stale' && staleCount > 0 && activeFilter !== filter && styles.filterChipTextWarning,
                    ]}
                  >
                    {filter === 'all' ? 'All' : filter === 'unlisted' ? 'Unlisted' : filter === 'stale' ? 'Stale' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    {filter === 'all' && ` (${items.length})`}
                    {filter === 'listed' && ` (${listedCount})`}
                    {filter === 'sold' && ` (${soldCount})`}
                    {filter === 'unlisted' && ` (${items.length - listedCount - soldCount})`}
                    {filter === 'stale' && ` (${staleCount})`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {/* Content */}
      {isLoading && (activeSegment === 'pallets' ? activePallets.length === 0 : items.length === 0) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            Loading {activeSegment === 'pallets' ? 'pallets' : 'items'}...
          </Text>
        </View>
      ) : error && (activeSegment === 'pallets' ? activePallets.length === 0 : items.length === 0) ? (
        renderErrorState()
      ) : activeSegment === 'pallets' ? (
        activePallets.length === 0 ? (
          renderEmptyPallets()
        ) : (
          <FlatList
            data={activePallets}
            renderItem={renderPalletCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderCompletionPromptBanner}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )
      ) : items.length === 0 ? (
        renderEmptyItems()
      ) : filteredItems.length === 0 ? (
        <View style={styles.noResults}>
          <Ionicons name="search-outline" size={32} color={colors.neutral} />
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

      {/* Context-aware FAB */}
      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom, spacing.lg) }]}
        onPress={activeSegment === 'pallets' ? handleAddPallet : handleAddItem}
      >
        <Ionicons name="add" size={28} color={colors.background} />
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
                  <Ionicons name="checkmark" size={20} color={colors.background} />
                  <Text style={styles.quickSellButtonText}>
                    {isQuickSelling ? 'Saving...' : 'Confirm Sale'}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalItem !== null}
        type="delete"
        title={`Delete ${deleteModalItem?.name || 'Item'}?`}
        message="This action is permanent and cannot be undone."
        infoText="All data including photos will be removed."
        primaryLabel="Delete Item"
        secondaryLabel="Cancel"
        onPrimary={handleConfirmDelete}
        onClose={() => setDeleteModalItem(null)}
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

      {/* Completion Prompt Modal */}
      <ConfirmationModal
        visible={completionPromptPallet !== null}
        type="success"
        title={`Complete ${completionPromptPallet?.name || 'Pallet'}?`}
        message="All items have been listed or sold. Would you like to mark this pallet as completed?"
        infoText="Completed pallets are hidden from the inventory list but remain in your analytics."
        primaryLabel="Mark Completed"
        secondaryLabel="Not Now"
        onPrimary={handleMarkPalletComplete}
        onSecondary={handleDismissCompletionPrompt}
        onClose={() => setCompletionPromptPallet(null)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
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
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  swipeHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontFamily: fontFamily.regular,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontFamily: fontFamily.regular,
  },
  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xs,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentIcon: {
    marginRight: 0,
  },
  segmentText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  segmentTextActive: {
    color: colors.background,
    fontFamily: fontFamily.semibold,
  },
  // Search
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
    fontFamily: fontFamily.regular,
  },
  // Filter
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
    fontFamily: fontFamily.medium,
  },
  filterChipTextActive: {
    color: colors.background,
    fontFamily: fontFamily.medium,
  },
  filterChipWarning: {
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning,
  },
  filterChipTextWarning: {
    color: colors.warning,
    fontFamily: fontFamily.medium,
  },
  // Completion Banner
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.profit + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.profit + '30',
  },
  completionBannerIcon: {
    marginRight: spacing.md,
  },
  completionBannerContent: {
    flex: 1,
  },
  completionBannerTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  completionBannerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.semibold,
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
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  noResultsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.medium,
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
  // Swipe actions
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
    fontFamily: fontFamily.bold,
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
    fontFamily: fontFamily.bold,
    marginTop: 4,
  },
  // Quick Sell Modal
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
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  quickSellListing: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  quickSellLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
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
    fontFamily: fontFamily.regular,
  },
  quickSellInput: {
    flex: 1,
    fontSize: fontSize.xxl,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.regular,
  },
  quickSellPreviewValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
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
    fontFamily: fontFamily.semibold,
  },
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
    fontFamily: fontFamily.regular,
  },
  quickSellPlatformTextSelected: {
    color: colors.background,
    fontFamily: fontFamily.regular,
  },
});
