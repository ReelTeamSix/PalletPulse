import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { useMileageStore } from '@/src/stores/mileage-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { Button, ConfirmationModal } from '@/src/components/ui';
import {
  formatDeduction,
  formatMiles,
  formatMileageRate,
  formatTripPurpose,
  formatDisplayDate,
  getPurposeColor,
} from '@/src/features/mileage';

export default function MileageTripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trips, getTripById, deleteTrip, fetchTrips, isLoading } = useMileageStore();
  const { pallets, getPalletById } = usePalletsStore();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
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
  }, [trips.length, fetchTrips]);

  const trip = useMemo(() => {
    if (!id) return null;
    return getTripById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trips triggers re-fetch
  }, [id, trips, getTripById]);

  const linkedPallets = useMemo(() => {
    if (!trip) return [];
    return trip.pallet_ids
      .map((palletId) => getPalletById(palletId))
      .filter((p) => p !== undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pallets triggers re-fetch
  }, [trip, pallets, getPalletById]);

  const deduction = useMemo(() => {
    if (!trip) return 0;
    return trip.deduction ?? trip.miles * trip.mileage_rate;
  }, [trip]);

  const handleEdit = () => {
    router.push({ pathname: '/mileage/edit', params: { id } });
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!id) return;
    setDeleteModalVisible(false);
    const result = await deleteTrip(id);
    if (result.success) {
      router.back();
    } else {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to delete mileage trip',
      });
    }
  };

  const handlePalletPress = (palletId: string) => {
    router.push(`/pallets/${palletId}`);
  };

  if (!trip) {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip' }} />
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

  const purposeColor = getPurposeColor(trip.purpose);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Trip Details',
          headerRight: () => (
            <Pressable onPress={handleEdit} style={styles.headerButton}>
              <FontAwesome name="edit" size={20} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        {/* Mileage Header */}
        <View style={styles.milesCard}>
          <View style={[styles.purposeIndicator, { backgroundColor: purposeColor }]} />
          <View style={styles.milesContent}>
            <View style={styles.milesRow}>
              <FontAwesome name="road" size={32} color={colors.primary} />
              <View style={styles.milesInfo}>
                <Text style={styles.milesValue}>{formatMiles(trip.miles)}</Text>
                <Text style={styles.milesLabel}>driven</Text>
              </View>
            </View>
            <View style={[styles.purposeBadge, { backgroundColor: purposeColor }]}>
              <Text style={styles.purposeBadgeText}>{formatTripPurpose(trip.purpose)}</Text>
            </View>
          </View>
        </View>

        {/* Deduction Card */}
        <View style={styles.deductionCard}>
          <Text style={styles.deductionLabel}>Tax Deduction</Text>
          <Text style={styles.deductionValue}>{formatDeduction(deduction)}</Text>
          <Text style={styles.deductionFormula}>
            {trip.miles} mi × {formatMileageRate(trip.mileage_rate)} = {formatDeduction(deduction)}
          </Text>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDisplayDate(trip.trip_date)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>IRS Rate</Text>
            <Text style={styles.detailValue}>{formatMileageRate(trip.mileage_rate)}</Text>
          </View>

          {trip.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.detailValueWrap}>{trip.notes}</Text>
            </View>
          )}
        </View>

        {/* Linked Pallets Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Pallets</Text>

          {linkedPallets.length === 0 ? (
            <Text style={styles.noPalletsText}>No pallets linked to this trip</Text>
          ) : (
            linkedPallets.map((pallet) => (
              <Pressable
                key={pallet!.id}
                style={styles.palletRow}
                onPress={() => handlePalletPress(pallet!.id)}
              >
                <FontAwesome name="cube" size={16} color={colors.primary} />
                <View style={styles.palletInfo}>
                  <Text style={styles.palletName}>{pallet!.name}</Text>
                  {pallet!.supplier && (
                    <Text style={styles.palletSupplier}>{pallet!.supplier}</Text>
                  )}
                </View>
                <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
              </Pressable>
            ))
          )}
        </View>

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValueSmall}>
              {new Date(trip.created_at).toLocaleString()}
            </Text>
          </View>
          {trip.updated_at !== trip.created_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Updated</Text>
              <Text style={styles.detailValueSmall}>
                {new Date(trip.updated_at).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <View style={styles.actionSection}>
          <Button
            title="Delete Trip"
            onPress={handleDelete}
            variant="outline"
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        type="delete"
        title="Delete Trip?"
        message={`Are you sure you want to delete this ${formatMiles(trip.miles)} mileage trip? This action cannot be undone.`}
        primaryLabel="Delete Trip"
        secondaryLabel="Cancel"
        onPrimary={handleConfirmDelete}
        onSecondary={() => setDeleteModalVisible(false)}
        onClose={() => setDeleteModalVisible(false)}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
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
  headerButton: {
    padding: spacing.sm,
  },
  milesCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  purposeIndicator: {
    width: 6,
  },
  milesContent: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  milesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  milesInfo: {
    alignItems: 'flex-start',
  },
  milesValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  milesLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  purposeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  purposeBadgeText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: '600',
  },
  deductionCard: {
    backgroundColor: colors.profit + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.profit + '30',
  },
  deductionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  deductionValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.profit,
    marginBottom: spacing.xs,
  },
  deductionFormula: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
  },
  detailValueWrap: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  detailValueSmall: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  noPalletsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  palletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  palletInfo: {
    flex: 1,
  },
  palletName: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  palletSupplier: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actionSection: {
    marginTop: spacing.md,
  },
  deleteButton: {
    borderColor: colors.loss,
  },
});
