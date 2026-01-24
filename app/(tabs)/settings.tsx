// Settings Screen - User preferences and account management
import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { Button, ConfirmationModal, SettingRow, ToggleRow } from '@/src/components/ui';
import { UserProfileCard } from '@/src/features/settings';
import { useAuthStore } from '@/src/stores/auth-store';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { useOnboardingStore } from '@/src/stores/onboarding-store';
import { PaywallModal } from '@/src/components/subscription';
import { isHapticsEnabled, setHapticsEnabled } from '@/src/lib/haptics';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, isLoading: authLoading, user } = useAuthStore();
  const {
    settings,
    isLoading,
    fetchSettings,
    toggleExpenseTracking,
    setStaleThreshold,
    setIncludeUnsellableInCost,
    profitGoalsEnabled,
    setProfitGoalsEnabled,
  } = useUserSettingsStore();
  const {
    getEffectiveTier,
    canPerform,
    expirationDate,
    billingCycle,
    willRenew,
    restorePurchases,
    refreshSubscription,
  } = useSubscriptionStore();

  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [hapticsEnabled, setHapticsEnabledState] = useState(isHapticsEnabled());
  const { resetOnboarding } = useOnboardingStore();

  const currentTier = getEffectiveTier();
  const canAccessExpenseTracking = canPerform('expenseTracking', 0);

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
      // If user doesn't have expense tracking access, show paywall
      if (!canAccessExpenseTracking) {
        setShowPaywall(true);
        return;
      }
      setExpenseModalVisible(true);
    } else {
      await toggleExpenseTracking(false);
    }
  };

  const confirmEnableExpenseTracking = async () => {
    setExpenseModalVisible(false);
    await toggleExpenseTracking(true);
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

  const handleHapticsToggle = async (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    await setHapticsEnabled(enabled);
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
      />

      {/* Subscription Section */}
      {currentTier !== 'free' && (
        <>
          <SectionHeader title="Subscription" />
          <Card shadow="sm" padding={0} style={styles.sectionCard}>
            <SettingRow
              icon="card"
              label="Current Plan"
              value={currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            />
            {billingCycle && (
              <SettingRow
                icon="calendar"
                label="Billing Cycle"
                value={billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}
              />
            )}
            {expirationDate && (
              <SettingRow
                icon="time"
                label={willRenew ? 'Next Billing Date' : 'Expires On'}
                value={formatExpirationDate(expirationDate)}
              />
            )}
            <SettingRow
              icon="settings"
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
              <Ionicons name="rocket" size={32} color={colors.primary} />
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
          icon="time"
          label="Stale Inventory Threshold"
          value={`${settings?.stale_threshold_days ?? 30} days`}
          onPress={handleStaleThresholdChange}
        />
        <ToggleRow
          icon="trophy"
          label="Profit Goals"
          value={profitGoalsEnabled}
          onValueChange={setProfitGoalsEnabled}
          hint="Show profit goal tracker on dashboard"
        />
        <ToggleRow
          icon="calculator"
          label="Include Unsellable in Cost"
          value={settings?.include_unsellable_in_cost ?? false}
          onValueChange={setIncludeUnsellableInCost}
          hint="Allocate pallet cost to unsellable items"
        />
        <ToggleRow
          icon="radio-button-on"
          label="Haptic Feedback"
          value={hapticsEnabled}
          onValueChange={handleHapticsToggle}
          hint="Tactile feedback on button presses"
          isLast
        />
      </Card>

      {/* Expense Tracking Section */}
      <SectionHeader title="Expense Tracking" />
      <Card shadow="sm" padding={0} style={styles.sectionCard}>
        <ToggleRow
          icon="wallet"
          label="Enable Expense Tracking"
          value={canAccessExpenseTracking ? (settings?.expense_tracking_enabled ?? false) : false}
          onValueChange={handleToggleExpenseTracking}
          hint={canAccessExpenseTracking ? "Track mileage and overhead expenses" : "Upgrade to Starter to unlock"}
          isLast={!settings?.expense_tracking_enabled || !canAccessExpenseTracking}
        />
        {canAccessExpenseTracking && settings?.expense_tracking_enabled && (
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

      {/* About Section */}
      <SectionHeader title="About" />
      <Card shadow="sm" padding={0} style={styles.sectionCard}>
        <SettingRow icon="information-circle" label="Version" value="1.0.0" />
        <SettingRow icon="document-text" label="Terms of Service" onPress={() => {}} />
        <SettingRow icon="shield" label="Privacy Policy" onPress={() => {}} isLast />
      </Card>

      {/* Debug Section - TODO: Remove before production */}
      {__DEV__ && (
        <>
          <SectionHeader title="Developer" />
          <Card shadow="sm" padding={0} style={styles.sectionCard}>
            <SettingRow
              icon="refresh"
              label="Reset Onboarding"
              onPress={() => {
                resetOnboarding();
                Alert.alert('Onboarding Reset', 'Sign out and sign back in to see the new onboarding flow.');
              }}
              isLast
            />
          </Card>
        </>
      )}

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
          Pallet Pro is an inventory tracking tool, not tax software.
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
        message="Pallet Pro is an inventory tracking tool, not tax software. Expense tracking features are provided for your convenience. Always consult a tax professional for tax advice."
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
