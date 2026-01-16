/**
 * Error Fallback Component
 *
 * Displayed when an error boundary catches an unhandled error.
 * Provides user-friendly error message and recovery options.
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';
import logger from '@/src/lib/logger';

interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  // Log the error when component mounts
  logger.error('Unhandled error caught by boundary', { screen: 'ErrorFallback' }, error);

  const handleRetry = () => {
    if (resetError) {
      resetError();
    }
  };

  const handleCopyError = () => {
    // In a real app, this would copy to clipboard
    // For now, just log it
    logger.info('Error details copied', {
      action: 'copy_error',
      errorMessage: error.message,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning-outline" size={64} color={colors.warning} />
        </View>

        <Text style={styles.title}>Something went wrong</Text>

        <Text style={styles.message}>
          We&apos;re sorry, but something unexpected happened. Please try again.
        </Text>

        {__DEV__ && (
          <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
            <Text style={styles.errorLabel}>Error Details (Dev Only):</Text>
            <Text style={styles.errorText}>{error.message}</Text>
            {error.stack && (
              <Text style={styles.stackText}>{error.stack.slice(0, 500)}...</Text>
            )}
          </ScrollView>
        )}

        <View style={styles.actions}>
          {resetError && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
              <Ionicons name="refresh" size={20} color={colors.textInverse} />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}

          {__DEV__ && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCopyError}>
              <Ionicons name="copy-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Copy Error</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.helpText}>
          If this keeps happening, try closing and reopening the app.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.warningBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorContainer: {
    maxHeight: 150,
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  errorContent: {
    padding: spacing.md,
  },
  errorLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.body,
    color: colors.loss,
    fontFamily: 'SpaceMono',
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  stackText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontFamily: 'SpaceMono',
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  helpText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
