// Onboarding Layout - Stack navigator for onboarding flow
// Research-backed flow: Welcome -> Value Props -> Quick Setup -> Get Started
import { Stack } from 'expo-router';
import { colors } from '@/src/constants/colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundSecondary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="value-props" />
      <Stack.Screen name="quick-setup" />
      <Stack.Screen name="get-started" />
      {/* Keep user-type for backwards compatibility */}
      <Stack.Screen name="user-type" />
    </Stack>
  );
}
