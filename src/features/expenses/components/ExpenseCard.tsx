// ExpenseCard Component - Displays an expense summary in a list
// Updated for Phase 8D: Multi-pallet display support
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { ExpenseWithPallets } from '@/src/stores/expenses-store';
import {
  formatExpenseAmount,
  formatExpenseDate,
  getCategoryLabel,
  getCategoryColor,
} from '../schemas/expense-form-schema';

interface ExpenseCardProps {
  expense: ExpenseWithPallets;
  palletNames?: string[]; // Phase 8D: Support multiple pallet names
  onPress: () => void;
  // Optional: Show split amount instead of total (for pallet detail view)
  showSplitAmount?: boolean;
  splitAmount?: number;
}

export function ExpenseCard({
  expense,
  palletNames,
  onPress,
  showSplitAmount = false,
  splitAmount,
}: ExpenseCardProps) {
  const categoryColor = getCategoryColor(expense.category);
  const categoryLabel = getCategoryLabel(expense.category);
  const hasReceipt = !!expense.receipt_photo_path;
  const linkedPalletCount = expense.pallet_ids?.length || (expense.pallet_id ? 1 : 0);
  const isLinkedToPallet = linkedPalletCount > 0;
  const isMultiPallet = linkedPalletCount > 1;
  const displayAmount = showSplitAmount && splitAmount !== undefined ? splitAmount : expense.amount;

  // Get pallet display text
  const getPalletDisplayText = () => {
    if (!palletNames || palletNames.length === 0) {
      if (isMultiPallet) return `${linkedPalletCount} pallets`;
      return 'Pallet';
    }
    if (palletNames.length === 1) return palletNames[0];
    return `${palletNames.length} pallets`;
  };

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.leftSection}>
        {/* Category Color Bar */}
        <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />

        <View style={styles.content}>
          {/* Amount and Category */}
          <View style={styles.header}>
            <View style={styles.amountContainer}>
              <Text style={styles.amount}>{formatExpenseAmount(displayAmount)}</Text>
              {/* Show split indicator if multi-pallet and showing split amount */}
              {isMultiPallet && showSplitAmount && (
                <Text style={styles.splitIndicator}>
                  (of {formatExpenseAmount(expense.amount)})
                </Text>
              )}
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
              <Text style={styles.categoryText}>{categoryLabel}</Text>
            </View>
          </View>

          {/* Description */}
          {expense.description && (
            <Text style={styles.description} numberOfLines={2}>
              {expense.description}
            </Text>
          )}

          {/* Footer with date and icons */}
          <View style={styles.footer}>
            <Text style={styles.date}>{formatExpenseDate(expense.expense_date)}</Text>

            <View style={styles.indicators}>
              {/* Receipt indicator */}
              {hasReceipt && (
                <View style={styles.indicator}>
                  <FontAwesome name="file-image-o" size={12} color={colors.textSecondary} />
                </View>
              )}

              {/* Pallet link indicator - Updated for multi-pallet */}
              {isLinkedToPallet && (
                <View style={[styles.palletBadge, isMultiPallet && styles.multiPalletBadge]}>
                  <FontAwesome
                    name={isMultiPallet ? 'cubes' : 'cube'}
                    size={10}
                    color={colors.primary}
                  />
                  <Text style={styles.palletName} numberOfLines={1}>
                    {getPalletDisplayText()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
    </Pressable>
  );
}

// Compact version for use in pallet detail
// Updated for Phase 8D: Shows split amount for multi-pallet expenses
export function ExpenseCardCompact({
  expense,
  onPress,
  splitAmount,
  totalPallets,
}: {
  expense: ExpenseWithPallets;
  onPress: () => void;
  splitAmount?: number;
  totalPallets?: number;
}) {
  const categoryColor = getCategoryColor(expense.category);
  const categoryLabel = getCategoryLabel(expense.category);
  const displayAmount = splitAmount !== undefined ? splitAmount : expense.amount;
  const isSharedExpense = (totalPallets || 0) > 1;

  return (
    <Pressable style={styles.compactContainer} onPress={onPress}>
      <View style={[styles.compactCategoryDot, { backgroundColor: categoryColor }]} />
      <View style={styles.compactContent}>
        <View style={styles.compactTitleRow}>
          <Text style={styles.compactDescription} numberOfLines={1}>
            {expense.description || categoryLabel}
          </Text>
          {isSharedExpense && (
            <View style={styles.sharedBadge}>
              <FontAwesome name="share-alt" size={8} color={colors.textSecondary} />
              <Text style={styles.sharedText}>Split</Text>
            </View>
          )}
        </View>
        <Text style={styles.compactDate}>{formatExpenseDate(expense.expense_date)}</Text>
      </View>
      <View style={styles.compactAmountContainer}>
        <Text style={styles.compactAmount}>{formatExpenseAmount(displayAmount)}</Text>
        {isSharedExpense && (
          <Text style={styles.compactTotal}>
            ({formatExpenseAmount(expense.amount)} total)
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
  },
  categoryBar: {
    width: 4,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  splitIndicator: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '600',
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  indicator: {
    padding: spacing.xs,
  },
  palletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  multiPalletBadge: {
    backgroundColor: colors.primaryLight || colors.background,
  },
  palletName: {
    fontSize: fontSize.xs,
    color: colors.primary,
    maxWidth: 80,
  },
  // Compact styles
  compactContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  compactContent: {
    flex: 1,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactDescription: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  compactDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  compactAmountContainer: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  compactAmount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  compactTotal: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sharedText: {
    fontSize: 9,
    color: colors.textSecondary,
  },
});
