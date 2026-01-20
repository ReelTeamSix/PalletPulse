// Quick Setup - Personalization without heavy commitment
// Research: Casual framing, progressive disclosure, low friction
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import { useOnboardingStore } from '@/src/stores/onboarding-store';

interface FlipperProfile {
  id: 'hobby' | 'side_hustle' | 'business';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  description: string;
  recommended: boolean;
}

const FLIPPER_PROFILES: FlipperProfile[] = [
  {
    id: 'hobby',
    icon: 'happy-outline',
    title: 'Just for Fun',
    subtitle: 'A few items here and there',
    description: 'Perfect for casual flipping',
    recommended: false,
  },
  {
    id: 'side_hustle',
    icon: 'wallet-outline',
    title: 'Side Hustle',
    subtitle: 'Making extra income',
    description: 'Track fees and expenses',
    recommended: true,
  },
  {
    id: 'business',
    icon: 'business-outline',
    title: 'Serious Business',
    subtitle: 'This is my job',
    description: 'Full analytics and reports',
    recommended: false,
  },
];

export default function QuickSetupScreen() {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState<FlipperProfile['id']>('side_hustle');
  const [isLoading, setIsLoading] = useState(false);

  const { completeOnboarding, startTrial } = useOnboardingStore();

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      // Map profile to tier for trial
      const tierMap = {
        hobby: 'free',
        side_hustle: 'starter',
        business: 'pro',
      } as const;

      const selectedTier = tierMap[selectedProfile];

      // Start 7-day Pro trial for everyone (reverse trial pattern)
      // This lets them experience full features before deciding
      await startTrial(selectedTier);
      await completeOnboarding('pro', selectedTier);

      // Navigate to getting started screen
      router.push('/onboarding/get-started');
    } catch {
      // Still navigate on error - don't block the user
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>How do you flip?</Text>
          <Text style={styles.subtitle}>
            This helps us show you the right features
          </Text>
        </View>

        {/* Profile Options */}
        <View style={styles.profiles}>
          {FLIPPER_PROFILES.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={[
                styles.profileCard,
                selectedProfile === profile.id && styles.profileCardSelected,
              ]}
              onPress={() => setSelectedProfile(profile.id)}
              activeOpacity={0.7}
            >
              {profile.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>POPULAR</Text>
                </View>
              )}

              <View style={styles.profileContent}>
                <View style={[
                  styles.profileIcon,
                  selectedProfile === profile.id && styles.profileIconSelected,
                ]}>
                  <Ionicons
                    name={profile.icon}
                    size={28}
                    color={selectedProfile === profile.id ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={styles.profileText}>
                  <Text style={[
                    styles.profileTitle,
                    selectedProfile === profile.id && styles.profileTitleSelected,
                  ]}>
                    {profile.title}
                  </Text>
                  <Text style={styles.profileSubtitle}>{profile.subtitle}</Text>
                </View>

                <View style={[
                  styles.radioOuter,
                  selectedProfile === profile.id && styles.radioOuterSelected,
                ]}>
                  {selectedProfile === profile.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trial Info */}
        <View style={styles.trialInfo}>
          <Ionicons name="gift-outline" size={20} color={colors.profit} />
          <Text style={styles.trialText}>
            Start with a free 7-day Pro trial - no credit card needed
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.background} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
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
  profiles: {
    gap: spacing.md,
  },
  profileCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    position: 'relative',
    ...shadows.sm,
  },
  profileCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F8FBFF',
    ...shadows.md,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  recommendedText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as any,
    letterSpacing: 0.5,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileIconSelected: {
    backgroundColor: colors.primaryLight,
  },
  profileText: {
    flex: 1,
  },
  profileTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  profileTitleSelected: {
    color: colors.primary,
  },
  profileSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successBackground,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  trialText: {
    fontSize: fontSize.sm,
    color: colors.profit,
    fontWeight: fontWeight.medium as any,
  },
  cta: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    ...shadows.md,
  },
  continueButtonText: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as any,
  },
});
