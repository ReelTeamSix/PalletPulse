// EmptyState Component
// Displays engaging empty states with illustrations, headlines, and CTAs
// Research: Best empty states combine illustration + headline + body + CTA

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Button } from './Button';

type EmptyStateVariant =
  | 'pallets'
  | 'items'
  | 'expenses'
  | 'mileage'
  | 'sales'
  | 'search'
  | 'empty-pallet'
  | 'all-sold'
  | 'notifications'
  | 'generic';

interface EmptyStateProps {
  /** Predefined variant with default content */
  variant?: EmptyStateVariant;
  /** Custom icon name (overrides variant) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Custom headline (overrides variant) */
  title?: string;
  /** Custom body text (overrides variant) */
  message?: string;
  /** CTA button label */
  actionLabel?: string;
  /** CTA button handler */
  onAction?: () => void;
  /** Secondary action label */
  secondaryActionLabel?: string;
  /** Secondary action handler */
  onSecondaryAction?: () => void;
  /** Custom style */
  style?: ViewStyle;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// Variant configurations
const variantConfig: Record<EmptyStateVariant, {
  icon: keyof typeof Ionicons.glyphMap;
  secondaryIcon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  defaultAction?: string;
}> = {
  pallets: {
    icon: 'cube-outline',
    secondaryIcon: 'cube-outline',
    title: 'No pallets yet',
    message: 'Start tracking your inventory by adding your first pallet.',
    defaultAction: 'Add Your First Pallet',
  },
  items: {
    icon: 'pricetag-outline',
    title: 'No items to show',
    message: 'Items you add will appear here.',
    defaultAction: 'Add an Item',
  },
  expenses: {
    icon: 'receipt-outline',
    title: 'No expenses tracked',
    message: 'Track your business expenses to see your true profit.',
    defaultAction: 'Log an Expense',
  },
  mileage: {
    icon: 'car-outline',
    title: 'No trips logged',
    message: 'Track your business mileage for tax deductions.',
    defaultAction: 'Log a Trip',
  },
  sales: {
    icon: 'cash-outline',
    title: 'No sales yet',
    message: 'Mark items as sold to track your profits.',
    defaultAction: 'View Inventory',
  },
  search: {
    icon: 'search-outline',
    title: 'No results found',
    message: 'Try adjusting your search or filters.',
    defaultAction: 'Clear Filters',
  },
  'empty-pallet': {
    icon: 'archive-outline',
    title: 'This pallet is empty',
    message: 'Add items to start tracking inventory.',
    defaultAction: 'Add Items',
  },
  'all-sold': {
    icon: 'checkmark-circle',
    title: 'All items sold!',
    message: 'Great job! All items from this pallet have been sold.',
    defaultAction: 'View Profit Report',
  },
  notifications: {
    icon: 'notifications-outline',
    title: 'No notifications',
    message: "You're all caught up!",
  },
  generic: {
    icon: 'folder-open-outline',
    title: 'Nothing here',
    message: 'There is no content to display.',
  },
};

export function EmptyState({
  variant = 'generic',
  icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
  compact = false,
  testID,
}: EmptyStateProps) {
  const config = variantConfig[variant];

  const displayIcon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const displayAction = actionLabel || config.defaultAction;

  // Special styling for "all-sold" variant
  const isSuccess = variant === 'all-sold';

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]} testID={testID}>
      {/* Illustration */}
      <View
        style={[
          styles.illustrationContainer,
          compact && styles.illustrationContainerCompact,
          isSuccess && styles.illustrationSuccess,
        ]}
      >
        <Ionicons
          name={displayIcon}
          size={compact ? 32 : 48}
          color={isSuccess ? colors.profit : colors.textDisabled}
        />
        {config.secondaryIcon && !compact && (
          <Ionicons
            name={config.secondaryIcon}
            size={28}
            color={colors.border}
            style={styles.secondaryIcon}
          />
        )}
      </View>

      {/* Headline */}
      <Text
        style={[
          styles.title,
          compact && styles.titleCompact,
          isSuccess && styles.titleSuccess,
        ]}
      >
        {displayTitle}
      </Text>

      {/* Body */}
      <Text style={[styles.message, compact && styles.messageCompact]}>
        {displayMessage}
      </Text>

      {/* CTA */}
      {displayAction && onAction && (
        <Button
          title={displayAction}
          onPress={onAction}
          variant={isSuccess ? 'outline' : 'primary'}
          size={compact ? 'sm' : 'md'}
          style={styles.actionButton}
        />
      )}

      {/* Secondary Action */}
      {secondaryActionLabel && onSecondaryAction && (
        <Button
          title={secondaryActionLabel}
          onPress={onSecondaryAction}
          variant="ghost"
          size="sm"
          style={styles.secondaryButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  containerCompact: {
    padding: spacing.lg,
    paddingVertical: spacing.xl,
  },
  illustrationContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  illustrationContainerCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.md,
  },
  illustrationSuccess: {
    backgroundColor: colors.successBackground,
  },
  secondaryIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    opacity: 0.4,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleCompact: {
    fontSize: fontSize.lg,
  },
  titleSuccess: {
    color: colors.profit,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  messageCompact: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    maxWidth: 240,
  },
  actionButton: {
    minWidth: 200,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});
