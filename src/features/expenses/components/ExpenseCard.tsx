// ExpenseCard Component - Displays an expense summary in a list
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Expense } from '@/src/types/database';
import {
  formatExpenseAmount,
  formatExpenseDate,
  getCategoryLabel,
  getCategoryColor,
} from '../schemas/expense-form-schema';

interface ExpenseCardProps {
  expense: Expense;
  palletName?: string | null;
  onPress: () => void;
}

export function ExpenseCard({
  expense,
  palletName,
  onPress,
}: ExpenseCardProps) {
  const categoryColor = getCategoryColor(expense.category);
  const categoryLabel = getCategoryLabel(expense.category);
  const hasReceipt = !!expense.receipt_photo_path;
  const isLinkedToPallet = !!expense.pallet_id;

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.leftSection}>
        {/* Category Color Bar */}
        <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />

        <View style={styles.content}>
          {/* Amount and Category */}
          <View style={styles.header}>
            <Text style={styles.amount}>{formatExpenseAmount(expense.amount)}</Text>
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

              {/* Pallet link indicator */}
              {isLinkedToPallet && (
                <View style={styles.palletBadge}>
                  <FontAwesome name="cube" size={10} color={colors.primary} />
                  <Text style={styles.palletName} numberOfLines={1}>
                    {palletName || 'Pallet'}
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
export function ExpenseCardCompact({
  expense,
  onPress,
}: Omit<ExpenseCardProps, 'palletName'>) {
  const categoryColor = getCategoryColor(expense.category);
  const categoryLabel = getCategoryLabel(expense.category);

  return (
    <Pressable style={styles.compactContainer} onPress={onPress}>
      <View style={[styles.compactCategoryDot, { backgroundColor: categoryColor }]} />
      <View style={styles.compactContent}>
        <Text style={styles.compactDescription} numberOfLines={1}>
          {expense.description || categoryLabel}
        </Text>
        <Text style={styles.compactDate}>{formatExpenseDate(expense.expense_date)}</Text>
      </View>
      <Text style={styles.compactAmount}>{formatExpenseAmount(expense.amount)}</Text>
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
  amount: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
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
  compactDescription: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  compactDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  compactAmount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
});
