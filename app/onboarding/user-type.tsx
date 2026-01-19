// User Type Selection Screen - Phase 8F Onboarding
// Research-backed design for conversion optimization
// Sources: UserPilot, RevenueCat 2025, Adapty, Smashing Magazine
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '@/src/constants/spacing';
import { TierCard, TierType, TierFeature } from '@/src/components/onboarding';
import { useOnboardingStore } from '@/src/stores/onboarding-store';
import { TIER_PRICING } from '@/src/constants/tier-limits';

// Ionicons names for tier icons (using keyof typeof Ionicons.glyphMap)
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = keyof typeof Ionicons.glyphMap;

// Tier configuration based on PALLETPULSE_ONESHOT_CONTEXT.md
const TIER_CONFIG: Record<TierType, {
  title: string;
  subtitle: string;
  icon: IoniconsName;
  features: TierFeature[];
  badge: 'most_popular' | 'best_value' | null;
}> = {
  free: {
    title: 'Just for Fun',
    subtitle: 'Track profits simply',
    icon: 'happy-outline',
    badge: null,
    features: [
      { text: '1 pallet · 20 items', included: true },
      { text: 'Basic profit tracking', included: true },
      { text: '1 photo per item', included: true },
      { text: 'No expense tracking', included: false },
      { text: 'No mileage deductions', included: false },
    ],
  },
  starter: {
    title: 'Side Income',
    subtitle: 'Track fees & know your true profit',
    icon: 'wallet-outline',
    badge: 'most_popular',
    features: [
      { text: '25 pallets · 500 items', included: true },
      { text: 'Platform fee tracking', included: true },
      { text: 'Expense & mileage logging', included: true },
      { text: '3 photos per item', included: true },
      { text: 'CSV export', included: true },
    ],
  },
  pro: {
    title: 'Serious Business',
    subtitle: 'Full tax-ready expense tracking',
    icon: 'analytics-outline',
    badge: 'best_value',
    features: [
      { text: 'Unlimited pallets & items', included: true },
      { text: 'Everything in Side Income', included: true },
      { text: 'IRS mileage deductions', included: true },
      { text: 'Saved routes & quick-log', included: true },
      { text: 'PDF reports · 10 photos', included: true },
    ],
  },
};

// Order tiers for display (research: natural progression works better for mobile)
const TIER_ORDER: TierType[] = ['free', 'starter', 'pro'];

export default function UserTypeScreen() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<TierType>('starter'); // Default to most popular
  const [isLoading, setIsLoading] = useState(false);

  const { completeOnboarding, startTrial } = useOnboardingStore();

  const handleContinue = async (skipTrial: boolean = false) => {
    setIsLoading(true);

    try {
      if (skipTrial) {
        // User chose to skip - start on free tier
        await completeOnboarding('free', null);
      } else {
        // Start 7-day Pro trial (reverse trial pattern)
        // After trial, they'll be prompted to subscribe to their selected tier
        await startTrial(selectedTier);
        await completeOnboarding('pro', selectedTier); // Trial gives Pro access
      }

      // Navigate to main app
      router.replace('/(tabs)');
    } catch {
      // Still navigate on error - don't block the user
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>How serious is your flipping?</Text>
          <Text style={styles.subtitle}>
            {"We'll unlock the right features for you"}
          </Text>
        </View>

        {/* Tier Cards */}
        <View style={styles.tiers}>
          {TIER_ORDER.map((tier) => {
            const config = TIER_CONFIG[tier];
            const pricing = TIER_PRICING[tier];

            return (
              <TierCard
                key={tier}
                tier={tier}
                title={config.title}
                subtitle={config.subtitle}
                icon={config.icon}
                features={config.features}
                monthlyPrice={pricing.monthly}
                annualPrice={pricing.annual}
                badge={config.badge}
                isSelected={selectedTier === tier}
                onSelect={() => setSelectedTier(tier)}
              />
            );
          })}
        </View>

        {/* CTA Buttons */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleContinue(false)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Start with Pro Trial</Text>
                <Text style={styles.primaryButtonSubtext}>All features · 7 days free</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => handleContinue(true)}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Skip for now · Start with Free</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Change your plan anytime in Settings
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as any,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tiers: {
    marginBottom: spacing.lg,
  },
  cta: {
    marginBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as any,
  },
  primaryButtonSubtext: {
    color: colors.background,
    fontSize: fontSize.sm,
    opacity: 0.9,
    marginTop: 2,
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textDecorationLine: 'underline',
  },
  footer: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    textAlign: 'center',
  },
});
