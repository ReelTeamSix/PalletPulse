// SettingRow - Reusable setting row component for settings screens
// Supports icons, values, chevrons, and custom right elements

import React from 'react';
import { StyleSheet, View, Text, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { haptics } from '@/src/lib/haptics';
import { TOUCH_TARGET, getValueLabel } from '@/src/constants/accessibility';

// Base props shared by all row types
interface BaseRowProps {
  /** Icon name from Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Primary label text */
  label: string;
  /** Optional hint/description text below label */
  hint?: string;
  /** Whether this is the last row (no bottom border) */
  isLast?: boolean;
  /** Whether the row is disabled */
  disabled?: boolean;
  /** Custom accessibility label */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Test ID for testing */
  testID?: string;
}

// Props for standard setting row (with value and/or navigation)
export interface SettingRowProps extends BaseRowProps {
  /** Value to display on the right */
  value?: string;
  /** Press handler - shows chevron when provided */
  onPress?: () => void;
  /** Custom element to render on the right side */
  rightElement?: React.ReactNode;
}

// Props for toggle row (with switch)
export interface ToggleRowProps extends BaseRowProps {
  /** Current toggle value */
  value: boolean;
  /** Toggle change handler */
  onValueChange: (value: boolean) => void;
}

/**
 * Standard setting row with optional value and navigation chevron
 */
export function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  hint,
  isLast = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: SettingRowProps) {
  // Generate accessibility label including value if present
  const a11yLabel = accessibilityLabel || (value ? getValueLabel(label, value) : label);
  const content = (
    <View style={[styles.row, !isLast && styles.rowBorder, disabled && styles.rowDisabled]}>
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color={disabled ? colors.textDisabled : colors.textSecondary}
          />
        </View>
      )}
      <View style={styles.content}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      {rightElement || (
        <View style={styles.valueContainer}>
          {value && <Text style={styles.value}>{value}</Text>}
          {onPress && (
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          )}
        </View>
      )}
    </View>
  );

  if (onPress && !disabled) {
    const handlePress = () => {
      haptics.light();
      onPress();
    };

    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        testID={testID}
      >
        {content}
      </Pressable>
    );
  }
  return <View testID={testID} accessibilityLabel={a11yLabel}>{content}</View>;
}

/**
 * Setting row with toggle switch
 */
export function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
  hint,
  disabled = false,
  isLast = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ToggleRowProps) {
  const handleValueChange = (newValue: boolean) => {
    haptics.selection();
    onValueChange(newValue);
  };

  // Generate accessibility label including current state
  const a11yLabel = accessibilityLabel || `${label}, ${value ? 'on' : 'off'}`;

  return (
    <View
      style={[styles.row, !isLast && styles.rowBorder, disabled && styles.rowDisabled]}
      testID={testID}
      accessibilityLabel={a11yLabel}
    >
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color={disabled ? colors.textDisabled : colors.textSecondary}
          />
        </View>
      )}
      <View style={styles.content}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={handleValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.background}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint || `Double tap to toggle ${label}`}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 56,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  labelDisabled: {
    color: colors.textDisabled,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
