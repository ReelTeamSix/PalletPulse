// Haptics Utility Tests
// expo-haptics is mocked globally in jest.setup.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  initializeHaptics,
  isHapticsEnabled,
  getHapticsLevel,
  setHapticsEnabled,
  setHapticsLevel,
  haptics,
  HapticsLevel,
} from '../haptics';

describe('haptics utility', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    // Re-initialize haptics with default values
    await initializeHaptics();
  });

  describe('initializeHaptics', () => {
    it('should initialize with defaults when no stored values exist', async () => {
      await AsyncStorage.clear();
      await initializeHaptics();

      expect(isHapticsEnabled()).toBe(true);
      expect(getHapticsLevel()).toBe('enhanced');
    });

    it('should restore enabled state from storage', async () => {
      await AsyncStorage.setItem('haptics_enabled', 'false');
      await initializeHaptics();

      expect(isHapticsEnabled()).toBe(false);
    });

    it('should restore level from storage', async () => {
      await AsyncStorage.setItem('haptics_level', 'minimal');
      await initializeHaptics();

      expect(getHapticsLevel()).toBe('minimal');
    });

    it('should handle storage errors gracefully', async () => {
      const mockError = new Error('Storage error');
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(mockError);

      await initializeHaptics();

      // Should default to enabled
      expect(isHapticsEnabled()).toBe(true);
    });
  });

  describe('setHapticsEnabled', () => {
    it('should update enabled state and persist to storage', async () => {
      await setHapticsEnabled(false);

      expect(isHapticsEnabled()).toBe(false);
      expect(await AsyncStorage.getItem('haptics_enabled')).toBe('false');
    });

    it('should enable haptics and persist', async () => {
      await setHapticsEnabled(false);
      await setHapticsEnabled(true);

      expect(isHapticsEnabled()).toBe(true);
      expect(await AsyncStorage.getItem('haptics_enabled')).toBe('true');
    });
  });

  describe('setHapticsLevel', () => {
    it('should update level and persist to storage', async () => {
      await setHapticsLevel('minimal');

      expect(getHapticsLevel()).toBe('minimal');
      expect(await AsyncStorage.getItem('haptics_level')).toBe('minimal');
    });

    it('should update to off level', async () => {
      await setHapticsLevel('off');

      expect(getHapticsLevel()).toBe('off');
      expect(isHapticsEnabled()).toBe(false); // off level means disabled
    });
  });

  describe('haptics.light', () => {
    it('should trigger light impact when enabled', async () => {
      await setHapticsEnabled(true);
      await setHapticsLevel('enhanced');

      haptics.light();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not trigger when disabled', async () => {
      await setHapticsEnabled(false);

      haptics.light();

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('should not trigger when level is off', async () => {
      await setHapticsLevel('off');

      haptics.light();

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('should not trigger when level is minimal (light is enhanced-only)', async () => {
      await setHapticsLevel('minimal');

      haptics.light();

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('haptics.medium', () => {
    it('should trigger medium impact when enabled', async () => {
      await setHapticsEnabled(true);
      await setHapticsLevel('enhanced');

      haptics.medium();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should trigger on minimal level (medium is important)', async () => {
      await setHapticsLevel('minimal');

      haptics.medium();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should not trigger when disabled', async () => {
      await setHapticsEnabled(false);

      haptics.medium();

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('haptics.heavy', () => {
    it('should trigger heavy impact when enabled', async () => {
      await setHapticsEnabled(true);
      await setHapticsLevel('enhanced');

      haptics.heavy();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });

    it('should trigger on minimal level', async () => {
      await setHapticsLevel('minimal');

      haptics.heavy();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });
  });

  describe('haptics.success', () => {
    it('should trigger success notification when enabled', async () => {
      await setHapticsEnabled(true);

      haptics.success();

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    it('should trigger on minimal level', async () => {
      await setHapticsLevel('minimal');

      haptics.success();

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    it('should not trigger when disabled', async () => {
      await setHapticsEnabled(false);

      haptics.success();

      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('haptics.warning', () => {
    it('should trigger warning notification when enabled', async () => {
      await setHapticsEnabled(true);

      haptics.warning();

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    });

    it('should not trigger when disabled', async () => {
      await setHapticsEnabled(false);

      haptics.warning();

      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('haptics.error', () => {
    it('should trigger error notification when enabled', async () => {
      await setHapticsEnabled(true);

      haptics.error();

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    });

    it('should not trigger when disabled', async () => {
      await setHapticsEnabled(false);

      haptics.error();

      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('haptics.selection', () => {
    it('should trigger selection feedback when enabled', async () => {
      await setHapticsEnabled(true);

      haptics.selection();

      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('should not trigger when disabled', async () => {
      await setHapticsEnabled(false);

      haptics.selection();

      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });

    it('should not trigger on minimal level (selection is enhanced-only)', async () => {
      await setHapticsLevel('minimal');

      haptics.selection();

      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle expo-haptics errors gracefully', async () => {
      await setHapticsEnabled(true);
      (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('Haptics failed'));

      // Should not throw
      expect(() => haptics.light()).not.toThrow();
    });
  });
});
