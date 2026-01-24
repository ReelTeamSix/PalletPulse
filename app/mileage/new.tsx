import { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors } from '@/src/constants/colors';
import { fontFamily } from '@/src/constants/fonts';
import { useMileageStore } from '@/src/stores/mileage-store';
import { MileageForm, MileageFormData } from '@/src/features/mileage';
import { ConfirmationModal } from '@/src/components/ui';
import { useToast } from '@/src/lib/toast';

export default function NewMileageTripScreen() {
  const { palletId } = useLocalSearchParams<{ palletId?: string }>();
  const router = useRouter();
  const toast = useToast();
  const { addTrip, isLoading, fetchCurrentMileageRate, currentMileageRate } = useMileageStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Fetch current IRS rate on mount
  useEffect(() => {
    fetchCurrentMileageRate();
  }, [fetchCurrentMileageRate]);

  const handleCancel = () => {
    router.dismiss();
  };

  const handleSubmit = async (data: MileageFormData) => {
    setIsSubmitting(true);
    try {
      // If palletId was passed via URL, include it in pallet_ids
      const palletIds = data.pallet_ids || [];
      if (palletId && !palletIds.includes(palletId)) {
        palletIds.push(palletId);
      }

      const result = await addTrip({
        trip_date: data.trip_date,
        purpose: data.purpose,
        miles: data.miles,
        mileage_rate: data.mileage_rate,
        notes: data.notes,
        pallet_ids: palletIds,
      });

      if (result.success) {
        toast.success('Trip Logged');
        router.dismiss();
      } else {
        setErrorModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to create mileage trip',
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
          title: 'Log Mileage Trip',
          headerBackTitle: 'Cancel',
          headerStyle: { backgroundColor: colors.backgroundSecondary },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        <MileageForm
          initialValues={{
            pallet_ids: palletId ? [palletId] : [],
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Log Trip"
          currentMileageRate={currentMileageRate}
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
