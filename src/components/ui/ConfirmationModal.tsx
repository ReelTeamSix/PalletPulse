import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';

type ModalType = 'delete' | 'warning' | 'success' | 'info';

interface ConfirmationModalProps {
  visible: boolean;
  type?: ModalType;
  title: string;
  message: string;
  infoText?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  onClose?: () => void;
}

const modalConfig: Record<ModalType, {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  primaryBg: string;
}> = {
  delete: {
    icon: 'trash-outline',
    iconBg: colors.modalIconDelete,
    iconColor: colors.loss,
    primaryBg: colors.loss,
  },
  warning: {
    icon: 'warning-outline',
    iconBg: colors.modalIconWarning,
    iconColor: colors.warning,
    primaryBg: colors.warning,
  },
  success: {
    icon: 'checkmark-circle-outline',
    iconBg: colors.modalIconSuccess,
    iconColor: colors.profit,
    primaryBg: colors.profit,
  },
  info: {
    icon: 'information-circle-outline',
    iconBg: colors.modalIconInfo,
    iconColor: colors.primary,
    primaryBg: colors.primary,
  },
};

export function ConfirmationModal({
  visible,
  type = 'info',
  title,
  message,
  infoText,
  primaryLabel = 'Confirm',
  secondaryLabel = 'Cancel',
  onPrimary,
  onSecondary,
  onClose,
}: ConfirmationModalProps) {
  const config = modalConfig[type];

  const handleSecondary = () => {
    if (onSecondary) {
      onSecondary();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose || handleSecondary}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose || handleSecondary} />
        <View style={[styles.modal, shadows.xl]}>
          <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
            <Ionicons name={config.icon} size={32} color={config.iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {infoText && (
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle"
                size={18}
                color={colors.primary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>{infoText}</Text>
            </View>
          )}

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.primaryButton, { backgroundColor: config.primaryBg }]}
              onPress={onPrimary}
            >
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSecondary}
            >
              <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
            </Pressable>
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
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  infoIcon: {
    marginRight: spacing.sm,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
