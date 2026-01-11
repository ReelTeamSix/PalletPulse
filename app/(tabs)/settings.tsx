// Settings Screen - Phase 8E: User preferences and expense tracking opt-in
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Button } from '@/src/components/ui';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';
import { UserType } from '@/src/types/database';

// User type options with descriptions
const USER_TYPE_OPTIONS: { value: UserType; label: string; description: string }[] = [
  {
    value: 'hobby',
    label: 'Hobby Flipper',
    description: 'Track profits simply - no expense tracking needed',
  },
  {
    value: 'side_hustle',
    label: 'Side Income',
    description: 'Basic tracking with shipping and platform fees',
  },
  {
    value: 'business',
    label: 'Serious Business',
    description: 'Full expense tracking for tax reporting',
  },
];

// Section header component
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <FontAwesome name={icon as any} size={16} color={colors.textSecondary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// Setting row component
function SettingRow({
  label,
  value,
  onPress,
  rightElement,
  hint,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  hint?: string;
}) {
  const content = (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {hint && <Text style={styles.settingHint}>{hint}</Text>}
      </View>
      {rightElement || (
        <View style={styles.settingValueContainer}>
          {value && <Text style={styles.settingValue}>{value}</Text>}
          {onPress && (
            <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.settingPressable}>
        {content}
      </Pressable>
    );
  }
  return content;
}

// Toggle row component
function ToggleRow({
  label,
  value,
  onValueChange,
  hint,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, disabled && styles.settingLabelDisabled]}>
          {label}
        </Text>
        {hint && <Text style={styles.settingHint}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.background}
        disabled={disabled}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, isLoading: authLoading, user } = useAuthStore();
  const {
    settings,
    isLoading,
    fetchSettings,
    toggleExpenseTracking,
    setUserType,
    setStaleThreshold,
    setIncludeUnsellableInCost,
  } = useUserSettingsStore();

  const [showUserTypePicker, setShowUserTypePicker] = useState(false);

  // Fetch settings on mount and focus
  useFocusEffect(
    useCallback(() => {
      fetchSettings();
    }, [])
  );

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleToggleExpenseTracking = async (enabled: boolean) => {
    if (enabled) {
      // Show disclaimer when enabling
      Alert.alert(
        'Enable Expense Tracking',
        'PalletPulse is an inventory tracking tool, not tax software. Expense tracking features are provided for your convenience. Always consult a tax professional for tax advice.\n\nDo you want to enable expense tracking?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              await toggleExpenseTracking(true);
            },
          },
        ]
      );
    } else {
      await toggleExpenseTracking(false);
    }
  };

  const handleUserTypeChange = async (userType: UserType) => {
    await setUserType(userType);
    setShowUserTypePicker(false);
  };

  const handleStaleThresholdChange = () => {
    Alert.prompt(
      'Stale Inventory Threshold',
      'Items listed longer than this will be flagged as stale (in days)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value?: string) => {
            const days = parseInt(value || '30', 10);
            if (days > 0 && days <= 365) {
              await setStaleThreshold(days);
            }
          },
        },
      ],
      'plain-text',
      settings?.stale_threshold_days?.toString() || '30'
    );
  };

  const getUserTypeLabel = () => {
    const option = USER_TYPE_OPTIONS.find((o) => o.value === settings?.user_type);
    return option?.label || 'Hobby Flipper';
  };

  if (isLoading && !settings) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + spacing.md }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Customize your experience</Text>

      {/* Account Section */}
      <View style={styles.section}>
        <SectionHeader title="Account" icon="user" />
        <View style={styles.sectionContent}>
          {user && (
            <SettingRow label="Email" value={user.email || 'Not set'} />
          )}
          <SettingRow
            label="User Type"
            value={getUserTypeLabel()}
            onPress={() => setShowUserTypePicker(!showUserTypePicker)}
          />
          {showUserTypePicker && (
            <View style={styles.userTypePicker}>
              {USER_TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.userTypeOption,
                    settings?.user_type === option.value && styles.userTypeOptionSelected,
                  ]}
                  onPress={() => handleUserTypeChange(option.value)}
                >
                  <View style={styles.userTypeRadio}>
                    {settings?.user_type === option.value && (
                      <View style={styles.userTypeRadioInner} />
                    )}
                  </View>
                  <View style={styles.userTypeContent}>
                    <Text
                      style={[
                        styles.userTypeLabel,
                        settings?.user_type === option.value && styles.userTypeLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.userTypeDescription}>{option.description}</Text>
                  </View>
                </Pressable>
              ))}
              <Text style={styles.userTypeHint}>
                Business users get full expense tracking enabled automatically.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Expense Tracking Section */}
      <View style={styles.section}>
        <SectionHeader title="Expense Tracking" icon="calculator" />
        <View style={styles.sectionContent}>
          <ToggleRow
            label="Enable Expense Tracking"
            value={settings?.expense_tracking_enabled ?? false}
            onValueChange={handleToggleExpenseTracking}
            hint="Track mileage, overhead expenses, and more"
          />
          {settings?.expense_tracking_enabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.expenseSubOptions}>
                <Text style={styles.subOptionsLabel}>Tracking Features:</Text>
                <View style={styles.featureRow}>
                  <FontAwesome name="check" size={12} color={colors.profit} />
                  <Text style={styles.featureText}>Mileage Tracking (IRS standard rate)</Text>
                </View>
                <View style={styles.featureRow}>
                  <FontAwesome name="check" size={12} color={colors.profit} />
                  <Text style={styles.featureText}>Overhead Expenses</Text>
                </View>
                <View style={styles.featureRow}>
                  <FontAwesome name="check" size={12} color={colors.profit} />
                  <Text style={styles.featureText}>Multi-Pallet Cost Allocation</Text>
                </View>
                <View style={styles.featureRow}>
                  <FontAwesome name="check" size={12} color={colors.profit} />
                  <Text style={styles.featureText}>Receipt Photo Storage</Text>
                </View>
              </View>
              <View style={styles.disclaimer}>
                <FontAwesome name="info-circle" size={14} color={colors.textSecondary} />
                <Text style={styles.disclaimerText}>
                  PalletPulse is not tax software. Always consult a tax professional.
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <SectionHeader title="Preferences" icon="sliders" />
        <View style={styles.sectionContent}>
          <SettingRow
            label="Stale Inventory Threshold"
            value={`${settings?.stale_threshold_days ?? 30} days`}
            onPress={handleStaleThresholdChange}
            hint="Items listed longer will be flagged"
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Include Unsellable in Cost"
            value={settings?.include_unsellable_in_cost ?? false}
            onValueChange={setIncludeUnsellableInCost}
            hint="Allocate pallet cost to unsellable items"
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <SectionHeader title="About" icon="info-circle" />
        <View style={styles.sectionContent}>
          <SettingRow label="Version" value="1.0.0" />
          <View style={styles.divider} />
          <SettingRow label="Terms of Service" onPress={() => {}} />
          <View style={styles.divider} />
          <SettingRow label="Privacy Policy" onPress={() => {}} />
        </View>
      </View>

      {/* Sign Out */}
      <Button
        title="Sign Out"
        onPress={handleSignOut}
        variant="outline"
        loading={authLoading}
        style={styles.signOutButton}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    minHeight: 56,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingPressable: {
    backgroundColor: 'transparent',
  },
  settingContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  settingLabelDisabled: {
    color: colors.textSecondary,
  },
  settingHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  userTypePicker: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  userTypeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  userTypeOptionSelected: {
    backgroundColor: colors.primaryLight || '#E3F2FD',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  userTypeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  userTypeRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  userTypeContent: {
    flex: 1,
  },
  userTypeLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  userTypeLabelSelected: {
    color: colors.primary,
  },
  userTypeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userTypeHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  expenseSubOptions: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  subOptionsLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disclaimerText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  signOutButton: {
    marginTop: spacing.md,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
