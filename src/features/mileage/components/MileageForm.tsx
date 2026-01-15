// MileageForm Component - Form for creating and editing mileage trips
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome } from '@expo/vector-icons';
import { Input, Button } from '@/src/components/ui';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import {
  mileageFormSchema,
  MileageFormData,
  TRIP_PURPOSE_OPTIONS,
  DEFAULT_IRS_MILEAGE_RATE,
  getLocalDateString,
  calculateDeduction,
  formatDeduction,
  formatMiles,
  formatMileageRate,
  formatTripPurpose,
  getPurposeColor,
} from '../schemas/mileage-form-schema';
import { MileageTrip, TripPurpose } from '@/src/types/database';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { MileageTripWithPallets } from '@/src/stores/mileage-store';

interface MileageFormProps {
  initialValues?: Partial<MileageFormData>;
  onSubmit: (data: MileageFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  trip?: MileageTripWithPallets; // For editing
  currentMileageRate?: number; // Current IRS rate from app_settings
}

export function MileageForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Trip',
  trip,
  currentMileageRate = DEFAULT_IRS_MILEAGE_RATE,
}: MileageFormProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPurposePicker, setShowPurposePicker] = useState(false);
  const [showPalletPicker, setShowPalletPicker] = useState(false);

  // Text state for miles to allow decimal input
  const [milesText, setMilesText] = useState(
    trip?.miles?.toString() ?? initialValues?.miles?.toString() ?? ''
  );

  const { pallets } = usePalletsStore();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(mileageFormSchema),
    defaultValues: {
      trip_date: trip?.trip_date ?? initialValues?.trip_date ?? getLocalDateString(),
      purpose: trip?.purpose ?? initialValues?.purpose ?? 'pallet_pickup',
      miles: trip?.miles ?? initialValues?.miles ?? 0,
      mileage_rate: trip?.mileage_rate ?? initialValues?.mileage_rate ?? currentMileageRate,
      pallet_ids: trip?.pallet_ids ?? initialValues?.pallet_ids ?? [],
      notes: trip?.notes ?? initialValues?.notes ?? null,
    } as MileageFormData,
  });

  const watchPurpose = watch('purpose');
  const watchTripDate = watch('trip_date');
  const watchMiles = watch('miles');
  const watchMileageRate = watch('mileage_rate');
  const watchPalletIds = watch('pallet_ids') || [];

  // Calculate deduction preview
  const deduction = useMemo(
    () => calculateDeduction(watchMiles, watchMileageRate),
    [watchMiles, watchMileageRate]
  );

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setValue('trip_date', getLocalDateString(selectedDate));
    }
  };

  const formatDisplayDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get linked pallets info
  const linkedPallets = useMemo(() => {
    return pallets.filter((p) => watchPalletIds.includes(p.id));
  }, [watchPalletIds, pallets]);

  // Toggle pallet selection
  const togglePallet = (palletId: string) => {
    const currentIds = watchPalletIds || [];
    if (currentIds.includes(palletId)) {
      setValue(
        'pallet_ids',
        currentIds.filter((id) => id !== palletId)
      );
    } else {
      setValue('pallet_ids', [...currentIds, palletId]);
    }
  };

  // Parse miles input
  const parseMilesInput = (text: string): number => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 10) / 10; // Round to 1 decimal
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Trip Date */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Trip Date *</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <FontAwesome
              name="calendar"
              size={16}
              color={colors.textSecondary}
              style={styles.dateIcon}
            />
            <Text style={styles.dateText}>
              {watchTripDate ? formatDisplayDate(watchTripDate) : 'Select date'}
            </Text>
          </Pressable>
          {errors.trip_date && (
            <Text style={styles.error}>{errors.trip_date.message}</Text>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={(() => {
                if (!watchTripDate) return new Date();
                const [year, month, day] = watchTripDate.split('-').map(Number);
                return new Date(year, month - 1, day);
              })()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Purpose Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Trip Purpose *</Text>
          <Pressable
            style={styles.purposeButton}
            onPress={() => setShowPurposePicker(!showPurposePicker)}
          >
            <View
              style={[
                styles.purposeDot,
                { backgroundColor: getPurposeColor(watchPurpose) },
              ]}
            />
            <Text style={styles.purposeText}>
              {formatTripPurpose(watchPurpose)}
            </Text>
            <FontAwesome
              name={showPurposePicker ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textSecondary}
            />
          </Pressable>

          {showPurposePicker && (
            <ScrollView style={styles.purposeList} nestedScrollEnabled>
              {TRIP_PURPOSE_OPTIONS.map((option) => {
                const isSelected = watchPurpose === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={styles.purposeOption}
                    onPress={() => {
                      setValue('purpose', option.value);
                      setShowPurposePicker(false);
                    }}
                  >
                    <View style={styles.purposeOptionContent}>
                      <View
                        style={[
                          styles.purposeDot,
                          { backgroundColor: getPurposeColor(option.value) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.purposeOptionText,
                          isSelected && styles.purposeOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <FontAwesome name="check" size={14} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {errors.purpose && (
            <Text style={styles.error}>{errors.purpose.message}</Text>
          )}
        </View>

        {/* Miles */}
        <Controller
          control={control}
          name="miles"
          render={({ field: { onChange, onBlur } }) => (
            <Input
              label="Miles Driven *"
              placeholder="0"
              value={milesText}
              onChangeText={(text) => {
                setMilesText(text);
                const num = parseMilesInput(text);
                onChange(num);
              }}
              onBlur={onBlur}
              error={errors.miles?.message}
              keyboardType="decimal-pad"
              rightIcon="road"
            />
          )}
        />

        {/* IRS Rate Display */}
        <View style={styles.rateCard}>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>IRS Mileage Rate</Text>
            <Text style={styles.rateValue}>{formatMileageRate(watchMileageRate)}</Text>
          </View>
          <Text style={styles.rateHint}>
            Standard rate for {new Date().getFullYear()}. This rate is locked when you save the trip.
          </Text>
        </View>

        {/* Link to Pallets (Multi-select) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Link to Pallets (Optional)</Text>
          <Pressable
            style={styles.palletButton}
            onPress={() => setShowPalletPicker(!showPalletPicker)}
          >
            <FontAwesome
              name="cubes"
              size={16}
              color={linkedPallets.length > 0 ? colors.primary : colors.textSecondary}
              style={styles.palletIcon}
            />
            <Text
              style={[
                styles.palletText,
                linkedPallets.length > 0 && styles.palletTextSelected,
              ]}
            >
              {linkedPallets.length === 0
                ? 'No pallets linked'
                : linkedPallets.length === 1
                ? linkedPallets[0].name
                : `${linkedPallets.length} pallets linked`}
            </Text>
            <FontAwesome
              name={showPalletPicker ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textSecondary}
            />
          </Pressable>

          {/* Selected pallets tags */}
          {linkedPallets.length > 0 && !showPalletPicker && (
            <View style={styles.selectedPallets}>
              {linkedPallets.map((pallet) => (
                <View key={pallet.id} style={styles.palletTag}>
                  <Text style={styles.palletTagText} numberOfLines={1}>
                    {pallet.name}
                  </Text>
                  <Pressable
                    onPress={() => togglePallet(pallet.id)}
                    hitSlop={8}
                  >
                    <FontAwesome name="times" size={12} color={colors.background} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {showPalletPicker && (
            <ScrollView style={styles.palletList} nestedScrollEnabled>
              {pallets.length === 0 ? (
                <View style={styles.emptyPallets}>
                  <Text style={styles.emptyPalletsText}>No pallets available</Text>
                </View>
              ) : (
                pallets.map((pallet) => {
                  const isSelected = watchPalletIds.includes(pallet.id);
                  return (
                    <Pressable
                      key={pallet.id}
                      style={styles.palletOption}
                      onPress={() => togglePallet(pallet.id)}
                    >
                      <View style={styles.palletOptionContent}>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected,
                          ]}
                        >
                          {isSelected && (
                            <FontAwesome name="check" size={10} color={colors.background} />
                          )}
                        </View>
                        <View style={styles.palletOptionInfo}>
                          <Text
                            style={[
                              styles.palletOptionText,
                              isSelected && styles.palletOptionTextSelected,
                            ]}
                          >
                            {pallet.name}
                          </Text>
                          {pallet.supplier && (
                            <Text style={styles.palletOptionSubtext}>
                              {pallet.supplier}
                            </Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          )}
          <Text style={styles.hint}>
            Link this trip to pallets to track mileage costs per pallet
          </Text>
        </View>

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Notes"
              placeholder="Optional trip notes..."
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.notes?.message}
              multiline
              numberOfLines={3}
              inputStyle={styles.notesInput}
            />
          )}
        />

        {/* Deduction Summary */}
        {watchMiles > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <FontAwesome name="car" size={20} color={colors.primary} />
              <Text style={styles.summaryTitle}>Trip Summary</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Distance:</Text>
              <Text style={styles.summaryValue}>{formatMiles(watchMiles)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rate:</Text>
              <Text style={styles.summaryValue}>{formatMileageRate(watchMileageRate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Purpose:</Text>
              <View
                style={[
                  styles.purposeBadge,
                  { backgroundColor: getPurposeColor(watchPurpose) },
                ]}
              >
                <Text style={styles.purposeBadgeText}>
                  {formatTripPurpose(watchPurpose)}
                </Text>
              </View>
            </View>
            {linkedPallets.length > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Linked to:</Text>
                <Text style={styles.summaryPallet}>
                  {linkedPallets.map((p) => p.name).join(', ')}
                </Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.deductionLabel}>Tax Deduction:</Text>
              <Text style={styles.deductionValue}>{formatDeduction(deduction)}</Text>
            </View>
            <Text style={styles.deductionFormula}>
              {watchMiles} mi × {formatMileageRate(watchMileageRate)} = {formatDeduction(deduction)}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Fixed Footer Buttons */}
      <View style={styles.footer}>
        <Button
          title="Cancel"
          onPress={onCancel}
          variant="outline"
          style={styles.cancelButton}
          disabled={isLoading}
        />
        <Button
          title={submitLabel}
          onPress={handleSubmit((data) => onSubmit(data as MileageFormData))}
          style={styles.submitButton}
          loading={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.loss,
    marginTop: spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  dateIcon: {
    marginRight: spacing.sm,
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    flex: 1,
  },
  purposeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  purposeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  purposeText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    flex: 1,
  },
  purposeList: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    maxHeight: 250,
  },
  purposeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  purposeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  purposeOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  purposeOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  rateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  rateValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  rateHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  palletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  palletIcon: {
    marginRight: spacing.sm,
  },
  palletText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    flex: 1,
  },
  palletTextSelected: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  selectedPallets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  palletTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    maxWidth: 150,
  },
  palletTagText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: '500',
    flex: 1,
  },
  palletList: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    maxHeight: 200,
  },
  emptyPallets: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyPalletsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  palletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  palletOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  palletOptionInfo: {
    flex: 1,
  },
  palletOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  palletOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  palletOptionSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  purposeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  purposeBadgeText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '600',
  },
  summaryPallet: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  deductionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deductionValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.profit,
  },
  deductionFormula: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
