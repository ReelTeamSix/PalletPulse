import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius } from '@/src/constants/spacing';
import { shadows, ShadowKey } from '@/src/constants/shadows';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'flat' | 'outlined';
  shadow?: ShadowKey;
  padding?: keyof typeof spacing | number;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({
  children,
  variant = 'elevated',
  shadow = 'md',
  padding = 'md',
  style,
  onPress,
}: CardProps) {
  const paddingValue = typeof padding === 'number' ? padding : spacing[padding];

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: paddingValue,
    ...(variant === 'elevated' ? shadows[shadow] : {}),
    ...(variant === 'outlined' ? { borderWidth: 1, borderColor: colors.border } : {}),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
});
