// Animation Utilities
// Reusable animation helpers for consistent micro-interactions across the app

import { Animated, Easing } from 'react-native';

// Duration constants (in ms)
export const DURATION = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

// Easing presets
export const EASING = {
  // Standard easing for most animations
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  // Decelerate for entering elements
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  // Accelerate for exiting elements
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),
  // Bounce for playful interactions
  bounce: Easing.bezier(0.175, 0.885, 0.32, 1.275),
} as const;

/**
 * Create a fade-in animation
 */
export function createFadeIn(
  animatedValue: Animated.Value,
  duration: number = DURATION.normal,
  delay: number = 0
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    delay,
    easing: EASING.decelerate,
    useNativeDriver: true,
  });
}

/**
 * Create a fade-out animation
 */
export function createFadeOut(
  animatedValue: Animated.Value,
  duration: number = DURATION.fast
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: EASING.accelerate,
    useNativeDriver: true,
  });
}

/**
 * Create a scale animation
 */
export function createScale(
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = DURATION.fast
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: EASING.standard,
    useNativeDriver: true,
  });
}

/**
 * Create a spring scale animation (for press feedback)
 */
export function createSpringScale(
  animatedValue: Animated.Value,
  toValue: number
): Animated.CompositeAnimation {
  return Animated.spring(animatedValue, {
    toValue,
    friction: 3,
    tension: 40,
    useNativeDriver: true,
  });
}

/**
 * Create a slide-in animation from bottom
 */
export function createSlideInUp(
  animatedValue: Animated.Value,
  distance: number = 20,
  duration: number = DURATION.normal
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: EASING.decelerate,
    useNativeDriver: true,
  });
}

/**
 * Create staggered animation for lists
 * @param animations Array of animations to stagger
 * @param staggerDelay Delay between each animation (default 50ms)
 */
export function createStaggered(
  animations: Animated.CompositeAnimation[],
  staggerDelay: number = 50
): Animated.CompositeAnimation {
  return Animated.stagger(staggerDelay, animations);
}

/**
 * Hook helper: Initialize animated value with fade in
 */
export function initFadeAnimation(): {
  opacity: Animated.Value;
  startFadeIn: (delay?: number) => void;
} {
  const opacity = new Animated.Value(0);

  const startFadeIn = (delay: number = 0) => {
    createFadeIn(opacity, DURATION.normal, delay).start();
  };

  return { opacity, startFadeIn };
}

/**
 * Hook helper: Initialize scale animation for press feedback
 */
export function initScaleAnimation(): {
  scale: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const scale = new Animated.Value(1);

  const onPressIn = () => {
    createScale(scale, 0.96, DURATION.instant).start();
  };

  const onPressOut = () => {
    createSpringScale(scale, 1).start();
  };

  return { scale, onPressIn, onPressOut };
}

/**
 * Create a pulse animation (for attention)
 */
export function createPulse(
  animatedValue: Animated.Value
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.05,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  );
}

/**
 * Create a shake animation (for errors)
 */
export function createShake(
  animatedValue: Animated.Value
): Animated.CompositeAnimation {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }),
  ]);
}
