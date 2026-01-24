// Supabase Client Configuration
// This file initializes and exports the Supabase client for use throughout the app

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './logger';

// Environment variables - must be set in .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    'Supabase URL or Anon Key is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env',
    { screen: 'supabase' }
  );
}

// Create Supabase client
// Note: Type safety can be added later using `npx supabase gen types typescript`
// AsyncStorage is only used on native platforms (iOS/Android), not web/Node.js
// This prevents "window is not defined" errors during EAS Update export
export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      // Only use AsyncStorage on native platforms
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Helper to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    logger.error('Error getting current user', { screen: 'supabase', action: 'getUser' }, error);
    return null;
  }
  return user;
}

// Helper to get current session
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    logger.error('Error getting current session', { screen: 'supabase', action: 'getSession' }, error);
    return null;
  }
  return session;
}
