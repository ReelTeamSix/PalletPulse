// Push Notification Service - Expo Notifications Integration
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';

import { supabase } from './supabase';
import type { NotificationType } from '@/src/types/database';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  token: string;
  deviceType: 'ios' | 'android';
}

/**
 * Register for push notifications and get the Expo push token
 * Returns null if permissions denied or not a physical device
 */
export async function registerForPushNotifications(): Promise<PushToken | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get the Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

    return {
      token: tokenData.data,
      deviceType,
    };
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Save the push token to Supabase for the current user
 */
export async function savePushToken(pushToken: PushToken): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user to save push token');
      return false;
    }

    // Upsert the token (insert or update if exists)
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        token: pushToken.token,
        device_type: pushToken.deviceType,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
      });

    if (error) {
      console.error('Failed to save push token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving push token:', error);
    return false;
  }
}

/**
 * Deactivate push token on logout
 */
export async function deactivatePushToken(token: string): Promise<void> {
  try {
    await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('token', token);
  } catch (error) {
    console.error('Error deactivating push token:', error);
  }
}

/**
 * Handle notification tap - navigate to appropriate screen
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data as {
    type?: NotificationType;
    itemId?: string;
    palletId?: string;
    screen?: string;
  } | null;

  if (!data) return;

  // Route based on notification type
  switch (data.type) {
    case 'stale_inventory':
      // Navigate to inventory with stale filter
      router.push('/(tabs)/inventory?filter=stale');
      break;

    case 'pallet_milestone':
      if (data.palletId) {
        router.push(`/pallets/${data.palletId}`);
      } else {
        router.push('/(tabs)/inventory');
      }
      break;

    case 'weekly_summary':
      router.push('/(tabs)/analytics');
      break;

    case 'subscription_reminder':
    case 'limit_warning':
      router.push('/(tabs)/settings');
      break;

    case 'system':
    default:
      // Navigate to notifications center
      router.push('/notifications');
      break;
  }
}

/**
 * Set up notification listeners
 * Call this once when the app starts
 */
export function setupNotificationListeners(): () => void {
  // Handle notification taps when app is in background/closed
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse
  );

  // Handle notifications received while app is in foreground
  const notificationSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      // Notification received in foreground - could trigger a refresh
      console.log('Notification received:', notification.request.content.title);
    }
  );

  // Return cleanup function
  return () => {
    responseSubscription.remove();
    notificationSubscription.remove();
  };
}

/**
 * Schedule a local notification (for testing or immediate alerts)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Immediate
  });

  return id;
}

/**
 * Get the current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all delivered notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await setBadgeCount(0);
}
