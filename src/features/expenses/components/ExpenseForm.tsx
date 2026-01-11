// ExpenseForm Component - Form for creating and editing expenses
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome } from '@expo/vector-icons';
import { Input, Button } from '@/src/components/ui';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import {
  expenseFormSchema,
  ExpenseFormData,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  getLocalDateString,
  formatExpenseAmount,
  parseCurrencyInput,
} from '../schemas/expense-form-schema';
import { Expense, ExpenseCategory } from '@/src/types/database';
import { usePalletsStore } from '@/src/stores/pallets-store';

interface ExpenseFormProps {
  initialValues?: Partial<ExpenseFormData>;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  expense?: Expense; // For editing
  palletId?: string | null; // Pre-selected pallet
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
  palletId,
  onReceiptPhotoSelect,
  receiptPhotoUri,
  onReceiptPhotoRemove,
}: ExpenseFormProps) {
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
      pallet_id: expense?.pallet_id ?? palletId ?? initialValues?.pallet_id ?? null,
      receipt_photo_path: expense?.receipt_photo_path ?? initialValues?.receipt_photo_path ?? null,
    } as ExpenseFormData,
  });

  const watchCategory = watch('category');
  const watchExpenseDate = watch('expense_date');
  const watchPalletId = watch('pallet_id');
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

  // Get linked pallet info
  const linkedPallet = useMemo(() => {
    if (!watchPalletId) return null;
    return pallets.find(p => p.id === watchPalletId);
  }, [watchPalletId, pallets]);

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
            <FontAwesome name="calendar" size={16} color={colors.textSecondary} style={styles.dateIcon} />
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

        {/* Link to Pallet (Optional) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Link to Pallet (Optional)</Text>
          <Pressable
            style={styles.palletButton}
            onPress={() => setShowPalletPicker(!showPalletPicker)}
          >
            <FontAwesome
              name="cube"
              size={16}
              color={linkedPallet ? colors.primary : colors.textSecondary}
              style={styles.palletIcon}
            />
            <Text style={[styles.palletText, linkedPallet && styles.palletTextSelected]}>
              {linkedPallet ? linkedPallet.name : 'No pallet linked'}
            </Text>
            <FontAwesome
              name={showPalletPicker ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textSecondary}
            />
          </Pressable>

          {showPalletPicker && (
            <View style={styles.palletList}>
              <Pressable
                style={styles.palletOption}
                onPress={() => {
                  setValue('pallet_id', null);
                  setShowPalletPicker(false);
                }}
              >
                <Text style={[styles.palletOptionText, !watchPalletId && styles.palletOptionTextSelected]}>
                  No pallet linked
                </Text>
                {!watchPalletId && (
                  <FontAwesome name="check" size={14} color={colors.primary} />
                )}
              </Pressable>
              {pallets.map((pallet) => (
                <Pressable
                  key={pallet.id}
                  style={styles.palletOption}
                  onPress={() => {
                    setValue('pallet_id', pallet.id);
                    setShowPalletPicker(false);
                  }}
                >
                  <View style={styles.palletOptionContent}>
                    <Text style={[styles.palletOptionText, watchPalletId === pallet.id && styles.palletOptionTextSelected]}>
                      {pallet.name}
                    </Text>
                    {pallet.supplier && (
                      <Text style={styles.palletOptionSubtext}>{pallet.supplier}</Text>
                    )}
                  </View>
                  {watchPalletId === pallet.id && (
                    <FontAwesome name="check" size={14} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
          <Text style={styles.hint}>
            Link this expense to a specific pallet to include it in that pallet's profit calculation
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
                <FontAwesome name="times-circle" size={24} color={colors.loss} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addReceiptButton}
              onPress={onReceiptPhotoSelect}
            >
              <FontAwesome name="camera" size={24} color={colors.textSecondary} />
              <Text style={styles.addReceiptText}>Add Receipt Photo</Text>
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
            {linkedPallet && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Linked to:</Text>
                <Text style={styles.summaryPallet}>{linkedPallet.name}</Text>
              </View>
            )}
          </View>
        )}

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
            onPress={handleSubmit((data) => onSubmit(data as ExpenseFormData))}
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  categoryChipTextSelected: {
    color: colors.background,
    fontWeight: '600',
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
    color: colors.textSecondary,
    flex: 1,
  },
  palletTextSelected: {
    color: colors.textPrimary,
    fontWeight: '500',
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
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
  },
  summaryPallet: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
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
