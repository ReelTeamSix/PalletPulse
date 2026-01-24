// PaywallModal - Full-screen paywall for subscription upgrades
// Phase 10: Subscription integration
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { shadows } from '@/src/constants/shadows';
import { SubscriptionTier, TIER_LIMITS, TIER_PRICING } from '@/src/constants/tier-limits';
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { Button } from '@/src/components/ui';
import logger from '@/src/lib/logger';

const log = logger.createLogger({ screen: 'PaywallModal' });

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  requiredTier?: SubscriptionTier;
  limitType?: string; // e.g., "pallets", "items", "photos"
  currentCount?: number;
}

// Tier feature descriptions
const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  free: [
    '1 pallet',
    '20 items',
    '1 photo per item',
    '30-day analytics',
  ],
  starter: [
    '25 pallets',
    '500 items',
    '3 photos per item',
    'Unlimited analytics history',
    'Expense & mileage tracking',
    'CSV export',
    '50 AI descriptions/month',
  ],
  pro: [
    'Unlimited pallets',
    'Unlimited items',
    '10 photos per item',
    'Everything in Starter',
    'PDF export',
    'Saved mileage routes',
    '200 AI descriptions/month',
    'Priority support',
  ],
  enterprise: [
    'Everything in Pro',
    'Multi-user access',
    'Custom integrations',
    'Dedicated support',
  ],
};

export function PaywallModal({
  visible,
  onClose,
  requiredTier,
  limitType,
  currentCount,
}: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const {
    offerings,
    isLoading,
    error,
    loadOfferings,
    purchasePackage,
    restorePurchases,
    getEffectiveTier,
    clearError,
  } = useSubscriptionStore();

  const currentTier = getEffectiveTier();

  // Load offerings when modal opens
  useEffect(() => {
    if (visible && !offerings) {
      loadOfferings();
    }
  }, [visible, offerings, loadOfferings]);

  // Get packages for each tier
  const getPackage = (tier: 'starter' | 'pro', cycle: 'monthly' | 'annual'): PurchasesPackage | undefined => {
    if (!offerings?.availablePackages) return undefined;

    const productId = `${tier}_${cycle}`;
    return offerings.availablePackages.find(
      (pkg) => pkg.product.identifier.includes(productId)
    );
  };

  const handlePurchase = async (tier: 'starter' | 'pro') => {
    const pkg = getPackage(tier, billingCycle);
    if (!pkg) {
      log.error('Package not found', { action: 'handlePurchase', tier, billingCycle });
      return;
    }

    setIsPurchasing(true);
    const result = await purchasePackage(pkg);
    setIsPurchasing(false);

    if (result.success) {
      onClose();
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    const result = await restorePurchases();
    setIsPurchasing(false);

    if (result.restored) {
      onClose();
    }
  };

  const handleManageSubscription = () => {
    // Open platform-specific subscription management
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  // Calculate savings (using pro tier for badge since it's the recommended option)
  const proSavings = Math.round(
    ((TIER_PRICING.pro.monthly * 12 - TIER_PRICING.pro.annual) /
      (TIER_PRICING.pro.monthly * 12)) *
      100
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Upgrade Your Plan</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Limit Warning (if applicable) */}
        {limitType && currentCount !== undefined && (
          <View style={styles.limitWarning}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text style={styles.limitWarningText}>
              You&apos;ve reached your {limitType} limit ({currentCount}/{TIER_LIMITS[currentTier][limitType as keyof typeof TIER_LIMITS.free]}).
              Upgrade to add more!
            </Text>
          </View>
        )}

        {/* Billing Cycle Toggle */}
        <View style={styles.cycleToggle}>
          <TouchableOpacity
            style={[
              styles.cycleOption,
              billingCycle === 'monthly' && styles.cycleOptionActive,
            ]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text
              style={[
                styles.cycleOptionText,
                billingCycle === 'monthly' && styles.cycleOptionTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.cycleOption,
              billingCycle === 'annual' && styles.cycleOptionActive,
            ]}
            onPress={() => setBillingCycle('annual')}
          >
            <Text
              style={[
                styles.cycleOptionText,
                billingCycle === 'annual' && styles.cycleOptionTextActive,
              ]}
            >
              Annual
            </Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>Save ~{proSavings}%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {isLoading && !offerings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Starter Tier */}
            <View
              style={[
                styles.tierCard,
                requiredTier === 'starter' && styles.tierCardHighlighted,
              ]}
            >
              <View style={styles.tierHeader}>
                <View style={styles.tierTitleRow}>
                  <Ionicons name="wallet-outline" size={24} color={colors.primary} />
                  <Text style={styles.tierTitle}>Starter</Text>
                  {requiredTier === 'starter' && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.tierSubtitle}>Perfect for side hustlers</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  ${billingCycle === 'monthly'
                    ? TIER_PRICING.starter.monthly
                    : (TIER_PRICING.starter.annual / 12).toFixed(2)}
                </Text>
                <Text style={styles.priceUnit}>/month</Text>
                {billingCycle === 'annual' && (
                  <Text style={styles.billedAnnually}>
                    Billed ${TIER_PRICING.starter.annual}/year
                  </Text>
                )}
              </View>

              <View style={styles.featuresList}>
                {TIER_FEATURES.starter.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={16} color={colors.profit} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <Button
                title={isPurchasing ? 'Processing...' : 'Subscribe to Starter'}
                onPress={() => handlePurchase('starter')}
                disabled={isPurchasing || currentTier === 'starter' || currentTier === 'pro'}
                style={styles.subscribeButton}
              />
              {currentTier === 'starter' && (
                <Text style={styles.currentPlanText}>Your current plan</Text>
              )}
            </View>

            {/* Pro Tier */}
            <View
              style={[
                styles.tierCard,
                styles.tierCardPro,
                requiredTier === 'pro' && styles.tierCardHighlighted,
              ]}
            >
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>

              <View style={styles.tierHeader}>
                <View style={styles.tierTitleRow}>
                  <Ionicons name="analytics-outline" size={24} color={colors.primary} />
                  <Text style={styles.tierTitle}>Pro</Text>
                  {requiredTier === 'pro' && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>REQUIRED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.tierSubtitle}>For serious resellers</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  ${billingCycle === 'monthly'
                    ? TIER_PRICING.pro.monthly
                    : (TIER_PRICING.pro.annual / 12).toFixed(2)}
                </Text>
                <Text style={styles.priceUnit}>/month</Text>
                {billingCycle === 'annual' && (
                  <Text style={styles.billedAnnually}>
                    Billed ${TIER_PRICING.pro.annual}/year
                  </Text>
                )}
              </View>

              <View style={styles.featuresList}>
                {TIER_FEATURES.pro.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={16} color={colors.profit} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <Button
                title={isPurchasing ? 'Processing...' : 'Subscribe to Pro'}
                onPress={() => handlePurchase('pro')}
                disabled={isPurchasing || currentTier === 'pro'}
                style={styles.subscribeButton}
              />
              {currentTier === 'pro' && (
                <Text style={styles.currentPlanText}>Your current plan</Text>
              )}
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={clearError}>
                  <Text style={styles.errorDismiss}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Restore Purchases */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isPurchasing}
            >
              <Text style={styles.restoreButtonText}>
                Restore Previous Purchases
              </Text>
            </TouchableOpacity>

            {/* Manage Subscription (if subscribed) */}
            {currentTier !== 'free' && (
              <TouchableOpacity
                style={styles.manageButton}
                onPress={handleManageSubscription}
              >
                <Text style={styles.manageButtonText}>
                  Manage Subscription
                </Text>
              </TouchableOpacity>
            )}

            {/* Terms */}
            <Text style={styles.termsText}>
              Subscriptions auto-renew unless cancelled. Cancel anytime in your{' '}
              {Platform.OS === 'ios' ? 'App Store' : 'Play Store'} settings.
            </Text>
          </ScrollView>
        )}

        {/* Footer - Continue Free */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.continueFreetText}>Continue with Free</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    gap: spacing.sm,
  },
  limitWarningText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  cycleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    margin: spacing.md,
  },
  cycleOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  cycleOptionActive: {
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  cycleOptionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  cycleOptionTextActive: {
    color: colors.textPrimary,
  },
  savingsBadge: {
    backgroundColor: colors.profit + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.semibold,
    color: colors.profit,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  tierCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  tierCardPro: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  tierCardHighlighted: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.bold,
    color: colors.background,
    letterSpacing: 0.5,
  },
  tierHeader: {
    marginBottom: spacing.md,
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tierTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  recommendedBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: 'auto',
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.bold,
    color: colors.warning,
  },
  tierSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  priceUnit: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  billedAnnually: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    width: '100%',
    marginTop: spacing.xs,
  },
  featuresList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  subscribeButton: {
    marginTop: spacing.sm,
  },
  currentPlanText: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.profit,
    marginTop: spacing.sm,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.medium,
  },
  errorContainer: {
    backgroundColor: colors.loss + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: colors.loss,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    flex: 1,
  },
  errorDismiss: {
    color: colors.loss,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.semibold,
  },
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  restoreButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.medium,
  },
  manageButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  manageButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  continueFreetText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.medium,
  },
});
