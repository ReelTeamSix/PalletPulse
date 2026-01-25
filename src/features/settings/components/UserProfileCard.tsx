import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { TIER_DISPLAY, type SubscriptionTier } from '@/src/constants/tier-limits';
import { Card } from '@/src/components/ui/Card';

export interface UserProfileCardProps {
  email: string | null;
  displayName?: string | null;
  tier?: 'free' | 'starter' | 'pro';
  isTrialActive?: boolean;
  trialDaysRemaining?: number;
  onPress?: () => void;
  onSubscriptionPress?: () => void;
}

function getInitials(email: string | null, displayName?: string | null): string {
  if (displayName) {
    const names = displayName.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    return displayName.charAt(0).toUpperCase();
  }
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
}

function getDisplayName(email: string | null, displayName?: string | null): string {
  if (displayName) return displayName;
  if (email) {
    // Extract name from email (before @)
    const namePart = email.split('@')[0];
    // Capitalize first letter
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }
  return 'User';
}

export function UserProfileCard({
  email,
  displayName,
  tier = 'free',
  isTrialActive = false,
  trialDaysRemaining = 0,
  onPress,
  onSubscriptionPress,
}: UserProfileCardProps) {
  const tierDisplay = TIER_DISPLAY[tier as SubscriptionTier];
  const initials = getInitials(email, displayName);
  const name = getDisplayName(email, displayName);

  // Determine badge display - show trial badge if on trial
  const showTrialBadge = isTrialActive && tier === 'pro';
  const trialBadgeText = trialDaysRemaining === 1
    ? 'PRO TRIAL (1 day)'
    : `PRO TRIAL (${trialDaysRemaining} days)`;

  return (
    <Card shadow="sm" padding="md" style={styles.card}>
      {/* Main profile row */}
      <Pressable
        style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
        onPress={onPress}
        disabled={!onPress}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Profile info */}
        <View style={styles.profileContent}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName} numberOfLines={1}>
              {name}
            </Text>
            {/* Tier badge - show trial badge if on trial */}
            {showTrialBadge ? (
              <View style={[styles.tierBadge, styles.trialBadge]}>
                <Ionicons name="gift" size={10} color={colors.background} />
                <Text style={styles.tierText}>{trialBadgeText}</Text>
              </View>
            ) : (
              <View style={[styles.tierBadge, { backgroundColor: tierDisplay.color }]}>
                <Ionicons name={tierDisplay.icon as keyof typeof Ionicons.glyphMap} size={10} color={colors.background} />
                <Text style={styles.tierText}>{tierDisplay.shortLabel}</Text>
              </View>
            )}
          </View>
          {email && (
            <Text style={styles.profileEmail} numberOfLines={1}>
              {email}
            </Text>
          )}
        </View>

        {/* Only show chevron when profile is clickable */}
        {onPress && (
          <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
        )}
      </Pressable>

      {/* Subscription management row */}
      {onSubscriptionPress && (
        <>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.subscriptionRow, pressed && styles.pressed]}
            onPress={onSubscriptionPress}
          >
            <View style={styles.subscriptionIcon}>
              <Ionicons name="card-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.subscriptionText}>Subscription Management</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </Pressable>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.background,
  },
  profileContent: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  profileName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  trialBadge: {
    backgroundColor: colors.profit,
  },
  tierText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    marginHorizontal: -spacing.md,
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  subscriptionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
});
