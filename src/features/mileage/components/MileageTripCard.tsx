// MileageTripCard Component - Displays a mileage trip summary in a list
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { MileageTripWithPallets } from '@/src/stores/mileage-store';
import {
  formatDeduction,
  formatMiles,
  formatTripPurpose,
  formatDisplayDate,
  getPurposeColor,
} from '../schemas/mileage-form-schema';

interface MileageTripCardProps {
  trip: MileageTripWithPallets;
  onPress: () => void;
  palletNames?: string[]; // Pre-fetched pallet names for display
}

export function MileageTripCard({
  trip,
  onPress,
  palletNames = [],
}: MileageTripCardProps) {
  const purposeColor = getPurposeColor(trip.purpose);
  const deduction = trip.deduction ?? trip.miles * trip.mileage_rate;

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.dateRow}>
          <FontAwesome name="calendar" size={12} color={colors.textSecondary} />
          <Text style={styles.dateText}>{formatDisplayDate(trip.trip_date)}</Text>
        </View>
        <View style={[styles.purposeBadge, { backgroundColor: purposeColor }]}>
          <Text style={styles.purposeText}>{formatTripPurpose(trip.purpose)}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.milesSection}>
          <FontAwesome name="road" size={24} color={colors.primary} />
          <View style={styles.milesInfo}>
            <Text style={styles.milesValue}>{formatMiles(trip.miles)}</Text>
            <Text style={styles.milesLabel}>driven</Text>
          </View>
        </View>

        <View style={styles.deductionSection}>
          <Text style={styles.deductionLabel}>Deduction</Text>
          <Text style={styles.deductionValue}>{formatDeduction(deduction)}</Text>
        </View>
      </View>

      {/* Linked pallets */}
      {palletNames.length > 0 && (
        <View style={styles.palletsRow}>
          <FontAwesome name="cubes" size={12} color={colors.textSecondary} />
          <Text style={styles.palletsText} numberOfLines={1}>
            {palletNames.join(', ')}
          </Text>
        </View>
      )}

      {/* Notes preview */}
      {trip.notes && (
        <View style={styles.notesRow}>
          <FontAwesome name="sticky-note-o" size={12} color={colors.textSecondary} />
          <Text style={styles.notesText} numberOfLines={1}>
            {trip.notes}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  purposeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  purposeText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  milesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  milesInfo: {
    alignItems: 'flex-start',
  },
  milesValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  milesLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  deductionSection: {
    alignItems: 'flex-end',
  },
  deductionLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  deductionValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
    color: colors.profit,
  },
  palletsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  palletsText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.primary,
    flex: 1,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
});
