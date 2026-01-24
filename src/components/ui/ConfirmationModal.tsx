import React, { useEffect } from 'react';
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
import { fontFamily } from '@/src/constants/fonts';
import { haptics } from '@/src/lib/haptics';

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

  // Trigger haptic when modal becomes visible
  useEffect(() => {
    if (visible) {
      if (type === 'delete' || type === 'warning') {
        haptics.warning();
      } else if (type === 'success') {
        haptics.success();
      }
    }
  }, [visible, type]);

  const handlePrimary = () => {
    // Haptic feedback based on action type
    if (type === 'delete') {
      haptics.medium();
    } else if (type === 'success') {
      haptics.success();
    } else {
      haptics.light();
    }
    onPrimary();
  };

  const handleSecondary = () => {
    haptics.light();
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
          {/* Glow effect behind icon */}
          <View style={[styles.iconGlow, { backgroundColor: config.iconColor + '20' }]} />
          <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
            <Ionicons name={config.icon} size={36} color={config.iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {infoText && (
            <View style={styles.infoBox}>
              <Ionicons
                name="bulb-outline"
                size={20}
                color={colors.primary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>{infoText}</Text>
            </View>
          )}

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.primaryButton, { backgroundColor: config.primaryBg }]}
              onPress={handlePrimary}
            >
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
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
    borderRadius: 28,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconGlow: {
    position: 'absolute',
    top: spacing.xl - 8,
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.6,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.card,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.regular,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
