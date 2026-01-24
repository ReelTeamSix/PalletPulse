import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/src/constants/colors';
import { fontFamily } from '@/src/constants/fonts';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { ExpenseForm, ExpenseFormData } from '@/src/features/expenses';
import { ConfirmationModal } from '@/src/components/ui';

export default function NewExpenseScreen() {
  const { palletId } = useLocalSearchParams<{ palletId?: string }>();
  const router = useRouter();
  const { addExpense, isLoading } = useExpensesStore();
  const { getPalletById } = usePalletsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptPhotoUri, setReceiptPhotoUri] = useState<string | null>(null);
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

  const handleReceiptPhotoSelect = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setErrorModal({
          visible: true,
          title: 'Permission Required',
          message: 'Please allow access to your photos to add a receipt.',
        });
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
    } catch {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'Failed to select photo',
      });
    }
  };

  const handleReceiptPhotoRemove = () => {
    setReceiptPhotoUri(null);
  };

  const handleSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      // Use pallet_ids array for multi-pallet support (Phase 8D)
      // Fall back to palletId from route params if form has no selections
      const palletIds = data.pallet_ids?.length
        ? data.pallet_ids
        : (palletId ? [palletId] : []);

      const result = await addExpense({
        amount: data.amount,
        category: data.category,
        description: data.description,
        expense_date: data.expense_date,
        pallet_ids: palletIds,
        receipt_photo_path: receiptPhotoUri, // For now, store local URI; Phase 8+ can add cloud upload
      });

      if (result.success) {
        router.dismiss();
      } else {
        setErrorModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to create expense',
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
          title: pallet ? `Add Expense to ${pallet.name}` : 'Add Expense',
          headerBackTitle: 'Cancel',
          headerStyle: { backgroundColor: colors.backgroundSecondary },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        <ExpenseForm
          palletIds={palletId ? [palletId] : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Create Expense"
          onReceiptPhotoSelect={handleReceiptPhotoSelect}
          receiptPhotoUri={receiptPhotoUri}
          onReceiptPhotoRemove={handleReceiptPhotoRemove}
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
});
