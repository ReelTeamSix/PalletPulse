// Welcome Screen - First impression, value-focused
// Research: Show value before asking for commitment
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import { fontFamily } from '@/src/constants/fonts';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/onboarding/value-props');
  };

  const handleSkip = () => {
    router.push('/onboarding/quick-setup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.iconWrapper}>
            {/* Decorative corner arcs */}
            <View style={[styles.cornerArc, styles.cornerTopLeft]} />
            <View style={[styles.cornerArc, styles.cornerTopRight]} />
            <View style={[styles.cornerArc, styles.cornerBottomLeft]} />
            <View style={[styles.cornerArc, styles.cornerBottomRight]} />
            <View style={styles.iconContainer}>
              <Ionicons name="cube-outline" size={56} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.appName}>Pallet Pro</Text>
          <Text style={styles.title}>Track Your Flipping Business</Text>
          <Text style={styles.subtitle}>
            Know exactly what you&apos;re making on every pallet and item you sell
          </Text>
        </View>

        {/* Feature Highlights */}
        <View style={styles.features}>
          <FeatureRow
            icon="cash-outline"
            iconBg={colors.successBackground}
            iconColor={colors.profit}
            title="See profit instantly"
            description="Automated calculations for every sale you record."
          />
          <FeatureRow
            icon="layers-outline"
            iconBg={colors.primaryLight}
            iconColor={colors.primary}
            title="Track inventory life"
            description="Monitor items from arrival to final sale delivery."
          />
          <FeatureRow
            icon="analytics-outline"
            iconBg={colors.warningBackground}
            iconColor={colors.warning}
            title="Performance insights"
            description="Find out which categories are your top earners."
          />
        </View>

        {/* CTA Section */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.background} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip intro</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface FeatureRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

function FeatureRow({ icon, iconBg, iconColor, title, description }: FeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
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
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  iconWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  cornerArc: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
    borderWidth: 3,
    borderRadius: 8,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  appName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold as any,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  features: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm + 2,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold as any,
    fontFamily: fontFamily.semibold,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cta: {
    paddingBottom: spacing.lg,
  },
  primaryButton: {
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
  primaryButtonText: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as any,
    fontFamily: fontFamily.bold,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
  },
});
