// FadeInView Component
// Wrapper that animates children with a fade-in and optional slide effect

import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { DURATION, EASING } from '@/src/lib/animations';

interface FadeInViewProps {
  /** Children to render */
  children: React.ReactNode;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Animation duration (ms) */
  duration?: number;
  /** Initial Y offset for slide effect */
  slideDistance?: number;
  /** Custom style */
  style?: StyleProp<ViewStyle>;
  /** Disable animation */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export function FadeInView({
  children,
  delay = 0,
  duration = DURATION.normal,
  slideDistance = 10,
  style,
  disabled = false,
  testID,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(disabled ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(disabled ? 0 : slideDistance)).current;

  useEffect(() => {
    if (disabled) return;

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: EASING.decelerate,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: EASING.decelerate,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [disabled, delay, duration, opacity, translateY]);

  const animatedStyle = {
    opacity,
    transform: [{ translateY }],
  };

  return (
    <Animated.View style={[style, animatedStyle]} testID={testID}>
      {children}
    </Animated.View>
  );
}
