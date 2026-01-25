import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/constants/colors';
import { useUserSettingsStore } from '@/src/stores/user-settings-store';
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { useOnboardingStore } from '@/src/stores/onboarding-store';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused?: boolean;
}) {
  return <Ionicons size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { isExpenseTrackingEnabled } = useUserSettingsStore();
  const { getEffectiveTier } = useSubscriptionStore();
  const { isTrialActive } = useOnboardingStore();

  // Check trial status - trial users get Pro access
  const trialActive = isTrialActive();
  const currentTier = trialActive ? 'pro' : getEffectiveTier();

  // User must have tier access AND have it enabled in settings
  const canAccessExpenses = currentTier !== 'free';
  const expensesEnabled = canAccessExpenses && isExpenseTrackingEnabled();

  const insets = useSafeAreaInsets();

  // Calculate tab bar height accounting for safe area (Android nav bar)
  const tabBarHeight = Platform.OS === 'ios' ? 88 : 60 + Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 0,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          marginBottom: Platform.OS === 'android' ? 4 : 0,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'grid' : 'grid-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'cube' : 'cube-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'receipt' : 'receipt-outline'} color={color} />
          ),
          href: expensesEnabled ? undefined : null, // Hide tab when expenses disabled
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'settings' : 'settings-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
