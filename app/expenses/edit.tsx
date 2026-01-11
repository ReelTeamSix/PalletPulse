import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Text } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize } from '@/src/constants/spacing';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { ExpenseForm, ExpenseFormData } from '@/src/features/expenses';

export default function EditExpenseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { expenses, getExpenseById, updateExpense, isLoading, fetchExpenses } = useExpensesStore();
  const { getPalletById } = usePalletsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptPhotoUri, setReceiptPhotoUri] = useState<string | null>(null);

  // Fetch expenses if not loaded
  useEffect(() => {
    if (expenses.length === 0) {
      fetchExpenses();
    }
  }, []);

  const expense = useMemo(() => {
    if (!id) return null;
    return getExpenseById(id);
  }, [id, expenses]);

  // Initialize receipt photo from expense
  useEffect(() => {
    if (expense?.receipt_photo_path) {
      setReceiptPhotoUri(expense.receipt_photo_path);
    }
  }, [expense]);

  const pallet = useMemo(() => {
    if (!expense?.pallet_id) return null;
    return getPalletById(expense.pallet_id);
  }, [expense]);

  const handleCancel = () => {
    router.back();
  };

  const handleReceiptPhotoSelect = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to add a receipt.');
        return;
      }

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
    if (!id || !expense) return;

    setIsSubmitting(true);
    try {
      const result = await updateExpense(id, {
        amount: data.amount,
        category: data.category,
        description: data.description,
        expense_date: data.expense_date,
        pallet_id: data.pallet_id,
        receipt_photo_path: receiptPhotoUri,
      });

      if (result.success) {
        router.back();
      } else {
        Alert.alert('Error', result.error || 'Failed to update expense');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!expense) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Expense' }} />
        <View style={styles.centered}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={styles.notFoundText}>Expense not found</Text>
          )}
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Expense',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ExpenseForm
          expense={expense}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Save Changes"
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
});
