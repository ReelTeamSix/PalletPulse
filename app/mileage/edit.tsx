import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize } from '@/src/constants/spacing';
import { useMileageStore } from '@/src/stores/mileage-store';
import { MileageForm, MileageFormData } from '@/src/features/mileage';
import { ConfirmationModal } from '@/src/components/ui';

export default function EditMileageTripScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    trips,
    getTripById,
    updateTrip,
    isLoading,
    fetchTrips,
    currentMileageRate,
  } = useMileageStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Fetch trips if not loaded
  useEffect(() => {
    if (trips.length === 0) {
      fetchTrips();
    }
  }, []);

  const trip = useMemo(() => {
    if (!id) return null;
    return getTripById(id);
  }, [id, trips]);

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (data: MileageFormData) => {
    if (!id || !trip) return;

    setIsSubmitting(true);
    try {
      const result = await updateTrip(id, {
        trip_date: data.trip_date,
        purpose: data.purpose,
        miles: data.miles,
        mileage_rate: data.mileage_rate,
        notes: data.notes,
        pallet_ids: data.pallet_ids || [],
      });

      if (result.success) {
        router.back();
      } else {
        setErrorModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to update mileage trip',
        });
      }
    } catch (error) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!trip) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Trip' }} />
        <View style={styles.centered}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={styles.notFoundText}>Trip not found</Text>
          )}
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Trip',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <MileageForm
          trip={trip}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting || isLoading}
          submitLabel="Save Changes"
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
