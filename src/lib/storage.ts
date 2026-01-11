// AsyncStorage Helpers
// Typed wrappers for AsyncStorage operations

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys used throughout the app
export const STORAGE_KEYS = {
  USER_SETTINGS: '@palletpulse/user-settings',
  OFFLINE_QUEUE: '@palletpulse/offline-queue',
  LAST_SYNC: '@palletpulse/last-sync',
  DRAFT_PALLET: '@palletpulse/draft-pallet',
  DRAFT_ITEM: '@palletpulse/draft-item',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Get a value from AsyncStorage with type safety
 */
export async function getStorageItem<T>(key: StorageKey): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return null;
  }
}

/**
 * Set a value in AsyncStorage with type safety
 */
export async function setStorageItem<T>(key: StorageKey, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
    return false;
  }
}

/**
 * Remove a value from AsyncStorage
 */
export async function removeStorageItem(key: StorageKey): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
    return false;
  }
}

/**
 * Clear all PalletPulse data from AsyncStorage
 */
export async function clearAllStorage(): Promise<boolean> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    console.error('Error clearing all storage:', error);
    return false;
  }
}
