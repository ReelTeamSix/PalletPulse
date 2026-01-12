// Onboarding Layout - Stack navigator for onboarding flow
import { Stack } from 'expo-router';
import { colors } from '@/src/constants/colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="user-type"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
