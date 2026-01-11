// PalletForm Component - Form for creating and editing pallets
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input, Button } from '@/src/components/ui';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import {
  palletFormSchema,
  PalletFormData,
  defaultPalletFormValues,
  SOURCE_TYPE_OPTIONS,
  SUPPLIER_SUGGESTIONS,
} from '../schemas/pallet-form-schema';
import { Pallet } from '@/src/types/database';

interface PalletFormProps {
  initialValues?: Partial<PalletFormData>;
  onSubmit: (data: PalletFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  pallet?: Pallet; // For editing
}

export function PalletForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Pallet',
  pallet,
}: PalletFormProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(palletFormSchema),
    defaultValues: {
      name: pallet?.name ?? initialValues?.name ?? '',
      supplier: pallet?.supplier ?? initialValues?.supplier ?? null,
      source_type: pallet?.source_type ?? initialValues?.source_type ?? 'pallet',
      purchase_cost: pallet?.purchase_cost ?? initialValues?.purchase_cost ?? 0,
      sales_tax: pallet?.sales_tax ?? initialValues?.sales_tax ?? null,
      purchase_date: pallet?.purchase_date ?? initialValues?.purchase_date ?? new Date().toISOString().split('T')[0],
      status: pallet?.status ?? initialValues?.status ?? 'unprocessed',
      notes: pallet?.notes ?? initialValues?.notes ?? null,
    } as PalletFormData,
  });

  const watchSupplier = watch('supplier');
  const watchPurchaseDate = watch('purchase_date');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setValue('purchase_date', selectedDate.toISOString().split('T')[0]);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredSupplierSuggestions = SUPPLIER_SUGGESTIONS.filter(
    (s) => !watchSupplier || s.toLowerCase().includes(watchSupplier.toLowerCase())
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Pallet Name */}
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Pallet Name *"
            placeholder="e.g., Pallet #1, Amazon Monster"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            autoCapitalize="words"
          />
        )}
      />

      {/* Supplier with suggestions */}
      <View style={styles.supplierContainer}>
        <Controller
          control={control}
          name="supplier"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Supplier"
              placeholder="e.g., GRPL, Liquidation Land"
              value={value || ''}
              onChangeText={(text) => {
                onChange(text);
                setShowSupplierSuggestions(true);
              }}
              onBlur={() => {
                onBlur();
                setTimeout(() => setShowSupplierSuggestions(false), 200);
              }}
              onFocus={() => setShowSupplierSuggestions(true)}
              error={errors.supplier?.message}
              autoCapitalize="words"
            />
          )}
        />
        {showSupplierSuggestions && filteredSupplierSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {filteredSupplierSuggestions.slice(0, 4).map((suggestion) => (
              <Pressable
                key={suggestion}
                style={styles.suggestionItem}
                onPress={() => {
                  setValue('supplier', suggestion);
                  setShowSupplierSuggestions(false);
                }}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Source Type */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Source Type</Text>
        <Controller
          control={control}
          name="source_type"
          render={({ field: { onChange, value } }) => (
            <View style={styles.optionsRow}>
              {SOURCE_TYPE_OPTIONS.slice(0, 3).map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    value === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => onChange(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />
        {errors.source_type && (
          <Text style={styles.error}>{errors.source_type.message}</Text>
        )}
      </View>

      {/* Purchase Cost */}
      <Controller
        control={control}
        name="purchase_cost"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Purchase Cost *"
            placeholder="0.00"
            value={value > 0 ? value.toString() : ''}
            onChangeText={(text) => {
              const num = parseFloat(text) || 0;
              onChange(num);
            }}
            onBlur={onBlur}
            error={errors.purchase_cost?.message}
            keyboardType="decimal-pad"
            leftIcon="dollar"
          />
        )}
      />

      {/* Sales Tax */}
      <Controller
        control={control}
        name="sales_tax"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Sales Tax"
            placeholder="0.00"
            value={value ? value.toString() : ''}
            onChangeText={(text) => {
              const num = parseFloat(text) || null;
              onChange(num);
            }}
            onBlur={onBlur}
            error={errors.sales_tax?.message}
            keyboardType="decimal-pad"
            leftIcon="dollar"
            hint="Optional - for expense tracking"
          />
        )}
      />

      {/* Purchase Date */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Purchase Date *</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            {watchPurchaseDate ? formatDisplayDate(watchPurchaseDate) : 'Select date'}
          </Text>
        </Pressable>
        {errors.purchase_date && (
          <Text style={styles.error}>{errors.purchase_date.message}</Text>
        )}
        {showDatePicker && (
          <DateTimePicker
            value={watchPurchaseDate ? new Date(watchPurchaseDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      {/* Notes */}
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Notes"
            placeholder="Optional notes about this pallet..."
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

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <Button
          title="Cancel"
          onPress={onCancel}
          variant="outline"
          style={styles.cancelButton}
          disabled={isLoading}
        />
        <Button
          title={submitLabel}
          onPress={handleSubmit((data) => onSubmit(data as PalletFormData))}
          style={styles.submitButton}
          loading={isLoading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  supplierContainer: {
    position: 'relative',
    zIndex: 10,
  },
  suggestions: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 20,
  },
  suggestionItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: colors.background,
  },
  dateButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.loss,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
