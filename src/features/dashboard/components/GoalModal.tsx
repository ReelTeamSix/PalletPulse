// Goal Modal - Set profit goal for selected time period
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import { fontFamily } from '@/src/constants/fonts';

type GoalPeriod = 'week' | 'month' | 'year';

interface GoalModalProps {
  visible: boolean;
  period: GoalPeriod;
  currentGoal: number | null;
  onSave: (goal: number | null) => void;
  onClose: () => void;
  onDisable: () => void;
}

// Quick goal presets by period
const GOAL_PRESETS: Record<GoalPeriod, number[]> = {
  week: [100, 250, 500, 1000],
  month: [500, 1000, 2000, 5000],
  year: [5000, 10000, 25000, 50000],
};

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  week: 'Weekly',
  month: 'Monthly',
  year: 'Yearly',
};

export function GoalModal({
  visible,
  period,
  currentGoal,
  onSave,
  onClose,
  onDisable,
}: GoalModalProps) {
  const [goalValue, setGoalValue] = useState('');
  const periodLabel = PERIOD_LABELS[period];
  const presets = GOAL_PRESETS[period];

  // Reset input when modal opens
  useEffect(() => {
    if (visible) {
      setGoalValue(currentGoal ? currentGoal.toString() : '');
    }
  }, [visible, currentGoal]);

  // Validate and parse the goal value
  const parseGoalValue = (value: string): { valid: boolean; amount: number | null; error?: string } => {
    if (!value.trim()) {
      return { valid: false, amount: null, error: 'Please enter a goal amount' };
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      return { valid: false, amount: null, error: 'Please enter a valid number' };
    }

    if (numValue <= 0) {
      return { valid: false, amount: null, error: 'Goal must be greater than $0' };
    }

    if (numValue > 10000000) {
      return { valid: false, amount: null, error: 'Goal cannot exceed $10,000,000' };
    }

    return { valid: true, amount: numValue };
  };

  const validationResult = parseGoalValue(goalValue);
  const isValidGoal = validationResult.valid;

  const handleSave = () => {
    if (validationResult.valid && validationResult.amount !== null) {
      onSave(validationResult.amount);
      onClose();
    }
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  const handleDisable = () => {
    onDisable();
    onClose();
  };

  const handlePresetSelect = (amount: number) => {
    setGoalValue(amount.toString());
  };

  const formatInputValue = (text: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].slice(0, 2);
    }
    return cleaned;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.modal, shadows.xl]}>
          {/* Icon with glow effect */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconGlow} />
            <View style={styles.iconContainer}>
              <Ionicons name="trophy-outline" size={36} color={colors.primary} />
            </View>
          </View>

          {/* Header */}
          <Text style={styles.title}>Set {periodLabel} Goal</Text>
          <Text style={styles.subtitle}>
            Track your progress toward a {periodLabel.toLowerCase()} profit target
          </Text>

          {/* Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>PROFIT TARGET</Text>
            <View style={[
              styles.inputWrapper,
              goalValue.length > 0 && !isValidGoal && styles.inputWrapperError,
            ]}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={goalValue}
                onChangeText={(text) => setGoalValue(formatInputValue(text))}
                placeholder="0"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            {goalValue.length > 0 && !isValidGoal && validationResult.error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={colors.loss} />
                <Text style={styles.errorText}>{validationResult.error}</Text>
              </View>
            )}
          </View>

          {/* Presets */}
          <View style={styles.presetsSection}>
            <Text style={styles.presetsLabel}>QUICK SELECT</Text>
            <View style={styles.presetsRow}>
              {presets.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.presetChip,
                    goalValue === amount.toString() && styles.presetChipSelected,
                  ]}
                  onPress={() => handlePresetSelect(amount)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      goalValue === amount.toString() && styles.presetChipTextSelected,
                    ]}
                  >
                    ${amount >= 1000 ? `${amount / 1000}k` : amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                !isValidGoal && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isValidGoal}
            >
              <Text style={styles.saveButtonText}>Set Goal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {currentGoal && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
              >
                <Text style={styles.clearButtonText}>Clear Goal</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.disableButton}
              onPress={handleDisable}
            >
              <Text style={styles.disableButtonText}>Disable Goals</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '20',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.modalIconInfo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.card,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inputSection: {
    width: '100%',
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  inputWrapperError: {
    borderColor: colors.loss,
  },
  dollarSign: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    padding: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.loss,
  },
  presetsSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  presetChipTextSelected: {
    color: colors.primary,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.background,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  clearButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    color: colors.loss,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
  disableButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  disableButtonText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
});
