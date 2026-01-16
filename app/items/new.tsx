import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors } from '@/src/constants/colors';
import { useItemsStore } from '@/src/stores/items-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { ItemForm, ItemFormData } from '@/src/features/items';
import { PhotoItem } from '@/src/components/ui/PhotoPicker';
import { ConfirmationModal } from '@/src/components/ui';

export default function NewItemScreen() {
  const { palletId } = useLocalSearchParams<{ palletId?: string }>();
  const router = useRouter();
  const { addItem, uploadItemPhotos, isLoading } = useItemsStore();
  const { getPalletById } = usePalletsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Get pallet name for display
  const pallet = palletId ? getPalletById(palletId) : null;

  const handleCancel = () => {
    router.dismiss();
  };

  const handleSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    try {
      // Use pallet_id from form data (dropdown selection) or URL param (from pallet detail)
      const selectedPalletId = data.pallet_id || palletId || null;

      const result = await addItem({
        pallet_id: selectedPalletId,
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
        source_type: selectedPalletId ? 'pallet' : 'other',
        source_name: data.source_name,
        notes: data.notes,
      });

      if (result.success && result.data?.id) {
        // Upload photos if any
        if (photos.length > 0) {
          await uploadItemPhotos(result.data.id, photos);
        }

        router.dismiss();
        // Navigate to the new item detail
        setTimeout(() => {
          router.push(`/items/${result.data!.id}`);
        }, 100);
      } else {
        setErrorModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to create item',
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

  return (
    <>
      <Stack.Screen
        options={{
          title: pallet ? `Add to ${pallet.name}` : 'Add Item',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={styles.container}>
        <ItemForm
          palletId={palletId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Create Item"
          photos={photos}
          onPhotosChange={setPhotos}
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
});
