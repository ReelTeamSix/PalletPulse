// ExpenseForm Component - Form for creating and editing expenses
// Updated for Phase 8D: Multi-pallet linking and simplified categories
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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '@/src/components/ui';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import {
  expenseFormSchema,
  ExpenseFormData,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_DESCRIPTIONS,
  getLocalDateString,
  formatExpenseAmount,
  parseCurrencyInput,
} from '../schemas/expense-form-schema';
import { Expense, ExpenseCategory } from '@/src/types/database';
import { usePalletsStore } from '@/src/stores/pallets-store';

// Category icons for visual identification
// Note: gas, mileage, fees, shipping are deprecated but included for TypeScript completeness
const CATEGORY_ICONS: Record<ExpenseCategory, keyof typeof Ionicons.glyphMap> = {
  storage: 'home',
  supplies: 'bag',
  subscriptions: 'card',
  equipment: 'build',
  other: 'ellipsis-horizontal',
  // Deprecated categories - kept for type completeness
  gas: 'car',
  mileage: 'speedometer',
  fees: 'receipt',
  shipping: 'cube',
};

interface ExpenseFormProps {
  initialValues?: Partial<ExpenseFormData>;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  expense?: Expense; // For editing
  palletIds?: string[]; // Pre-selected pallets (Phase 8D: multi-pallet support)
  onReceiptPhotoSelect?: () => void; // Callback to open photo picker
  receiptPhotoUri?: string | null; // Current receipt photo
  onReceiptPhotoRemove?: () => void; // Remove receipt photo
}

export function ExpenseForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Expense',
  expense,
  palletIds,
  onReceiptPhotoSelect,
  receiptPhotoUri,
  onReceiptPhotoRemove,
}: ExpenseFormProps) {
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
  const [showPalletPicker, setShowPalletPicker] = useState(false);

  // Text state for amount to allow decimal input
  const [amountText, setAmountText] = useState(
    expense?.amount?.toString() ?? initialValues?.amount?.toString() ?? ''
  );

  const { pallets } = usePalletsStore();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: expense?.amount ?? initialValues?.amount ?? 0,
      category: expense?.category ?? initialValues?.category ?? 'other',
      description: expense?.description ?? initialValues?.description ?? null,
      expense_date: expense?.expense_date ?? initialValues?.expense_date ?? getLocalDateString(),
      // Phase 8D: Multi-pallet support
      pallet_ids: palletIds ?? initialValues?.pallet_ids ?? [],
      pallet_id: expense?.pallet_id ?? null, // Legacy field for backward compat
      receipt_photo_path: expense?.receipt_photo_path ?? initialValues?.receipt_photo_path ?? null,
    } as ExpenseFormData,
  });

  const watchCategory = watch('category');
  const watchExpenseDate = watch('expense_date');
  const rawWatchPalletIds = watch('pallet_ids');
  const watchPalletIds = useMemo(() => rawWatchPalletIds || [], [rawWatchPalletIds]);
  const watchAmount = watch('amount');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setValue('expense_date', getLocalDateString(selectedDate));
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

  // Get linked pallets info (Phase 8D: multi-pallet)
  const linkedPallets = useMemo(() => {
    if (!watchPalletIds || watchPalletIds.length === 0) return [];
    return pallets.filter(p => watchPalletIds.includes(p.id));
  }, [watchPalletIds, pallets]);

  // Toggle pallet selection
  const togglePalletSelection = (palletId: string) => {
    const currentIds = watchPalletIds || [];
    if (currentIds.includes(palletId)) {
      setValue('pallet_ids', currentIds.filter(id => id !== palletId));
    } else {
      setValue('pallet_ids', [...currentIds, palletId]);
    }
  };

  // Clear all pallet selections
  const clearPalletSelection = () => {
    setValue('pallet_ids', []);
  };

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
        {/* Amount */}
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur } }) => (
            <Input
              label="Amount *"
              placeholder="0.00"
              value={amountText}
              onChangeText={(text) => {
                setAmountText(text);
                const num = parseCurrencyInput(text);
                onChange(num);
              }}
              onBlur={onBlur}
              error={errors.amount?.message}
              keyboardType="decimal-pad"
              leftIcon="dollar"
            />
          )}
        />

        {/* Category Selection (Chips) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {EXPENSE_CATEGORIES.map((category) => {
              const isSelected = watchCategory === category;
              const categoryColor = EXPENSE_CATEGORY_COLORS[category];
              return (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryChip,
                    isSelected && { backgroundColor: categoryColor, borderColor: categoryColor },
                  ]}
                  onPress={() => setValue('category', category)}
                >
                  <Ionicons
                    name={CATEGORY_ICONS[category]}
                    size={14}
                    color={isSelected ? colors.background : colors.textSecondary}
                    style={styles.categoryChipIcon}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {EXPENSE_CATEGORY_LABELS[category]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {/* Category description hint */}
          <Text style={styles.categoryHint}>
            {EXPENSE_CATEGORY_DESCRIPTIONS[watchCategory]}
          </Text>
          {errors.category && (
            <Text style={styles.error}>{errors.category.message}</Text>
          )}
        </View>

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Description"
              placeholder="What was this expense for?"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
              numberOfLines={3}
              inputStyle={styles.descriptionInput}
            />
          )}
        />

        {/* Expense Date */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Expense Date *</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={18} color={colors.textSecondary} style={styles.dateIcon} />
            <Text style={styles.dateText}>
              {watchExpenseDate ? formatDisplayDate(watchExpenseDate) : 'Select date'}
            </Text>
          </Pressable>
          {errors.expense_date && (
            <Text style={styles.error}>{errors.expense_date.message}</Text>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={(() => {
                if (!watchExpenseDate) return new Date();
                const [year, month, day] = watchExpenseDate.split('-').map(Number);
                return new Date(year, month - 1, day);
              })()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Link to Pallets (Optional) - Phase 8D: Multi-pallet support */}
        <View style={styles.fieldContainer}>
          <View style={styles.palletLabelRow}>
            <Text style={styles.label}>Link to Pallets (Optional)</Text>
            {linkedPallets.length > 0 && (
              <Pressable onPress={clearPalletSelection}>
                <Text style={styles.clearLink}>Clear All</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            style={styles.palletButton}
            onPress={() => setShowPalletPicker(!showPalletPicker)}
          >
            <Ionicons
              name="layers"
              size={18}
              color={linkedPallets.length > 0 ? colors.primary : colors.textSecondary}
              style={styles.palletIcon}
            />
            <Text style={[styles.palletText, linkedPallets.length > 0 && styles.palletTextSelected]}>
              {linkedPallets.length === 0
                ? 'No pallets linked'
                : linkedPallets.length === 1
                  ? linkedPallets[0].name
                  : `${linkedPallets.length} pallets selected`}
            </Text>
            <Ionicons
              name={showPalletPicker ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textSecondary}
            />
          </Pressable>

          {/* Selected pallets chips */}
          {linkedPallets.length > 1 && (
            <View style={styles.selectedPalletsRow}>
              {linkedPallets.map((pallet) => (
                <View key={pallet.id} style={styles.selectedPalletChip}>
                  <Text style={styles.selectedPalletChipText}>{pallet.name}</Text>
                  <Pressable onPress={() => togglePalletSelection(pallet.id)}>
                    <Ionicons name="close" size={14} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {showPalletPicker && (
            <View style={styles.palletList}>
              {pallets.length === 0 ? (
                <View style={styles.emptyPalletList}>
                  <Text style={styles.emptyPalletText}>No pallets available</Text>
                </View>
              ) : (
                pallets.map((pallet) => {
                  const isSelected = watchPalletIds.includes(pallet.id);
                  return (
                    <Pressable
                      key={pallet.id}
                      style={styles.palletOption}
                      onPress={() => togglePalletSelection(pallet.id)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={12} color={colors.background} />
                        )}
                      </View>
                      <View style={styles.palletOptionContent}>
                        <Text style={[styles.palletOptionText, isSelected && styles.palletOptionTextSelected]}>
                          {pallet.name}
                        </Text>
                        {pallet.supplier && (
                          <Text style={styles.palletOptionSubtext}>{pallet.supplier}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          )}
          <Text style={styles.hint}>
            Link this expense to one or more pallets to split the cost in profit calculations
          </Text>
        </View>

        {/* Receipt Photo */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Receipt Photo (Optional)</Text>
          {receiptPhotoUri ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receiptPhotoUri }} style={styles.receiptImage} />
              <Pressable
                style={styles.removeReceiptButton}
                onPress={onReceiptPhotoRemove}
              >
                <Ionicons name="close-circle" size={24} color={colors.loss} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addReceiptButton}
              onPress={onReceiptPhotoSelect}
            >
              <Ionicons name="camera" size={24} color={colors.textSecondary} />
              <Text style={styles.addReceiptText}>Add Receipt Photo</Text>
              <Text style={styles.addReceiptHint}>PNG, JPG up to 10MB</Text>
            </Pressable>
          )}
        </View>

        {/* Summary */}
        {watchAmount > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryValue}>{formatExpenseAmount(watchAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Category:</Text>
              <View style={[styles.categoryBadge, { backgroundColor: EXPENSE_CATEGORY_COLORS[watchCategory] }]}>
                <Text style={styles.categoryBadgeText}>{EXPENSE_CATEGORY_LABELS[watchCategory]}</Text>
              </View>
            </View>
            {linkedPallets.length > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Linked to:</Text>
                <Text style={styles.summaryPallet}>
                  {linkedPallets.length === 1
                    ? linkedPallets[0].name
                    : `${linkedPallets.length} pallets`}
                </Text>
              </View>
            )}
            {linkedPallets.length > 1 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cost split:</Text>
                <Text style={styles.summarySplitAmount}>
                  {formatExpenseAmount(watchAmount / linkedPallets.length)} each
                </Text>
              </View>
            )}
          </View>
        )}

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
          onPress={handleSubmit((data) => onSubmit(data as ExpenseFormData))}
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
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  error: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.loss,
    marginTop: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipIcon: {
    marginRight: spacing.xs,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  categoryChipTextSelected: {
    color: colors.background,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    flex: 1,
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
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    flex: 1,
  },
  palletTextSelected: {
    color: colors.textPrimary,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
  palletList: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    maxHeight: 200,
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
    flex: 1,
  },
  palletOptionText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  palletOptionTextSelected: {
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  palletOptionSubtext: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  receiptPreview: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  removeReceiptButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
  },
  addReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  addReceiptText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  addReceiptHint: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  summaryPallet: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
  summarySplitAmount: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  // Phase 8D: Multi-pallet styles
  palletLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  clearLink: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.primary,
  },
  selectedPalletsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  selectedPalletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  selectedPalletChipText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyPalletList: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyPalletText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  categoryHint: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
