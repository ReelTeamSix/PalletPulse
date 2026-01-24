// Forgot Password Screen
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
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/src/components/ui';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import { fontFamily } from '@/src/constants/fonts';
import { useAuthStore } from '@/src/stores/auth-store';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/src/features/auth/schemas/auth-schemas';

export default function ForgotPasswordScreen() {
  const { resetPassword, isLoading, error, clearError } = useAuthStore();
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    clearError();
    const result = await resetPassword(data.email);
    if (result.success) {
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={48} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successText}>
            {"We've sent a password reset link to"}{'\n'}
            <Text style={styles.emailText}>{getValues('email')}</Text>
          </Text>
          <Text style={styles.hintText}>
            Click the link in the email to reset your password. The link will expire in 24 hours.
          </Text>
          <Button
            title="Back to Login"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.button}
          />
          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => setEmailSent(false)}
          >
            <Text style={styles.resendText}>{"Didn't receive it? Try again"}</Text>
          </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="lock-closed" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            {"Enter your email address and we'll send you a link to reset your password."}
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

          <Button
            title="Send Reset Link"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
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
  },
  backButton: {
    marginBottom: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
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
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
    fontFamily: fontFamily.regular,
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: fontFamily.regular,
  },
  emailText: {
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  hintText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
    maxWidth: 280,
    fontFamily: fontFamily.regular,
  },
  resendButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  resendText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
});
