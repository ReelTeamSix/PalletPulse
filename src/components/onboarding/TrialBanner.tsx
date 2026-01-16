// Trial Banner Component - Shows trial status and upgrade CTA
// Appears in last 3 days of trial per research (creates urgency without being pushy)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '@/src/constants/spacing';
import { useTrialBanner } from '@/src/stores/onboarding-store';

interface TrialBannerProps {
  onUpgrade?: () => void;
}

export function TrialBanner({ onUpgrade }: TrialBannerProps) {
  const router = useRouter();
  const { show, daysRemaining, message } = useTrialBanner();

  if (!show) return null;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Navigate to settings/subscription screen
      router.push('/(tabs)/settings');
    }
  };

  // Color based on urgency
  const isUrgent = daysRemaining <= 1;
  const bannerColor = isUrgent ? colors.warning : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: bannerColor }]}>
      <View style={styles.content}>
        <FontAwesome
          name="clock-o"
          size={16}
          color={colors.background}
          style={styles.icon}
        />
        <Text style={styles.message}>{message}</Text>
      </View>
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={handleUpgrade}
        activeOpacity={0.8}
      >
        <Text style={styles.upgradeText}>Upgrade</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: spacing.sm,
  },
  message: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  upgradeText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
  },
});

export default TrialBanner;
