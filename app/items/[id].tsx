import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import { fontFamily } from '@/src/constants/fonts';
import { useItemsStore } from '@/src/stores/items-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { Button, ConfirmationModal } from '@/src/components/ui';
import {
  formatCondition,
  formatStatus,
  getConditionColor,
  getStatusColor,
  calculateItemProfit,
} from '@/src/features/items/schemas/item-form-schema';
import { PLATFORM_PRESETS } from '@/src/features/sales/schemas/sale-form-schema';
import { ItemPhoto, SalesPlatform } from '@/src/types/database';
import { getPhotoUrl } from '@/src/lib/photo-utils';

const { width: screenWidth } = Dimensions.get('window');

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, getItemById, deleteItem, isLoading, fetchItems, fetchItemPhotos } = useItemsStore();
  const { getPalletById } = usePalletsStore();
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState(0);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Fetch items if not loaded
  useEffect(() => {
    if (items.length === 0) {
      fetchItems();
    }
  }, [items.length, fetchItems]);

  // Load photos
  useEffect(() => {
    async function loadPhotos() {
      if (id) {
        const itemPhotos = await fetchItemPhotos(id);
        setPhotos(itemPhotos);
      }
    }
    loadPhotos();
  }, [id, fetchItemPhotos]);

  const item = useMemo(() => {
    if (!id) return null;
    return getItemById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items triggers re-fetch
  }, [id, items, getItemById]);

  const pallet = useMemo(() => {
    if (!item?.pallet_id) return null;
    return getPalletById(item.pallet_id);
  }, [item, getPalletById]);

  const handleMarkAsSold = () => {
    // Mark as sold will be fully implemented in Phase 7
    router.push({ pathname: '/items/sell', params: { id } });
  };

  const handleEdit = () => {
    router.push({ pathname: '/items/edit', params: { id } });
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!id) return;
    setDeleteModalVisible(false);
    const result = await deleteItem(id);
    if (result.success) {
      router.back();
    } else {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to delete item',
      });
    }
  };

  const handlePalletPress = () => {
    if (pallet) {
      router.push(`/pallets/${pallet.id}`);
    }
  };

  const handlePhotoPress = (index: number) => {
    setViewerPhotoIndex(index);
    setPhotoViewerVisible(true);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSourceType = (sourceType: string | null) => {
    if (!sourceType) return 'Other';
    const map: Record<string, string> = {
      pallet: 'Pallet',
      thrift: 'Thrift Store',
      garage_sale: 'Garage Sale',
      estate_sale: 'Estate Sale',
      auction: 'Auction',
      retail_clearance: 'Retail Clearance',
      online: 'Online Purchase',
      wholesale: 'Wholesale',
      other: 'Other',
    };
    return map[sourceType] || sourceType;
  };

  const formatPlatform = (platform: SalesPlatform | null) => {
    if (!platform) return 'Unknown';
    return PLATFORM_PRESETS[platform]?.name || platform;
  };

  if (isLoading && !item) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.loss} />
            <Text style={styles.errorTitle}>Item Not Found</Text>
            <Text style={styles.errorText}>
              {"This item may have been deleted or doesn't exist."}
            </Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  const statusColor = getStatusColor(item.status);
  const conditionColor = getConditionColor(item.condition);

  // Calculate cost allocation for pallet items
  const palletItems = pallet ? useItemsStore.getState().getItemsByPallet(pallet.id) : [];
  const palletItemCount = palletItems.length || 1;
  const calculatedAllocatedCost = pallet && pallet.purchase_cost
    ? (pallet.purchase_cost + (pallet.sales_tax || 0)) / palletItemCount
    : null;

  // Use stored allocated_cost if available, otherwise calculate from pallet, otherwise use purchase_cost
  const effectiveCost = item.allocated_cost ?? calculatedAllocatedCost ?? item.purchase_cost ?? 0;
  const isEstimatedCost = !item.allocated_cost && calculatedAllocatedCost !== null;

  // Calculate profit including platform fees and shipping costs
  const profit = calculateItemProfit(
    item.sale_price,
    effectiveCost,
    null,
    item.platform_fee,
    item.shipping_cost
  );
  const estimatedProfit = item.listing_price
    ? calculateItemProfit(item.listing_price, effectiveCost, null)
    : null;
  const isProfitable = profit >= 0;
  const hasSold = item.status === 'sold';

  // Calculate margin percentage for sold items
  // Only show margin indicator for reasonable values (-99% to 999%)
  // Extreme losses (like -18900%) aren't meaningful to display
  const rawMarginPercent = hasSold && item.sale_price && item.sale_price > 0
    ? Math.round((profit / item.sale_price) * 100)
    : null;
  const marginPercent = rawMarginPercent !== null && rawMarginPercent >= -99 && rawMarginPercent <= 999
    ? rawMarginPercent
    : null;

  // Calculate days to sell
  const daysToSell = (() => {
    if (!hasSold || !item.listing_date || !item.sale_date) return null;
    const listDate = new Date(item.listing_date);
    const saleDate = new Date(item.sale_date);
    const diffTime = saleDate.getTime() - listDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  })();

  // Check if there's any sale detail content to show
  const hasSaleDetails = hasSold && (
    (item.platform_fee !== null && item.platform_fee > 0) ||
    (item.shipping_cost !== null && item.shipping_cost > 0) ||
    item.listing_date !== null
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: item.name,
          headerBackTitle: 'Back',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable style={styles.headerButton} onPress={handleEdit}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </Pressable>
              <Pressable style={styles.headerButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={colors.loss} />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Hero Image Section with Overlay */}
          <View style={styles.heroSection}>
            {photos.length > 0 ? (
              <View style={styles.heroImageContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.heroScrollView}
                  onScroll={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                    setCurrentPhotoIndex(index);
                  }}
                  scrollEventThrottle={16}
                >
                  {photos.map((photo, index) => (
                    <Pressable key={photo.id} onPress={() => handlePhotoPress(index)}>
                      <Image
                        source={{ uri: getPhotoUrl(photo.storage_path) }}
                        style={styles.heroImage}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Gradient Overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.heroGradient}
                  pointerEvents="none"
                />

                {/* Status Badge on Image */}
                <View style={[styles.heroStatusBadge, { backgroundColor: statusColor }]}>
                  <Ionicons
                    name={hasSold ? 'checkmark-circle' : item.status === 'listed' ? 'pricetag' : 'cube'}
                    size={14}
                    color={colors.background}
                  />
                  <Text style={styles.heroStatusText}>
                    {formatStatus(item.status).toUpperCase()}
                  </Text>
                </View>

                {/* Condition Badge on Image */}
                <View style={[styles.heroConditionBadge, { backgroundColor: conditionColor }]}>
                  <Text style={styles.heroConditionText}>
                    {formatCondition(item.condition).toUpperCase()}
                  </Text>
                </View>

                {/* Item Name Overlay */}
                <View style={styles.heroTextOverlay}>
                  {item.barcode && (
                    <Text style={styles.heroSku}>SKU: {item.barcode}</Text>
                  )}
                  <Text style={styles.heroTitle} numberOfLines={2}>{item.name}</Text>
                </View>

                {/* Photo Indicators */}
                {photos.length > 1 && (
                  <View style={styles.photoIndicator}>
                    {photos.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.indicatorDot,
                          index === currentPhotoIndex && styles.indicatorDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="camera-outline" size={48} color={colors.neutral} />
                <Text style={styles.heroPlaceholderText}>No photos</Text>
                {/* Status and Name for no-photo state */}
                <View style={styles.noPhotoHeader}>
                  <Text style={styles.noPhotoTitle}>{item.name}</Text>
                  <View style={styles.noPhotoBadgeRow}>
                    <View style={[styles.noPhotoStatusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.noPhotoStatusText}>{formatStatus(item.status)}</Text>
                    </View>
                    <View style={[styles.noPhotoConditionBadge, { backgroundColor: conditionColor + '20' }]}>
                      <Text style={[styles.noPhotoConditionText, { color: conditionColor }]}>
                        {formatCondition(item.condition)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Financial Snapshot Card */}
          <View style={styles.financialCard}>
            <View style={styles.financialHeader}>
              <Text style={styles.financialTitle}>Financial Snapshot</Text>
              <Ionicons name="trending-up" size={20} color={colors.primary} />
            </View>

            {/* Price Boxes */}
            <View style={styles.priceBoxRow}>
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxLabel}>
                  {hasSold ? 'SALE PRICE' : 'LIST PRICE'}
                </Text>
                <Text style={styles.priceBoxValue}>
                  {formatCurrency(hasSold ? item.sale_price : item.listing_price)}
                </Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxLabel}>
                  {isEstimatedCost ? 'ALLOCATED COST' : 'ITEM COST'}
                </Text>
                <Text style={[styles.priceBoxValue, styles.costValue]}>
                  {formatCurrency(effectiveCost)}
                </Text>
              </View>
            </View>

            {/* Dashed Divider */}
            <View style={styles.dashedDivider} />

            {/* Net Profit Row */}
            <View style={styles.profitRow}>
              <View>
                <Text style={styles.profitLabel}>
                  {hasSold ? 'Net Profit' : 'Est. Profit'}
                </Text>
                <Text style={[
                  styles.profitValue,
                  { color: isProfitable ? colors.profit : colors.loss }
                ]}>
                  {hasSold ? formatCurrency(profit) : (estimatedProfit !== null ? formatCurrency(estimatedProfit) : '-')}
                </Text>
              </View>
              {/* Margin Indicator - only shown for reasonable margin values */}
              {hasSold && marginPercent !== null && (
                <View style={styles.marginIndicator}>
                  <View style={[
                    styles.marginCircle,
                    { borderColor: isProfitable ? colors.profit : colors.loss }
                  ]}>
                    <Text style={[
                      styles.marginPercent,
                      { color: isProfitable ? colors.profit : colors.loss }
                    ]}>
                      {marginPercent}%
                    </Text>
                  </View>
                  <Text style={styles.marginLabel}>MARGIN</Text>
                </View>
              )}
            </View>
          </View>

          {/* Cost Allocation Info for Pallet Items */}
          {isEstimatedCost && pallet && (
            <View style={styles.costAllocationInfo}>
              <Ionicons name="information-circle" size={14} color={colors.textSecondary} />
              <Text style={styles.costAllocationText}>
                Cost allocated from pallet: {formatCurrency(pallet.purchase_cost + (pallet.sales_tax || 0))} ÷ {palletItemCount} items
              </Text>
            </View>
          )}

          {/* Sale Details Section for Sold Items - only show if there's content */}
          {hasSaleDetails && (
            <View style={styles.section}>
              <View style={styles.saleDetailsHeader}>
                <Text style={styles.sectionTitle}>Sale Details</Text>
                {item.platform && (
                  <View style={styles.platformTag}>
                    <Ionicons name="laptop-outline" size={14} color={colors.primary} />
                    <Text style={styles.platformTagText}>{formatPlatform(item.platform)} Sale</Text>
                  </View>
                )}
              </View>

              <View style={styles.saleDetailsCard}>
                {/* Platform Fees Row */}
                {(item.platform_fee !== null && item.platform_fee > 0) && (
                  <View style={styles.saleDetailRow}>
                    <View style={styles.saleDetailIconContainer}>
                      <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.saleDetailContent}>
                      <Text style={styles.saleDetailTitle}>Platform Fees</Text>
                      {item.platform && PLATFORM_PRESETS[item.platform] && (
                        <Text style={styles.saleDetailSubtitle}>
                          {PLATFORM_PRESETS[item.platform].description}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.saleDetailAmount}>
                      -{formatCurrency(item.platform_fee)}
                    </Text>
                  </View>
                )}

                {/* Shipping Costs Row */}
                {(item.shipping_cost !== null && item.shipping_cost > 0) && (
                  <View style={styles.saleDetailRow}>
                    <View style={[styles.saleDetailIconContainer, { backgroundColor: colors.warning + '15' }]}>
                      <Ionicons name="cube-outline" size={18} color={colors.warning} />
                    </View>
                    <View style={styles.saleDetailContent}>
                      <Text style={styles.saleDetailTitle}>Shipping Costs</Text>
                      <Text style={styles.saleDetailSubtitle}>Shipping expense</Text>
                    </View>
                    <Text style={styles.saleDetailAmount}>
                      -{formatCurrency(item.shipping_cost)}
                    </Text>
                  </View>
                )}

                {/* Date Info Row */}
                <View style={styles.dateInfoRow}>
                  {item.listing_date && (
                    <View style={styles.dateInfoItem}>
                      <Text style={styles.dateInfoLabel}>LISTED DATE</Text>
                      <Text style={styles.dateInfoValue}>{formatDate(item.listing_date)}</Text>
                    </View>
                  )}
                  {daysToSell !== null && (
                    <View style={styles.dateInfoItem}>
                      <Text style={styles.dateInfoLabel}>DAYS TO SELL</Text>
                      <Text style={styles.dateInfoValue}>{daysToSell} {daysToSell === 1 ? 'Day' : 'Days'}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {pallet && (
            <Pressable style={styles.palletLink} onPress={handlePalletPress}>
              <Ionicons name="cube-outline" size={16} color={colors.primary} />
              <Text style={styles.palletLinkText}>From pallet: {pallet.name}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </Pressable>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Condition</Text>
                <Text style={styles.detailValue}>{formatCondition(item.condition)}</Text>
              </View>
              {item.retail_price !== null && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Retail Price</Text>
                  <Text style={styles.detailValue}>{formatCurrency(item.retail_price)}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{item.quantity}</Text>
              </View>
              {item.storage_location && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Storage Location</Text>
                  <Text style={styles.detailValue}>{item.storage_location}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source</Text>
                <Text style={styles.detailValue}>
                  {formatSourceType(item.source_type)}
                  {item.source_name ? ` - ${item.source_name}` : ''}
                </Text>
              </View>
              {item.barcode && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Barcode</Text>
                  <Text style={styles.detailValue}>{item.barcode}</Text>
                </View>
              )}
              {item.listing_date && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Listed Date</Text>
                  <Text style={styles.detailValue}>{formatDate(item.listing_date)}</Text>
                </View>
              )}
              {hasSold && item.sale_date && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sale Date</Text>
                  <Text style={styles.detailValue}>{formatDate(item.sale_date)}</Text>
                </View>
              )}
              {hasSold && item.sales_channel && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sales Channel</Text>
                  <Text style={styles.detailValue}>{item.sales_channel}</Text>
                </View>
              )}
            </View>
          </View>

          {(item.description || item.notes) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {item.description && item.notes ? 'Description & Notes' : item.description ? 'Description' : 'Notes'}
              </Text>
              <View style={styles.descriptionCard}>
                {item.description && (
                  <Text style={styles.descriptionText}>{item.description}</Text>
                )}
                {item.description && item.notes && <View style={styles.separator} />}
                {item.notes && (
                  <Text style={styles.notesText}>{item.notes}</Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {hasSold ? (
            <Pressable style={styles.editButtonFull} onPress={handleEdit}>
              <Ionicons name="create-outline" size={20} color={colors.background} />
              <Text style={styles.editButtonText}>Edit Item</Text>
            </Pressable>
          ) : (
            <>
              <Button
                title="Edit Item"
                onPress={handleEdit}
                variant="outline"
                style={styles.editButtonHalf}
              />
              <Button
                title="Mark as Sold"
                onPress={handleMarkAsSold}
                style={styles.soldButton}
              />
            </>
          )}
        </View>

        {/* Full-screen Photo Viewer Modal */}
        <Modal
          visible={photoViewerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPhotoViewerVisible(false)}
        >
          <StatusBar backgroundColor="black" barStyle="light-content" />
          <View style={styles.photoViewerContainer}>
            <Pressable
              style={styles.photoViewerCloseButton}
              onPress={() => setPhotoViewerVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.background} />
            </Pressable>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: viewerPhotoIndex * screenWidth, y: 0 }}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                setViewerPhotoIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  style={styles.photoViewerImageContainer}
                  onPress={() => setPhotoViewerVisible(false)}
                >
                  <Image
                    source={{ uri: getPhotoUrl(photo.storage_path) }}
                    style={styles.photoViewerImage}
                    resizeMode="contain"
                  />
                </Pressable>
              ))}
            </ScrollView>
            {photos.length > 1 && (
              <View style={styles.photoViewerIndicator}>
                <Text style={styles.photoViewerIndicatorText}>
                  {viewerPhotoIndex + 1} / {photos.length}
                </Text>
              </View>
            )}
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          visible={deleteModalVisible}
          type="delete"
          title={`Delete ${item.name}?`}
          message="This action is permanent and cannot be undone."
          primaryLabel="Delete Item"
          secondaryLabel="Cancel"
          onPrimary={confirmDelete}
          onClose={() => setDeleteModalVisible(false)}
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
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
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.semibold,
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
    paddingBottom: 120,
  },

  // Hero Section Styles
  heroSection: {
    height: 300,
    backgroundColor: colors.surface,
  },
  heroImageContainer: {
    height: 300,
    position: 'relative',
  },
  heroScrollView: {
    height: 300,
  },
  heroImage: {
    width: screenWidth,
    height: 300,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  heroStatusBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  heroStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.background,
    letterSpacing: 0.5,
  },
  heroConditionBadge: {
    position: 'absolute',
    bottom: 70,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  heroConditionText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.background,
    letterSpacing: 0.5,
  },
  heroTextOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
  heroSku: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
    color: colors.background,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  photoIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    gap: spacing.xs,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorDotActive: {
    backgroundColor: colors.background,
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  heroPlaceholderText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  noPhotoHeader: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  noPhotoTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noPhotoBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noPhotoStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  noPhotoStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.background,
  },
  noPhotoConditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  noPhotoConditionText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },

  // Financial Snapshot Card
  financialCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  financialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  financialTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  priceBoxRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  priceBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  priceBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  priceBoxValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  costValue: {
    color: colors.loss,
  },
  dashedDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
  },
  marginIndicator: {
    alignItems: 'center',
  },
  marginCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  marginPercent: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
  },
  marginLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  // Cost Allocation Info
  costAllocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  costAllocationText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },

  // Sale Details Section
  saleDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  platformTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  platformTagText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  saleDetailsCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  saleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  saleDetailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  saleDetailContent: {
    flex: 1,
  },
  saleDetailTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  saleDetailSubtitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saleDetailAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.loss,
  },
  dateInfoRow: {
    flexDirection: 'row',
    paddingTop: spacing.md,
  },
  dateInfoItem: {
    flex: 1,
  },
  dateInfoLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateInfoValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },

  // Pallet Link
  palletLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  palletLinkText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },

  // Section Styles
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },

  // Details Card
  detailsCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
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
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },

  // Description Card
  descriptionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  descriptionText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  notesText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  editButtonFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  editButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.background,
  },
  editButtonHalf: {
    flex: 1,
  },
  soldButton: {
    flex: 1,
  },

  // Photo Viewer Modal
  photoViewerContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  photoViewerImageContainer: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImage: {
    width: screenWidth,
    height: '80%',
  },
  photoViewerIndicator: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  photoViewerIndicatorText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
});
