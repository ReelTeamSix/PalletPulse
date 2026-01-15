// UpgradeOverlay - Reusable blur overlay for tier gating
// Shows CTA to upgrade when free tier user needs premium feature
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';

interface UpgradeOverlayProps {
  visible: boolean;
  message: string;
  onUpgrade: () => void;
  /** Position: 'bottom' covers bottom portion, 'full' covers entire component */
  position?: 'bottom' | 'full';
  /** Height for bottom position (default: 60%) */
  bottomHeight?: number;
}

export function UpgradeOverlay({
  visible,
  message,
  onUpgrade,
  position = 'bottom',
  bottomHeight = 60,
}: UpgradeOverlayProps) {
  if (!visible) return null;

  // Note: bottomHeight is used as a percentage, but React Native needs DimensionValue
  // We use a fixed height approach instead of percentage strings
  const overlayStyle = position === 'full'
    ? styles.fullOverlay
    : styles.bottomOverlay;

  return (
    <View style={overlayStyle}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint="light" style={styles.blurContainer}>
          <OverlayContent message={message} onUpgrade={onUpgrade} />
        </BlurView>
      ) : (
        // Android fallback - semi-transparent overlay
        <View style={styles.androidOverlay}>
          <OverlayContent message={message} onUpgrade={onUpgrade} />
        </View>
      )}
    </View>
  );
}

function OverlayContent({ message, onUpgrade }: { message: string; onUpgrade: () => void }) {
  return (
    <View style={styles.content}>
      <View style={styles.lockIcon}>
        <FontAwesome name="lock" size={24} color={colors.primary} />
      </View>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.upgradeButton} onPress={onUpgrade}>
        <FontAwesome name="star" size={14} color={colors.background} />
        <Text style={styles.upgradeText}>Upgrade to Unlock</Text>
      </Pressable>
    </View>
  );
}

// Compact inline version for lists (shows "X more - Upgrade" link)
interface UpgradeInlineProps {
  count: number;
  onUpgrade: () => void;
}

export function UpgradeInline({ count, onUpgrade }: UpgradeInlineProps) {
  return (
    <Pressable style={styles.inlineContainer} onPress={onUpgrade}>
      <Text style={styles.inlineText}>
        +{count} more
      </Text>
      <View style={styles.inlineLink}>
        <FontAwesome name="star" size={10} color={colors.primary} />
        <Text style={styles.inlineLinkText}>Upgrade to see all</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  lockIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    maxWidth: 200,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full || 20,
  },
  upgradeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.background,
  },
  // Inline styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  inlineText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineLinkText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
});
