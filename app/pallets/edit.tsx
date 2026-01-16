import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize } from '@/src/constants/spacing';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { PalletForm, PalletFormData } from '@/src/features/pallets';
import { ConfirmationModal } from '@/src/components/ui';

export default function EditPalletScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { pallets, getPalletById, updatePallet, isLoading, fetchPallets } = usePalletsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Fetch pallets if not loaded
  useEffect(() => {
    if (pallets.length === 0) {
      fetchPallets();
    }
  }, [pallets.length, fetchPallets]);

  const pallet = useMemo(() => {
    if (!id) return null;
    return getPalletById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pallets triggers re-fetch
  }, [id, pallets, getPalletById]);

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (data: PalletFormData) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      const result = await updatePallet(id, {
        name: data.name,
        supplier: data.supplier,
        source_name: data.source_name,
        purchase_cost: data.purchase_cost,
        sales_tax: data.sales_tax,
        purchase_date: data.purchase_date,
        status: data.status,
        notes: data.notes,
      });

      if (result.success) {
        router.back();
      } else {
        setErrorModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to update pallet',
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

  if (isLoading && !pallet) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (!pallet) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={48} color={colors.loss} />
            <Text style={styles.errorTitle}>Pallet Not Found</Text>
            <Text style={styles.errorText}>
              {"This pallet may have been deleted or doesn't exist."}
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Pallet',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <PalletForm
          pallet={pallet}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Save Changes"
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
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
