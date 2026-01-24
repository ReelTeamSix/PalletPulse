// Haptic Feedback Utility
// Provides tactile feedback for user interactions
// Research: Haptics reduce user errors and improve satisfaction by 15-20%

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_ENABLED_KEY = 'haptics_enabled';
const HAPTICS_LEVEL_KEY = 'haptics_level';

export type HapticsLevel = 'enhanced' | 'minimal' | 'off';

// Cache the settings to avoid async lookup on every haptic
let cachedEnabled: boolean | null = null;
let cachedLevel: HapticsLevel | null = null;

/**
 * Initialize haptics settings from storage
 * Call this on app start
 */
export async function initializeHaptics(): Promise<void> {
  try {
    const [enabledStr, levelStr] = await Promise.all([
      AsyncStorage.getItem(HAPTICS_ENABLED_KEY),
      AsyncStorage.getItem(HAPTICS_LEVEL_KEY),
    ]);

    cachedEnabled = enabledStr === null ? true : enabledStr === 'true';
    cachedLevel = (levelStr as HapticsLevel) || 'enhanced';
  } catch {
    // Default to enabled if storage fails
    cachedEnabled = true;
    cachedLevel = 'enhanced';
  }
}

/**
 * Check if haptics are enabled
 */
export function isHapticsEnabled(): boolean {
  return cachedEnabled !== false && cachedLevel !== 'off';
}

/**
 * Get current haptics level
 */
export function getHapticsLevel(): HapticsLevel {
  return cachedLevel || 'enhanced';
}

/**
 * Set haptics enabled state
 */
export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  cachedEnabled = enabled;
  await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, String(enabled));
}

/**
 * Set haptics level
 */
export async function setHapticsLevel(level: HapticsLevel): Promise<void> {
  cachedLevel = level;
  await AsyncStorage.setItem(HAPTICS_LEVEL_KEY, level);
}

/**
 * Internal function to check if haptics should fire
 */
function shouldTrigger(minLevel: HapticsLevel = 'enhanced'): boolean {
  if (!cachedEnabled || cachedLevel === 'off') return false;

  // 'minimal' level only triggers for important actions
  if (cachedLevel === 'minimal' && minLevel === 'enhanced') return false;

  return true;
}

/**
 * Haptic feedback utilities
 *
 * Usage:
 *   haptics.light()      // Light tap - button press
 *   haptics.medium()     // Medium tap - swipe threshold
 *   haptics.heavy()      // Heavy tap - significant action
 *   haptics.success()    // Success - item sold, save complete
 *   haptics.warning()    // Warning - before destructive action
 *   haptics.error()      // Error - validation failed
 *   haptics.selection()  // Selection - picker/toggle change
 */
export const haptics = {
  /**
   * Light impact - for button presses, minor interactions
   * Use: Button tap, card tap, chip selection
   */
  light: () => {
    if (!shouldTrigger('enhanced')) return;
    if (Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  },

  /**
   * Medium impact - for swipe thresholds, meaningful interactions
   * Use: Swipe gesture threshold reached, drag complete
   */
  medium: () => {
    if (!shouldTrigger('minimal')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },

  /**
   * Heavy impact - for significant actions
   * Use: Major state change, important confirmation
   */
  heavy: () => {
    if (!shouldTrigger('minimal')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },

  /**
   * Success notification - for completed actions
   * Use: Item sold, pallet created, expense saved, sync complete
   */
  success: () => {
    if (!shouldTrigger('minimal')) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },

  /**
   * Warning notification - before destructive actions
   * Use: Delete confirmation dialog appears
   */
  warning: () => {
    if (!shouldTrigger('minimal')) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },

  /**
   * Error notification - for failures and validation errors
   * Use: Form validation error, save failed, network error
   */
  error: () => {
    if (!shouldTrigger('minimal')) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },

  /**
   * Selection feedback - for picker/toggle changes
   * Use: Toggle switch, segmented control, picker wheel
   */
  selection: () => {
    if (!shouldTrigger('enhanced')) return;
    Haptics.selectionAsync().catch(() => {});
  },
};

export default haptics;
