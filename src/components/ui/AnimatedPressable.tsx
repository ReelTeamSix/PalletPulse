// AnimatedPressable Component
// A pressable component with built-in scale animation feedback

import React, { useRef, useCallback } from 'react';
import {
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  PressableProps,
} from 'react-native';
import { DURATION, EASING } from '@/src/lib/animations';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  /** Children to render */
  children: React.ReactNode;
  /** Custom style */
  style?: StyleProp<ViewStyle>;
  /** Scale when pressed (default: 0.97) */
  pressedScale?: number;
  /** Disable scale animation */
  disableAnimation?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export function AnimatedPressable({
  children,
  style,
  pressedScale = 0.97,
  disableAnimation = false,
  onPressIn,
  onPressOut,
  disabled,
  testID,
  ...props
}: AnimatedPressableProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (!disableAnimation && !disabled) {
        Animated.timing(scaleValue, {
          toValue: pressedScale,
          duration: DURATION.instant,
          easing: EASING.standard,
          useNativeDriver: true,
        }).start();
      }
      onPressIn?.(event);
    },
    [disableAnimation, disabled, pressedScale, scaleValue, onPressIn]
  );

  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      if (!disableAnimation && !disabled) {
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
      onPressOut?.(event);
    },
    [disableAnimation, disabled, scaleValue, onPressOut]
  );

  const animatedStyle = {
    transform: [{ scale: scaleValue }],
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      testID={testID}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
