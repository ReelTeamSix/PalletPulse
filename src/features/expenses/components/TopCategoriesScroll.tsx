import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import { formatCurrency } from '@/src/lib/profit-utils';
import { ExpenseCategory } from '@/src/types/database';

interface CategoryData {
  category: ExpenseCategory;
  amount: number;
  label: string;
}

interface TopCategoriesScrollProps {
  categories: CategoryData[];
  onCategoryPress?: (category: ExpenseCategory) => void;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  storage: 'home',
  supplies: 'bag',
  subscriptions: 'card',
  equipment: 'build',
  gas: 'car',
  mileage: 'speedometer',
  fees: 'receipt',
  shipping: 'cube',
  other: 'ellipsis-horizontal',
};

export function TopCategoriesScroll({
  categories,
  onCategoryPress,
}: TopCategoriesScrollProps) {
  if (categories.length === 0) return null;

  // Sort by amount descending and take top 5
  const topCategories = [...categories]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>TOP CATEGORIES</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {topCategories.map((cat) => (
          <Pressable
            key={cat.category}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            onPress={() => onCategoryPress?.(cat.category)}
          >
            <Ionicons
              name={CATEGORY_ICONS[cat.category] || 'ellipsis-horizontal'}
              size={14}
              color={colors.primary}
            />
            <Text style={styles.chipLabel}>{cat.label}</Text>
            <Text style={styles.chipAmount}>{formatCurrency(cat.amount)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  chipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  chipLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  chipAmount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
