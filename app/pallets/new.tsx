import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors } from '@/src/constants/colors';
import { fontFamily } from '@/src/constants/fonts';
import { usePalletsStore, PALLET_ERROR_CODES } from '@/src/stores/pallets-store';
import {
  PalletForm,
  PalletFormData,
  generatePalletName,
} from '@/src/features/pallets';
import { ConfirmationModal } from '@/src/components/ui';
import { PaywallModal } from '@/src/components/subscription';
import { SubscriptionTier } from '@/src/constants/tier-limits';

export default function NewPalletScreen() {
  const router = useRouter();
  const { pallets, addPallet, isLoading } = usePalletsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });
  const [paywallModal, setPaywallModal] = useState<{ visible: boolean; requiredTier: SubscriptionTier }>({
    visible: false,
    requiredTier: 'starter',
  });

  const handleCancel = () => {
    router.dismiss();
  };

  const handleSubmit = async (data: PalletFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addPallet({
        name: data.name,
        supplier: data.supplier,
        source_type: 'other', // Default to 'other' for freeform source names
        source_name: data.source_name,
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
      } else if (result.errorCode === PALLET_ERROR_CODES.TIER_LIMIT_REACHED) {
        // Show paywall for tier limit errors
        setPaywallModal({
          visible: true,
          requiredTier: result.requiredTier || 'starter',
        });
      } else {
        setErrorModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to create pallet',
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
      <View style={styles.container}>
        <PalletForm
          initialValues={{ name: suggestedName }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Create Pallet"
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

        {/* Paywall Modal for Tier Limits */}
        <PaywallModal
          visible={paywallModal.visible}
          onClose={() => setPaywallModal({ ...paywallModal, visible: false })}
          requiredTier={paywallModal.requiredTier}
          limitType="pallets"
          currentCount={pallets.length}
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
