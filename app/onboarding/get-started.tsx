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
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.profit} />
          </View>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>
            Your 7-day Pro trial is active. Let's get started.
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
          <Text style={styles.tipsTitle}>Pro Tips</Text>
          <View style={styles.tipsList}>
            <TipItem
              icon="camera-outline"
              text="Take photos of items for easy listing"
            />
            <TipItem
              icon="pricetag-outline"
              text="Log your listing price to track stale inventory"
            />
            <TipItem
              icon="receipt-outline"
              text="Track expenses for accurate profit"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface TipItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

function TipItem({ icon, text }: TipItemProps) {
  return (
    <View style={styles.tipItem}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.tipText}>{text}</Text>
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
  successIcon: {
    marginBottom: spacing.lg,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  actionTitlePrimary: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.background,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionSubtitlePrimary: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tips: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  tipsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tipsList: {
    gap: spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
});
