// Get Started Screen - Guide to first action
// Research: Clear next step reduces abandonment
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

export default function GetStartedScreen() {
  const router = useRouter();

  const handleAddPallet = () => {
    // Navigate directly to add pallet form
    router.replace('/(tabs)');
    // Small delay to let navigation complete, then push to new pallet
    setTimeout(() => {
      router.push('/pallets/new');
    }, 100);
  };

  const handleExplore = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Header */}
        <View style={styles.header}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark" size={48} color={colors.background} />
          </View>
          <Text style={styles.title}>You&apos;re all set!</Text>
          <Text style={styles.subtitle}>
            Your 7-day Pro trial is active. Let&apos;s get started.
          </Text>
        </View>

        {/* Action Cards */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardPrimary]}
            onPress={handleAddPallet}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconPrimary}>
              <Ionicons name="add-circle" size={32} color={colors.background} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitlePrimary}>Add Your First Pallet</Text>
              <Text style={styles.actionSubtitlePrimary}>
                Start tracking profit right away
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.background} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleExplore}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="compass-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Explore First</Text>
              <Text style={styles.actionSubtitle}>
                Look around the app before adding data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Pro Tips */}
        <View style={styles.tips}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.tipsTitle}>PRO TIPS</Text>
          </View>
          <View style={styles.tipsList}>
            <TipItem
              icon="camera-outline"
              iconBg="#F3E8FF"
              iconColor="#9333EA"
              title="Take photos of items"
              description="Capture visual proof for easier listings and inventory tracking."
            />
            <TipItem
              icon="pricetag-outline"
              iconBg="#FEF3C7"
              iconColor="#F59E0B"
              title="Log your listing price"
              description="Keep track of stale inventory by monitoring price adjustments."
            />
            <TipItem
              icon="receipt-outline"
              iconBg={colors.primaryLight}
              iconColor={colors.primary}
              title="Track all expenses"
              description="Input shipping and fees to see your true accurate net profit."
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface TipItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

function TipItem({ icon, iconBg, iconColor, title, description }: TipItemProps) {
  return (
    <View style={styles.tipItem}>
      <View style={[styles.tipIconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.tipTextContainer}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipDescription}>{description}</Text>
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
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.profit,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as any,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  actionCardPrimary: {
    backgroundColor: colors.primary,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionIconPrimary: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  actionTitlePrimary: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    fontFamily: fontFamily.semibold,
    color: colors.background,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  actionSubtitlePrimary: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tips: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tipsTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as any,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  tipsList: {
    gap: spacing.lg,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tipDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
