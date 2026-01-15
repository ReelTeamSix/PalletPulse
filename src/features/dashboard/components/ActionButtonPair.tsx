import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';

interface ActionButtonPairProps {
  primaryLabel: string;
  primaryIcon?: keyof typeof Ionicons.glyphMap;
  primaryOnPress: () => void;
  secondaryLabel: string;
  secondaryIcon?: keyof typeof Ionicons.glyphMap;
  secondaryOnPress: () => void;
}

export function ActionButtonPair({
  primaryLabel,
  primaryIcon,
  primaryOnPress,
  secondaryLabel,
  secondaryIcon,
  secondaryOnPress,
}: ActionButtonPairProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.primaryButton,
          pressed && styles.pressed,
        ]}
        onPress={primaryOnPress}
      >
        {primaryIcon && (
          <Ionicons name={primaryIcon} size={18} color={colors.background} style={styles.icon} />
        )}
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
        onPress={secondaryOnPress}
      >
        {secondaryIcon && (
          <Ionicons name={secondaryIcon} size={18} color={colors.primary} style={styles.icon} />
        )}
        <Text style={styles.secondaryText}>{secondaryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    marginRight: spacing.sm,
  },
  primaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
