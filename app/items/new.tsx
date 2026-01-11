import { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/constants/colors';
import { useItemsStore } from '@/src/stores/items-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { ItemForm, ItemFormData } from '@/src/features/items';

export default function NewItemScreen() {
  const { palletId } = useLocalSearchParams<{ palletId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addItem, isLoading } = useItemsStore();
  const { getPalletById } = usePalletsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get pallet name for display
  const pallet = palletId ? getPalletById(palletId) : null;

  const handleCancel = () => {
    router.dismiss();
  };

  const handleSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addItem({
        pallet_id: palletId || null,
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
        source_type: palletId ? 'pallet' : 'other',
        source_name: data.source_name,
        notes: data.notes,
      });

      if (result.success) {
        router.dismiss();
        // Navigate to the new item detail if we have the ID
        if (result.data?.id) {
          setTimeout(() => {
            router.push(`/items/${result.data!.id}`);
          }, 100);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to create item');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
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
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ItemForm
          palletId={palletId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Create Item"
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
