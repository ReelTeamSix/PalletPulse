// UpgradePrompt - Inline upgrade nudge banner
// Phase 10: Subscription integration
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import { SubscriptionTier, TierLimits } from '@/src/constants/tier-limits';
import { PaywallModal } from './PaywallModal';

interface UpgradePromptProps {
  limitType: keyof TierLimits;
  currentCount: number;
  requiredTier: SubscriptionTier;
  variant?: 'inline' | 'card';
}

// Human-readable limit type names
const LIMIT_TYPE_NAMES: Partial<Record<keyof TierLimits, string>> = {
  activePallets: 'active pallets',
  archivedPallets: 'archived pallets',
  activeItems: 'active items',
  archivedItems: 'archived items',
  photosPerItem: 'photos per item',
  aiDescriptionsPerMonth: 'AI descriptions',
};

// Feature names for each limit type
const FEATURE_NAMES: Partial<Record<keyof TierLimits, string>> = {
  activePallets: 'more active pallets',
  archivedPallets: 'more archived pallets',
  activeItems: 'more active items',
  archivedItems: 'more archived items',
  photosPerItem: 'more photos',
  aiDescriptionsPerMonth: 'more AI descriptions',
  csvExport: 'CSV export',
  pdfExport: 'PDF export',
  expenseTracking: 'expense tracking',
  mileageTracking: 'mileage tracking',
  mileageSavedRoutes: 'saved mileage routes',
  bulkImportExport: 'bulk import/export',
  prioritySupport: 'priority support',
};

export function UpgradePrompt({
  limitType,
  currentCount,
  requiredTier,
  variant = 'inline',
}: UpgradePromptProps) {
  const [showPaywall, setShowPaywall] = useState(false);

  const tierName = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1);
  const featureName = FEATURE_NAMES[limitType] || limitType;
  const limitName = LIMIT_TYPE_NAMES[limitType];

  if (variant === 'card') {
    return (
      <>
        <TouchableOpacity
          style={styles.cardContainer}
          onPress={() => setShowPaywall(true)}
          activeOpacity={0.7}
        >
          <View style={styles.cardIconContainer}>
            <Ionicons name="lock-closed" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>
              Upgrade to {tierName}
            </Text>
            <Text style={styles.cardSubtitle}>
              Unlock {featureName} and more premium features
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          requiredTier={requiredTier}
          limitType={limitName}
          currentCount={currentCount}
        />
      </>
    );
  }

  // Inline variant
  return (
    <>
      <TouchableOpacity
        style={styles.inlineContainer}
        onPress={() => setShowPaywall(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-up-circle" size={18} color={colors.primary} />
        <Text style={styles.inlineText}>
          Upgrade to {tierName} for {featureName}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </TouchableOpacity>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        requiredTier={requiredTier}
        limitType={limitName}
        currentCount={currentCount}
      />
    </>
  );
}

// Standalone hook-style component for showing upgrade prompt conditionally
interface UpgradeBannerProps {
  show: boolean;
  message: string;
  requiredTier: SubscriptionTier;
  onUpgrade?: () => void;
}

export function UpgradeBanner({
  show,
  message,
  requiredTier,
  onUpgrade,
}: UpgradeBannerProps) {
  const [showPaywall, setShowPaywall] = useState(false);

  if (!show) return null;

  const tierName = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1);

  return (
    <>
      <TouchableOpacity
        style={styles.bannerContainer}
        onPress={() => {
          setShowPaywall(true);
          onUpgrade?.();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.bannerContent}>
          <Ionicons name="sparkles" size={20} color={colors.background} />
          <Text style={styles.bannerText}>{message}</Text>
        </View>
        <View style={styles.bannerButton}>
          <Text style={styles.bannerButtonText}>Upgrade to {tierName}</Text>
        </View>
      </TouchableOpacity>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        requiredTier={requiredTier}
      />
    </>
  );
}

// Limit reached modal trigger
interface LimitReachedPromptProps {
  visible: boolean;
  onClose: () => void;
  limitType: keyof TierLimits;
  currentLimit: number;
  requiredTier: SubscriptionTier;
}

export function LimitReachedPrompt({
  visible,
  onClose,
  limitType,
  currentLimit,
  requiredTier,
}: LimitReachedPromptProps) {
  const limitName = LIMIT_TYPE_NAMES[limitType] || limitType;

  return (
    <PaywallModal
      visible={visible}
      onClose={onClose}
      requiredTier={requiredTier}
      limitType={limitName}
      currentCount={currentLimit}
    />
  );
}

const styles = StyleSheet.create({
  // Inline variant
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  inlineText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },

  // Card variant
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    gap: spacing.md,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Banner variant
  bannerContainer: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  bannerText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  bannerButton: {
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  bannerButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
