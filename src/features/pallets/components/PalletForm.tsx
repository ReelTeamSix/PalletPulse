// PalletForm Component - Form for creating and editing pallets
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '@/src/components/ui';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import {
  palletFormSchema,
  PalletFormData,
  getUniqueSuppliers,
  getUniqueSourceNames,
  calculateSalesTaxFromRate,
  getLocalDateString,
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
  const insets = useSafeAreaInsets();
  const [keyboardKey, setKeyboardKey] = useState(0);

  // Force KeyboardAvoidingView to reset when keyboard closes
  useEffect(() => {
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardKey(prev => prev + 1);
    });
    return () => hideSubscription.remove();
  }, []);

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
      purchase_date: pallet?.purchase_date ?? initialValues?.purchase_date ?? getLocalDateString(),
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
      setValue('purchase_date', getLocalDateString(selectedDate));
    }
  };

  const formatDisplayDate = (dateString: string) => {
    // Parse date string as local date (not UTC) to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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
      key={keyboardKey}
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form Card Container */}
        <View style={[styles.formCard, shadows.sm]}>
          {/* Pallet Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="PALLET NAME *"
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
                  label="SUPPLIER"
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
                  label="SOURCE / TYPE"
                  placeholder="e.g., Amazon Monster, Walmart Medium"
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

          {/* Quick-select chips for user's previous source types */}
          {uniqueSourceNames.length > 0 && !watchSourceName && (
            <View style={styles.sourceChipsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourceChipsScroll}
              >
                {uniqueSourceNames.slice(0, 6).map((source) => (
                  <Pressable
                    key={source}
                    style={styles.sourceChip}
                    onPress={() => setValue('source_name', source)}
                  >
                    <Text style={styles.sourceChipText}>{source}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.sourceChipsHint}>Tap to reuse a previous source type</Text>
            </View>
          )}

          {/* Purchase Cost & Sales Tax - Side by Side */}
          <View style={styles.costRow}>
            <View style={styles.costField}>
              <Controller
                control={control}
                name="purchase_cost"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="PURCHASE COST *"
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
            </View>
            <View style={styles.costField}>
              <Controller
                control={control}
                name="sales_tax"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="SALES TAX"
                    placeholder="0.00"
                    value={value !== null && value !== undefined ? value.toString() : ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || null;
                      onChange(num);
                      if (useAutoTax) setUseAutoTax(false);
                    }}
                    onBlur={onBlur}
                    error={errors.sales_tax?.message}
                    keyboardType="decimal-pad"
                    leftIcon="dollar"
                  />
                )}
              />
            </View>
          </View>

          {/* Auto-tax toggle and total */}
          <View style={styles.taxSection}>
            {defaultTaxRate !== null && defaultTaxRate > 0 && (
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
                  {useAutoTax && <Ionicons name="checkmark" size={14} color={colors.background} />}
                </View>
                <Text style={styles.taxToggleText}>
                  Auto-calculate tax ({defaultTaxRate}%)
                </Text>
              </Pressable>
            )}

            {/* Total Cost Display */}
            {(watchPurchaseCost > 0 || (watchSalesTax && watchSalesTax > 0)) && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Cost</Text>
                <Text style={styles.totalValue}>${totalCost.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Purchase Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>PURCHASE DATE *</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {watchPurchaseDate ? formatDisplayDate(watchPurchaseDate) : 'Select date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            </Pressable>
            {errors.purchase_date && (
              <Text style={styles.error}>{errors.purchase_date.message}</Text>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={(() => {
                  if (!watchPurchaseDate) return new Date();
                  const [year, month, day] = watchPurchaseDate.split('-').map(Number);
                  return new Date(year, month - 1, day);
                })()}
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
                label="NOTES"
                placeholder="Add details..."
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
        </View>
      </ScrollView>

      {/* Fixed Footer Buttons */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
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
  sourceChipsContainer: {
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  sourceChipsScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sourceChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sourceChipText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  sourceChipsHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  costRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  costField: {
    flex: 1,
  },
  taxSection: {
    marginBottom: spacing.lg,
  },
  taxToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
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
  },
  totalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
