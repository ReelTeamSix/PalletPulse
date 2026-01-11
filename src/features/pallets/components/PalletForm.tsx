// PalletForm Component - Form for creating and editing pallets
import React, { useState, useMemo } from 'react';
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
import { Input, Button } from '@/src/components/ui';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import {
  palletFormSchema,
  PalletFormData,
  getUniqueSuppliers,
  getUniqueSourceNames,
  calculateSalesTaxFromRate,
} from '../schemas/pallet-form-schema';
import { Pallet } from '@/src/types/database';
import { usePalletsStore } from '@/src/stores/pallets-store';

interface PalletFormProps {
  initialValues?: Partial<PalletFormData>;
  onSubmit: (data: PalletFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  pallet?: Pallet; // For editing
  defaultTaxRate?: number | null; // User's default tax rate
}

export function PalletForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Pallet',
  pallet,
  defaultTaxRate = null,
}: PalletFormProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [useAutoTax, setUseAutoTax] = useState(defaultTaxRate !== null && defaultTaxRate > 0);

  const { pallets } = usePalletsStore();

  // Get unique values from existing pallets for autocomplete
  const uniqueSuppliers = useMemo(() => getUniqueSuppliers(pallets), [pallets]);
  const uniqueSourceNames = useMemo(() => getUniqueSourceNames(pallets), [pallets]);

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
      source_name: pallet?.source_name ?? initialValues?.source_name ?? null,
      purchase_cost: pallet?.purchase_cost ?? initialValues?.purchase_cost ?? 0,
      sales_tax: pallet?.sales_tax ?? initialValues?.sales_tax ?? null,
      purchase_date: pallet?.purchase_date ?? initialValues?.purchase_date ?? new Date().toISOString().split('T')[0],
      status: pallet?.status ?? initialValues?.status ?? 'unprocessed',
      notes: pallet?.notes ?? initialValues?.notes ?? null,
    } as PalletFormData,
  });

  const watchSupplier = watch('supplier');
  const watchSourceName = watch('source_name');
  const watchPurchaseDate = watch('purchase_date');
  const watchPurchaseCost = watch('purchase_cost');
  const watchSalesTax = watch('sales_tax');

  // Auto-calculate tax when enabled and purchase cost changes
  const handlePurchaseCostChange = (value: number) => {
    setValue('purchase_cost', value);
    if (useAutoTax && defaultTaxRate && defaultTaxRate > 0) {
      const calculatedTax = calculateSalesTaxFromRate(value, defaultTaxRate);
      setValue('sales_tax', calculatedTax);
    }
  };

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

  // Filter suggestions based on current input
  const filteredSupplierSuggestions = uniqueSuppliers.filter(
    (s) => !watchSupplier || s.toLowerCase().includes(watchSupplier.toLowerCase())
  );

  const filteredSourceSuggestions = uniqueSourceNames.filter(
    (s) => !watchSourceName || s.toLowerCase().includes(watchSourceName.toLowerCase())
  );

  // Calculate total cost for display
  const totalCost = watchPurchaseCost + (watchSalesTax || 0);

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
      {/* Pallet Name */}
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Pallet Name *"
            placeholder="e.g., Pallet #1, Amazon Monster Pallet"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            autoCapitalize="words"
          />
        )}
      />

      {/* Supplier with autocomplete from history */}
      <View style={[styles.autocompleteContainer, { zIndex: 20 }]}>
        <Controller
          control={control}
          name="supplier"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Supplier"
              placeholder="e.g., GRPL, Liquidation Land, B-Stock"
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

      {/* Source/Type with autocomplete from history */}
      <View style={[styles.autocompleteContainer, { zIndex: 10 }]}>
        <Controller
          control={control}
          name="source_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Source / Type"
              placeholder="e.g., Amazon Monster, Walmart Medium, Target Returns"
              value={value || ''}
              onChangeText={(text) => {
                onChange(text);
                setShowSourceSuggestions(true);
              }}
              onBlur={() => {
                onBlur();
                setTimeout(() => setShowSourceSuggestions(false), 200);
              }}
              onFocus={() => setShowSourceSuggestions(true)}
              error={errors.source_name?.message}
              autoCapitalize="words"
              hint="Describe the type of pallet (builds autocomplete over time)"
            />
          )}
        />
        {showSourceSuggestions && filteredSourceSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {filteredSourceSuggestions.slice(0, 4).map((suggestion) => (
              <Pressable
                key={suggestion}
                style={styles.suggestionItem}
                onPress={() => {
                  setValue('source_name', suggestion);
                  setShowSourceSuggestions(false);
                }}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
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
              handlePurchaseCostChange(num);
            }}
            onBlur={onBlur}
            error={errors.purchase_cost?.message}
            keyboardType="decimal-pad"
            leftIcon="dollar"
          />
        )}
      />

      {/* Sales Tax Section */}
      <View style={styles.taxSection}>
        {defaultTaxRate !== null && defaultTaxRate > 0 && (
          <View style={styles.taxToggleRow}>
            <Pressable
              style={styles.taxToggle}
              onPress={() => {
                setUseAutoTax(!useAutoTax);
                if (!useAutoTax && watchPurchaseCost > 0) {
                  const calculatedTax = calculateSalesTaxFromRate(watchPurchaseCost, defaultTaxRate);
                  setValue('sales_tax', calculatedTax);
                }
              }}
            >
              <View style={[styles.checkbox, useAutoTax && styles.checkboxChecked]}>
                {useAutoTax && <Text style={styles.checkmark}>{"✓"}</Text>}
              </View>
              <Text style={styles.taxToggleText}>
                Auto-calculate ({defaultTaxRate}% rate)
              </Text>
            </Pressable>
          </View>
        )}

        <Controller
          control={control}
          name="sales_tax"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Sales Tax"
              placeholder="0.00"
              value={value !== null && value !== undefined ? value.toString() : ''}
              onChangeText={(text) => {
                const num = parseFloat(text) || null;
                onChange(num);
                // Disable auto-tax if user manually edits
                if (useAutoTax) setUseAutoTax(false);
              }}
              onBlur={onBlur}
              error={errors.sales_tax?.message}
              keyboardType="decimal-pad"
              leftIcon="dollar"
              hint={defaultTaxRate === null || defaultTaxRate === 0
                ? "Leave blank if tax exempt"
                : useAutoTax
                  ? "Auto-calculated from your default rate"
                  : "Leave blank if tax exempt"
              }
            />
          )}
        />

        {/* Total Cost Display */}
        {(watchPurchaseCost > 0 || (watchSalesTax && watchSalesTax > 0)) && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Cost:</Text>
            <Text style={styles.totalValue}>${totalCost.toFixed(2)}</Text>
          </View>
        )}
      </View>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2, // Extra padding so buttons can scroll above keyboard
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
  autocompleteContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  suggestions: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
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
  taxSection: {
    marginBottom: spacing.md,
  },
  taxToggleRow: {
    marginBottom: spacing.sm,
  },
  taxToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  taxToggleText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
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
