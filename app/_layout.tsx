// Root Layout - Handles auth state, onboarding, and navigation
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/src/stores/auth-store';
import { useOnboardingStore } from '@/src/stores/onboarding-store';
import { useSubscriptionStore } from '@/src/stores/subscription-store';
import { colors } from '@/src/constants/colors';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const { initialize, isInitialized, session } = useAuthStore();
  const { initialize: initializeSubscription } = useSubscriptionStore();

  // Initialize auth on app start
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Initialize subscription/RevenueCat after auth is ready
  useEffect(() => {
    if (isInitialized) {
      // Pass user ID if logged in for RevenueCat user identification
      initializeSubscription(session?.user?.id);
    }
  }, [isInitialized, session?.user?.id, initializeSubscription]);

  // Handle font loading error
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Hide splash screen when ready
  useEffect(() => {
    if (loaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isInitialized]);

  // Show loading while fonts and auth are initializing
  if (!loaded || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session } = useAuthStore();
  const { hasCompletedOnboarding, checkTrialStatus } = useOnboardingStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      // User is not signed in and trying to access protected route
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // User is signed in but on auth screen
      // Check if they need onboarding
      if (!hasCompletedOnboarding) {
        router.replace('/onboarding/user-type');
      } else {
        // Check trial status on app launch
        checkTrialStatus();
        router.replace('/(tabs)');
      }
    } else if (session && !inOnboardingGroup && !hasCompletedOnboarding) {
      // User is signed in but hasn't completed onboarding
      router.replace('/onboarding/user-type');
    }
  }, [session, segments, router, hasCompletedOnboarding, checkTrialStatus]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="pallets/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Pallet Details',
          }}
        />
        <Stack.Screen
          name="pallets/new"
          options={{
            headerShown: true,
            headerTitle: 'Add Pallet',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="items/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Item Details',
          }}
        />
        <Stack.Screen
          name="items/new"
          options={{
            headerShown: true,
            headerTitle: 'Add Item',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="items/edit"
          options={{
            headerShown: true,
            headerTitle: 'Edit Item',
          }}
        />
        <Stack.Screen
          name="items/sell"
          options={{
            headerShown: true,
            headerTitle: 'Sell Item',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="pallets/edit"
          options={{
            headerShown: true,
            headerTitle: 'Edit Pallet',
          }}
        />
        <Stack.Screen
          name="expenses/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Expense Details',
          }}
        />
        <Stack.Screen
          name="expenses/new"
          options={{
            headerShown: true,
            headerTitle: 'Add Expense',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="expenses/edit"
          options={{
            headerShown: true,
            headerTitle: 'Edit Expense',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
