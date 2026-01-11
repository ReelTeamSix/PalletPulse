import { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { usePalletsStore } from '@/src/stores/pallets-store';
import {
  PalletForm,
  PalletFormData,
  generatePalletName,
} from '@/src/features/pallets';

export default function NewPalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pallets, addPallet, isLoading } = usePalletsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = () => {
    router.dismiss();
  };

  const handleSubmit = async (data: PalletFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addPallet({
        name: data.name,
        supplier: data.supplier,
        source_type: data.source_type,
        purchase_cost: data.purchase_cost,
        sales_tax: data.sales_tax,
        purchase_date: data.purchase_date,
        status: data.status,
        notes: data.notes,
      });

      if (result.success) {
        router.dismiss();
        // Navigate to the new pallet detail if we have the ID
        if (result.data?.id) {
          setTimeout(() => {
            router.push(`/pallets/${result.data!.id}`);
          }, 100);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to create pallet');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate suggested name for new pallet
  const suggestedName = generatePalletName(pallets);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Pallet',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <PalletForm
          initialValues={{ name: suggestedName }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Create Pallet"
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
