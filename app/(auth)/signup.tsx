// Signup Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/src/components/ui';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { fontFamily } from '@/src/constants/fonts';
import { useAuthStore } from '@/src/stores/auth-store';
import { signupSchema, SignupFormData } from '@/src/features/auth/schemas/auth-schemas';

export default function SignupScreen() {
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      affiliateCode: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    clearError();
    const result = await signUp(data.email, data.password, data.affiliateCode);
    if (result.success) {
      setShowVerificationMessage(true);
    }
  };

  if (showVerificationMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.verificationContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="mail" size={40} color={colors.primary} />
          </View>
          <Text style={styles.verificationTitle}>Check Your Email</Text>
          <Text style={styles.verificationText}>
            {"We've sent a verification link to your email address. Please click the link to verify your account."}
          </Text>
          <Button
            title="Back to Login"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Start tracking your profits with <Text style={styles.brandText}>Pallet Pro</Text>
          </Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={colors.loss} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon="envelope"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Create a password"
                secureTextEntry
                autoComplete="new-password"
                leftIcon="lock"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                hint="At least 6 characters"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                secureTextEntry
                autoComplete="new-password"
                leftIcon="lock"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="affiliateCode"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Affiliate Code (Optional)"
                placeholder="Enter affiliate code"
                autoCapitalize="none"
                leftIcon="tag"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.affiliateCode?.message}
                hint="Have a referral code? Enter it here for a discount!"
              />
            )}
          />

          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },
  brandText: {
    color: colors.primary,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  form: {
    marginBottom: spacing.xl,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.loss + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.loss,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  button: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
  },
  linkText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  verificationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  verificationTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  verificationText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
    maxWidth: 280,
    fontFamily: fontFamily.regular,
  },
});
