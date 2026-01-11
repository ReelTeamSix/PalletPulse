import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { useItemsStore } from '@/src/stores/items-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { Button } from '@/src/components/ui';
import {
  formatCondition,
  formatStatus,
  getConditionColor,
  getStatusColor,
  calculateItemProfit,
} from '@/src/features/items/schemas/item-form-schema';
import { ItemPhoto } from '@/src/types/database';
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

  // Fetch items if not loaded
  useEffect(() => {
    if (items.length === 0) {
      fetchItems();
    }
  }, []);

  // Load photos
  useEffect(() => {
    async function loadPhotos() {
      if (id) {
        const itemPhotos = await fetchItemPhotos(id);
        setPhotos(itemPhotos);
      }
    }
    loadPhotos();
  }, [id]);

  const item = useMemo(() => {
    if (!id) return null;
    return getItemById(id);
  }, [id, items]);

  const pallet = useMemo(() => {
    if (!item?.pallet_id) return null;
    return getPalletById(item.pallet_id);
  }, [item, items]);

  const handleMarkAsSold = () => {
    // Mark as sold will be fully implemented in Phase 7
    router.push({ pathname: '/items/sell', params: { id } });
  };

  const handleEdit = () => {
    router.push({ pathname: '/items/edit', params: { id } });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            const result = await deleteItem(id);
            if (result.success) {
              router.back();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handlePalletPress = () => {
    if (pallet) {
      router.push(`/pallets/${pallet.id}`);
    }
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
            <FontAwesome name="exclamation-circle" size={48} color={colors.loss} />
            <Text style={styles.errorTitle}>Item Not Found</Text>
            <Text style={styles.errorText}>
              This item may have been deleted or doesn't exist.
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

  const profit = calculateItemProfit(item.sale_price, effectiveCost, null);
  const estimatedProfit = item.listing_price
    ? calculateItemProfit(item.listing_price, effectiveCost, null)
    : null;
  const isProfitable = profit >= 0;
  const hasSold = item.status === 'sold';

  return (
    <>
      <Stack.Screen
        options={{
          title: item.name,
          headerBackTitle: 'Back',
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
          <View style={styles.photoSection}>
            {photos.length > 0 ? (
              <View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                    setCurrentPhotoIndex(index);
                  }}
                  scrollEventThrottle={16}
                >
                  {photos.map((photo) => (
                    <Image
                      key={photo.id}
                      source={{ uri: getPhotoUrl(photo.storage_path) }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
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
              <View style={styles.photoPlaceholder}>
                <FontAwesome name="camera" size={48} color={colors.neutral} />
                <Text style={styles.photoPlaceholderText}>No photos</Text>
              </View>
            )}
          </View>

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={[styles.conditionBadge, { backgroundColor: conditionColor }]}>
                <Text style={styles.conditionText}>{formatCondition(item.condition)}</Text>
              </View>
              {item.quantity > 1 && (
                <Text style={styles.quantity}>Qty: {item.quantity}</Text>
              )}
            </View>
          </View>

          <View style={styles.priceRow}>
            {hasSold ? (
              <>
                <View style={styles.priceCard}>
                  <Text style={styles.priceLabel}>Sold For</Text>
                  <Text style={[styles.priceValue, { color: colors.profit }]}>
                    {formatCurrency(item.sale_price)}
                  </Text>
                </View>
                <View style={styles.priceCard}>
                  <Text style={styles.priceLabel}>{isEstimatedCost ? 'Est. Cost' : 'Cost'}</Text>
                  <Text style={styles.priceValue}>{formatCurrency(effectiveCost)}</Text>
                </View>
                <View style={[styles.priceCard, { backgroundColor: isProfitable ? colors.profit + '15' : colors.loss + '15' }]}>
                  <Text style={styles.priceLabel}>Profit</Text>
                  <Text style={[styles.priceValue, { color: isProfitable ? colors.profit : colors.loss }]}>
                    {formatCurrency(profit)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.priceCard}>
                  <Text style={styles.priceLabel}>List Price</Text>
                  <Text style={styles.priceValue}>{formatCurrency(item.listing_price)}</Text>
                </View>
                <View style={styles.priceCard}>
                  <Text style={styles.priceLabel}>{isEstimatedCost ? 'Est. Cost' : 'Cost'}</Text>
                  <Text style={styles.priceValue}>{formatCurrency(effectiveCost)}</Text>
                </View>
                <View style={[styles.priceCard, styles.profitCard]}>
                  <Text style={styles.priceLabel}>Est. Profit</Text>
                  <Text style={[styles.priceValue, styles.profitText]}>
                    {estimatedProfit !== null ? formatCurrency(estimatedProfit) : '-'}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Cost Allocation Info for Pallet Items */}
          {isEstimatedCost && pallet && (
            <View style={styles.costAllocationInfo}>
              <FontAwesome name="info-circle" size={14} color={colors.textSecondary} />
              <Text style={styles.costAllocationText}>
                Cost allocated from pallet: {formatCurrency(pallet.purchase_cost + (pallet.sales_tax || 0))} ÷ {palletItemCount} items
              </Text>
            </View>
          )}

          {pallet && (
            <Pressable style={styles.palletLink} onPress={handlePalletPress}>
              <FontAwesome name="archive" size={16} color={colors.primary} />
              <Text style={styles.palletLinkText}>From pallet: {pallet.name}</Text>
              <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
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

        {!hasSold && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <Button
              title="Edit Item"
              onPress={handleEdit}
              variant="outline"
              style={styles.editButton}
            />
            <Button
              title="Mark as Sold"
              onPress={handleMarkAsSold}
              style={styles.soldButton}
            />
          </View>
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
    paddingBottom: 120,
  },
  photoSection: {
    height: 250,
    backgroundColor: colors.surface,
  },
  photo: {
    width: screenWidth,
    height: 250,
  },
  photoIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: spacing.md,
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
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: fontSize.md,
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  conditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  conditionText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '500',
  },
  quantity: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  priceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  profitCard: {
    backgroundColor: colors.profit + '15',
  },
  priceLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  profitText: {
    color: colors.profit,
  },
  costAllocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  costAllocationText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  palletLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  palletLinkText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  descriptionText: {
    fontSize: fontSize.md,
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
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  editButton: {
    flex: 1,
  },
  soldButton: {
    flex: 1,
  },
});
