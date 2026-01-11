import { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/src/constants/colors';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { ExpenseForm, ExpenseFormData } from '@/src/features/expenses';

export default function NewExpenseScreen() {
  const { palletId } = useLocalSearchParams<{ palletId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addExpense, isLoading } = useExpensesStore();
  const { getPalletById } = usePalletsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptPhotoUri, setReceiptPhotoUri] = useState<string | null>(null);

  // Get pallet name for display
  const pallet = palletId ? getPalletById(palletId) : null;

  const handleCancel = () => {
    router.dismiss();
  };

  const handleReceiptPhotoSelect = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to add a receipt.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleReceiptPhotoRemove = () => {
    setReceiptPhotoUri(null);
  };

  const handleSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addExpense({
        amount: data.amount,
        category: data.category,
        description: data.description,
        expense_date: data.expense_date,
        pallet_id: data.pallet_id || palletId || null,
        receipt_photo_path: receiptPhotoUri, // For now, store local URI; Phase 8+ can add cloud upload
      });

      if (result.success) {
        router.dismiss();
      } else {
        Alert.alert('Error', result.error || 'Failed to create expense');
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
          title: pallet ? `Add Expense to ${pallet.name}` : 'Add Expense',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ExpenseForm
          palletId={palletId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Create Expense"
          onReceiptPhotoSelect={handleReceiptPhotoSelect}
          receiptPhotoUri={receiptPhotoUri}
          onReceiptPhotoRemove={handleReceiptPhotoRemove}
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
