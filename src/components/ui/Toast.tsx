// Toast Notification Component
// Provides non-intrusive feedback for user actions
// Research: Keep messages under 3 words, auto-dismiss in 3-5 seconds

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
import { shadows } from '@/src/constants/shadows';
import { haptics } from '@/src/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastConfig {
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastProps extends ToastConfig {
  visible: boolean;
  onHide: () => void;
}

const toastConfig: Record<ToastType, {
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  iconColor: string;
  textColor: string;
}> = {
  success: {
    icon: 'checkmark-circle',
    backgroundColor: colors.profit,
    iconColor: '#FFFFFF',
    textColor: '#FFFFFF',
  },
  error: {
    icon: 'alert-circle',
    backgroundColor: colors.loss,
    iconColor: '#FFFFFF',
    textColor: '#FFFFFF',
  },
  info: {
    icon: 'information-circle',
    backgroundColor: colors.primary,
    iconColor: '#FFFFFF',
    textColor: '#FFFFFF',
  },
  warning: {
    icon: 'warning',
    backgroundColor: colors.warning,
    iconColor: '#FFFFFF',
    textColor: '#FFFFFF',
  },
};

export function Toast({
  visible,
  type,
  message,
  duration = 3000,
  action,
  onHide,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const config = toastConfig[type];

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  }, [translateY, opacity, onHide]);

  useEffect(() => {
    if (visible) {
      // Trigger haptic based on type
      if (type === 'success') {
        haptics.success();
      } else if (type === 'error') {
        haptics.error();
      } else if (type === 'warning') {
        haptics.warning();
      }

      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      const timeout = setTimeout(hideToast, duration);
      return () => clearTimeout(timeout);
    }
  }, [visible, type, duration, translateY, opacity, hideToast]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        shadows.lg,
        {
          backgroundColor: config.backgroundColor,
          transform: [{ translateY }],
          opacity,
          bottom: insets.bottom + spacing.md,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.9}
        onPress={hideToast}
      >
        <Ionicons name={config.icon} size={20} color={config.iconColor} />
        <Text style={[styles.message, { color: config.textColor }]} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              haptics.light();
              action.onPress();
              hideToast();
            }}
          >
            <Text style={[styles.actionText, { color: config.textColor }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    borderRadius: borderRadius.lg,
    zIndex: 9999,
    maxWidth: SCREEN_WIDTH - spacing.md * 2,
    alignSelf: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },
});
