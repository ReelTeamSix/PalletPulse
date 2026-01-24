import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { isUnlimited } from '@/src/constants/tier-limits';
import { useItemsStore } from '@/src/stores/items-store';
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { ItemForm, ItemFormData } from '@/src/features/items';
import { PhotoItem } from '@/src/components/ui/PhotoPicker';
import { getPhotoUrl } from '@/src/lib/photo-utils';
import { ItemPhoto } from '@/src/types/database';
import { Button, ConfirmationModal } from '@/src/components/ui';
import { useToast } from '@/src/lib/toast';

export default function EditItemScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    items,
    getItemById,
    updateItem,
    isLoading,
    fetchItems,
    fetchItemPhotos,
    uploadItemPhotos,
    deleteItemPhoto,
  } = useItemsStore();
  const { getLimitForAction, getEffectiveTier } = useSubscriptionStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get photo limit based on subscription tier
  const photoLimit = getLimitForAction('photosPerItem') as number;
  const maxPhotos = isUnlimited(photoLimit) ? 50 : photoLimit;
  const effectiveTier = getEffectiveTier();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [originalPhotos, setOriginalPhotos] = useState<ItemPhoto[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [hasConfirmedSoldEdit, setHasConfirmedSoldEdit] = useState(false);
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

  // Load existing photos
  useEffect(() => {
    async function loadPhotos() {
      if (id && !photosLoaded) {
        const itemPhotos = await fetchItemPhotos(id);
        setOriginalPhotos(itemPhotos);
        // Convert to PhotoItem format
        const photoItems: PhotoItem[] = itemPhotos.map((p) => ({
          id: p.id,
          uri: getPhotoUrl(p.storage_path),
          storagePath: p.storage_path,
          isNew: false,
        }));
        setPhotos(photoItems);
        setPhotosLoaded(true);
      }
    }
    loadPhotos();
  }, [id, photosLoaded, fetchItemPhotos]);

  const item = useMemo(() => {
    if (!id) return null;
    return getItemById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items triggers re-fetch
  }, [id, items, getItemById]);

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (data: ItemFormData) => {
    if (!id || !item) return;

    setIsSubmitting(true);
    try {
      // Build update object with basic fields
      const updateData: Parameters<typeof updateItem>[1] = {
        name: data.name,
        description: data.description,
        quantity: data.quantity,
        condition: data.condition,
        retail_price: data.retail_price,
        listing_price: data.listing_price,
        purchase_cost: data.purchase_cost,
        storage_location: data.storage_location,
        status: data.status,
        barcode: data.barcode,
        source_name: data.source_name,
        notes: data.notes,
        pallet_id: data.pallet_id || null,
      };

      // Include sale fields if item was sold (or is being marked as sold)
      if (data.status === 'sold') {
        updateData.sale_price = data.sale_price;
        updateData.sale_date = data.sale_date;
        updateData.platform = data.platform;
        updateData.platform_fee = data.platform_fee;
        updateData.shipping_cost = data.shipping_cost;
      } else if (item.status === 'sold') {
        // data.status is not 'sold' here (control flow) - clear sale fields
        // If changing from sold to another status, clear sale fields
        updateData.sale_price = null;
        updateData.sale_date = null;
        updateData.platform = null;
        updateData.platform_fee = null;
        updateData.shipping_cost = null;
      }

      const result = await updateItem(id, updateData);

      if (result.success) {
        // Handle photo changes
        // 1. Delete removed photos
        const currentPhotoIds = photos.filter(p => !p.isNew).map(p => p.id);
        const photosToDelete = originalPhotos.filter(p => !currentPhotoIds.includes(p.id));
        for (const photo of photosToDelete) {
          await deleteItemPhoto(photo.id, photo.storage_path);
        }

        // 2. Upload new photos
        const newPhotos = photos.filter(p => p.isNew);
        if (newPhotos.length > 0) {
          await uploadItemPhotos(id, newPhotos);
        }

        toast.success('Item Updated');
        router.back();
      } else {
        setErrorModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to update item',
        });
      }
    } catch {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
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
              {"This item may have been deleted or doesn't exist."}
            </Text>
          </View>
        </View>
      </>
    );
  }

  // Show confirmation screen for sold items
  const isSoldItem = item.status === 'sold';
  if (isSoldItem && !hasConfirmedSoldEdit) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Edit Sold Item',
            headerBackTitle: 'Cancel',
          }}
        />
        <View style={styles.container}>
          <View style={styles.confirmContainer}>
            <View style={styles.warningIconContainer}>
              <FontAwesome name="exclamation-triangle" size={48} color={colors.warning} />
            </View>
            <Text style={styles.confirmTitle}>Edit Sold Item?</Text>
            <Text style={styles.confirmText}>
              {'This item has already been marked as sold. You can edit sale details (price, fees, platform) directly, or change the status back to "Listed" to undo the sale.'}
            </Text>
            <View style={styles.warningBox}>
              <FontAwesome name="info-circle" size={16} color={colors.textSecondary} />
              <Text style={styles.warningText}>
                Changes to sale details will update profit calculations for this item and its associated pallet.
              </Text>
            </View>
            <View style={styles.confirmButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => router.back()}
                style={styles.confirmButton}
              />
              <Button
                title="Continue Editing"
                onPress={() => setHasConfirmedSoldEdit(true)}
                style={styles.confirmButton}
              />
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Item',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={styles.container}>
        <ItemForm
          item={item}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Save Changes"
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={maxPhotos}
          currentTier={effectiveTier}
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
  },
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  confirmTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
  },
});
