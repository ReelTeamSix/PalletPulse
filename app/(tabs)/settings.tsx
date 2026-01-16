// Settings Screen - User preferences and account management
import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { Button, ConfirmationModal } from '@/src/components/ui';
import { UserProfileCard } from '@/src/features/settings';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { PaywallModal } from '@/src/components/subscription';
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

// Setting row component
function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  hint,
  isLast = false,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  hint?: string;
  isLast?: boolean;
}) {
  const content = (
    <View style={[styles.settingRow, !isLast && styles.settingRowBorder]}>
      {icon && (
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {hint && <Text style={styles.settingHint}>{hint}</Text>}
      </View>
      {rightElement || (
        <View style={styles.settingValueContainer}>
          {value && <Text style={styles.settingValue}>{value}</Text>}
          {onPress && (
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed && styles.settingPressed}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

// Toggle row component
function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
  hint,
  disabled,
  isLast = false,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
  disabled?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.settingRow, !isLast && styles.settingRowBorder, disabled && styles.settingRowDisabled]}>
      {icon && (
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color={disabled ? colors.textDisabled : colors.textSecondary} />
        </View>
      )}
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
  const {
    getEffectiveTier,
    expirationDate,
    billingCycle,
    willRenew,
    restorePurchases,
    refreshSubscription,
  } = useSubscriptionStore();

  const [showUserTypePicker, setShowUserTypePicker] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const currentTier = getEffectiveTier();

  // Fetch settings and refresh subscription on mount and focus
  useFocusEffect(
    useCallback(() => {
      fetchSettings();
      refreshSubscription();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps -- Store functions are stable references
  );

  const handleSignOut = () => {
    setSignOutModalVisible(true);
  };

  const confirmSignOut = async () => {
    setSignOutModalVisible(false);
    await signOut();
  };

  const handleToggleExpenseTracking = async (enabled: boolean) => {
    if (enabled) {
      setExpenseModalVisible(true);
    } else {
      await toggleExpenseTracking(false);
    }
  };

  const confirmEnableExpenseTracking = async () => {
    setExpenseModalVisible(false);
    await toggleExpenseTracking(true);
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

  const handleSubscriptionPress = () => {
    setShowPaywall(true);
  };

  const handleManageSubscription = () => {
    // Open platform-specific subscription management
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.restored) {
        Alert.alert('Success', 'Your purchases have been restored.');
      } else if (result.success) {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatExpirationDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.title}>Settings</Text>

      {/* Profile Card */}
      <UserProfileCard
        email={user?.email ?? null}
        tier={currentTier === 'enterprise' ? 'pro' : currentTier}
        onSubscriptionPress={handleSubscriptionPress}
      />

      {/* Subscription Section */}
      {currentTier !== 'free' && (
        <>
          <SectionHeader title="Subscription" />
          <Card shadow="sm" padding={0} style={styles.sectionCard}>
            <SettingRow
              icon="card-outline"
              label="Current Plan"
              value={currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            />
            {billingCycle && (
              <SettingRow
                icon="calendar-outline"
                label="Billing Cycle"
                value={billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}
              />
            )}
            {expirationDate && (
              <SettingRow
                icon="time-outline"
                label={willRenew ? 'Next Billing Date' : 'Expires On'}
                value={formatExpirationDate(expirationDate)}
              />
            )}
            <SettingRow
              icon="settings-outline"
              label="Manage Subscription"
              onPress={handleManageSubscription}
              isLast
            />
          </Card>
        </>
      )}

      {/* Upgrade Prompt for Free Users */}
      {currentTier === 'free' && (
        <>
          <SectionHeader title="Subscription" />
          <Card shadow="sm" padding="md" style={styles.upgradeCard}>
            <View style={styles.upgradeContent}>
              <Ionicons name="rocket-outline" size={32} color={colors.primary} />
              <View style={styles.upgradeText}>
                <Text style={styles.upgradeTitle}>Upgrade Your Plan</Text>
                <Text style={styles.upgradeSubtitle}>
                  Unlock unlimited pallets, items, photos, and more
                </Text>
              </View>
            </View>
            <Button
              title="View Plans"
              onPress={handleSubscriptionPress}
              style={styles.upgradeButton}
            />
            <Pressable
              style={styles.restoreLink}
              onPress={handleRestorePurchases}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.restoreLinkText}>Restore Purchases</Text>
              )}
            </Pressable>
          </Card>
        </>
      )}

      {/* App Settings Section */}
      <SectionHeader title="App Settings" />
      <Card shadow="sm" padding={0} style={styles.sectionCard}>
        <SettingRow
          icon="time-outline"
          label="Stale Inventory Threshold"
          value={`${settings?.stale_threshold_days ?? 30} days`}
          onPress={handleStaleThresholdChange}
        />
        <ToggleRow
          icon="calculator-outline"
          label="Include Unsellable in Cost"
          value={settings?.include_unsellable_in_cost ?? false}
          onValueChange={setIncludeUnsellableInCost}
          hint="Allocate pallet cost to unsellable items"
          isLast
        />
      </Card>

      {/* Expense Tracking Section */}
      <SectionHeader title="Expense Tracking" />
      <Card shadow="sm" padding={0} style={styles.sectionCard}>
        <ToggleRow
          icon="wallet-outline"
          label="Enable Expense Tracking"
          value={settings?.expense_tracking_enabled ?? false}
          onValueChange={handleToggleExpenseTracking}
          hint="Track mileage and overhead expenses"
          isLast={!settings?.expense_tracking_enabled}
        />
        {settings?.expense_tracking_enabled && (
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.profit} />
              <Text style={styles.featureText}>Mileage Tracking (IRS standard rate)</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.profit} />
              <Text style={styles.featureText}>Overhead Expenses</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.profit} />
              <Text style={styles.featureText}>Multi-Pallet Cost Allocation</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.profit} />
              <Text style={styles.featureText}>Receipt Photo Storage</Text>
            </View>
          </View>
        )}
      </Card>

      {/* User Type Section */}
      <SectionHeader title="Business Type" />
      <Card shadow="sm" padding={0} style={styles.sectionCard}>
        <SettingRow
          icon="briefcase-outline"
          label="User Type"
          value={getUserTypeLabel()}
          onPress={() => setShowUserTypePicker(!showUserTypePicker)}
          isLast={!showUserTypePicker}
        />
        {showUserTypePicker && (
          <View style={styles.userTypePicker}>
            {USER_TYPE_OPTIONS.map((option, index) => (
              <Pressable
                key={option.value}
                style={[
                  styles.userTypeOption,
                  settings?.user_type === option.value && styles.userTypeOptionSelected,
                ]}
                onPress={() => handleUserTypeChange(option.value)}
              >
                <View style={[
                  styles.userTypeRadio,
                  settings?.user_type === option.value && styles.userTypeRadioSelected,
                ]}>
                  {settings?.user_type === option.value && (
                    <View style={styles.userTypeRadioInner} />
                  )}
                </View>
                <View style={styles.userTypeContent}>
                  <Text style={[
                    styles.userTypeLabel,
                    settings?.user_type === option.value && styles.userTypeLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.userTypeDescription}>{option.description}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      {/* About Section */}
      <SectionHeader title="About" />
      <Card shadow="sm" padding={0} style={styles.sectionCard}>
        <SettingRow icon="information-circle-outline" label="Version" value="1.0.0" />
        <SettingRow icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
        <SettingRow icon="shield-outline" label="Privacy Policy" onPress={() => {}} isLast />
      </Card>

      {/* Sign Out */}
      <Button
        title="Sign Out"
        onPress={handleSignOut}
        variant="outline"
        loading={authLoading}
        style={styles.signOutButton}
      />

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={14} color={colors.textDisabled} />
        <Text style={styles.disclaimerText}>
          PalletPulse is an inventory tracking tool, not tax software.
        </Text>
      </View>

      <View style={styles.bottomPadding} />

      {/* Sign Out Confirmation Modal */}
      <ConfirmationModal
        visible={signOutModalVisible}
        type="warning"
        title="Sign Out?"
        message="Are you sure you want to sign out of your account?"
        primaryLabel="Sign Out"
        secondaryLabel="Cancel"
        onPrimary={confirmSignOut}
        onClose={() => setSignOutModalVisible(false)}
      />

      {/* Enable Expense Tracking Modal */}
      <ConfirmationModal
        visible={expenseModalVisible}
        type="info"
        title="Enable Expense Tracking"
        message="PalletPulse is an inventory tracking tool, not tax software. Expense tracking features are provided for your convenience. Always consult a tax professional for tax advice."
        infoText="Do you want to enable expense tracking?"
        primaryLabel="Enable"
        secondaryLabel="Cancel"
        onPrimary={confirmEnableExpenseTracking}
        onClose={() => setExpenseModalVisible(false)}
      />

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        requiredTier={currentTier === 'free' ? 'starter' : 'pro'}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
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
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 56,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingPressed: {
    backgroundColor: colors.surface,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  settingLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  settingLabelDisabled: {
    color: colors.textDisabled,
  },
  settingHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingValue: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  featuresContainer: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  userTypePicker: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userTypeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  userTypeOptionSelected: {
    backgroundColor: colors.primaryLight,
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
  userTypeRadioSelected: {
    borderColor: colors.primary,
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
  signOutButton: {
    marginTop: spacing.lg,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  disclaimerText: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
  // Upgrade card styles
  upgradeCard: {
    marginBottom: spacing.md,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  upgradeSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upgradeButton: {
    marginBottom: spacing.sm,
  },
  restoreLink: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  restoreLinkText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
});
