import { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/constants/colors';
import { useMileageStore } from '@/src/stores/mileage-store';
import { MileageForm, MileageFormData } from '@/src/features/mileage';

export default function NewMileageTripScreen() {
  const { palletId } = useLocalSearchParams<{ palletId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addTrip, isLoading, fetchCurrentMileageRate, currentMileageRate } = useMileageStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        router.dismiss();
      } else {
        Alert.alert('Error', result.error || 'Failed to create mileage trip');
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
          title: 'Log Mileage Trip',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
