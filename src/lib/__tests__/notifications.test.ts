// Push Notification Library Tests
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import {
  registerForPushNotifications,
  savePushToken,
  deactivatePushToken,
} from '../notifications';
import { supabase } from '../supabase';

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id-123',
      },
    },
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('notifications library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerForPushNotifications', () => {
    it('should return null when not on a physical device', async () => {
      // Override isDevice to false
      (Device as { isDevice: boolean }).isDevice = false;

      const result = await registerForPushNotifications();

      expect(result).toBeNull();
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();

      // Reset for other tests
      (Device as { isDevice: boolean }).isDevice = true;
    });

    it('should return null when permission is denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await registerForPushNotifications();

      expect(result).toBeNull();
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return token when permission is already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[xxxxxx]',
      });

      const result = await registerForPushNotifications();

      expect(result).toEqual({
        token: 'ExponentPushToken[xxxxxx]',
        deviceType: 'ios',
      });
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: 'test-project-id-123',
      });
    });

    it('should request permission when not already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[yyyyyy]',
      });

      const result = await registerForPushNotifications();

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(result).toEqual({
        token: 'ExponentPushToken[yyyyyy]',
        deviceType: 'ios',
      });
    });

    it('should return null when getExpoPushTokenAsync throws', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token fetch failed')
      );

      const result = await registerForPushNotifications();

      expect(result).toBeNull();
    });

    it('should use projectId from Constants.expoConfig', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[zzzzzz]',
      });

      await registerForPushNotifications();

      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
    });
  });

  describe('savePushToken', () => {
    const mockToken = {
      token: 'ExponentPushToken[test]',
      deviceType: 'ios' as const,
    };

    it('should return false when no authenticated user', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await savePushToken(mockToken);

      expect(result).toBe(false);
    });

    it('should upsert token for authenticated user', async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await savePushToken(mockToken);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('push_tokens');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          token: 'ExponentPushToken[test]',
          device_type: 'ios',
          is_active: true,
        }),
        { onConflict: 'user_id,token' }
      );
    });

    it('should return false when upsert fails', async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const mockUpsert = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      });
      (supabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await savePushToken(mockToken);

      expect(result).toBe(false);
    });
  });

  describe('deactivatePushToken', () => {
    it('should update token to inactive', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({ eq: mockEq });

      await deactivatePushToken('ExponentPushToken[test]');

      expect(supabase.from).toHaveBeenCalledWith('push_tokens');
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(mockEq).toHaveBeenCalledWith('token', 'ExponentPushToken[test]');
    });

    it('should handle errors gracefully', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockRejectedValue(new Error('Database error'));

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({ eq: mockEq });

      // Should not throw
      await expect(
        deactivatePushToken('ExponentPushToken[test]')
      ).resolves.not.toThrow();
    });
  });
});
