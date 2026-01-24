// Auth Store - Zustand store for authentication state management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User, AuthError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '@/src/lib/supabase';
import logger from '@/src/lib/logger';
import { createWelcomeNotification } from '@/src/lib/notification-triggers';

// Create redirect URL for auth callbacks (email confirmation, password reset)
const redirectUrl = Linking.createURL('auth/callback');

const log = logger.createLogger({ screen: 'AuthStore' });

export interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, affiliateCode?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  setSession: (session: Session | null) => void;
}

// Helper to format auth errors for users
function formatAuthError(error: AuthError): string {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please verify your email before signing in.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters.',
    'Unable to validate email address: invalid format': 'Please enter a valid email address.',
    'Email rate limit exceeded': 'Too many attempts. Please try again later.',
    'For security purposes, you can only request this once every 60 seconds': 'Please wait before requesting another password reset.',
  };

  return errorMessages[error.message] || error.message || 'An unexpected error occurred. Please try again.';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      // Initialize auth state from stored session
      initialize: async () => {
        try {
          set({ isLoading: true, error: null });

          // Get current session from Supabase
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            log.error('Error getting session', { action: 'initialize' }, error);
            set({ isLoading: false, isInitialized: true, error: formatAuthError(error) });
            return;
          }

          set({
            session,
            user: session?.user ?? null,
            isLoading: false,
            isInitialized: true,
          });

          // Set up auth state change listener
          supabase.auth.onAuthStateChange((_event, session) => {
            set({
              session,
              user: session?.user ?? null,
            });
          });
        } catch (err) {
          log.error('Error initializing auth', { action: 'initialize' }, err instanceof Error ? err : new Error(String(err)));
          set({
            isLoading: false,
            isInitialized: true,
            error: 'Failed to initialize authentication.',
          });
        }
      },

      // Sign up with email and password
      signUp: async (email: string, password: string, affiliateCode?: string) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectUrl,
              data: {
                affiliate_code: affiliateCode || null,
              },
            },
          });

          if (error) {
            const errorMessage = formatAuthError(error);
            set({ isLoading: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }

          // Check if email confirmation is required
          if (data.user && !data.session) {
            set({ isLoading: false });
            return {
              success: true,
              error: undefined,
            };
          }

          set({
            user: data.user,
            session: data.session,
            isLoading: false,
          });

          // Create welcome notification for new users
          createWelcomeNotification();

          return { success: true };
        } catch {
          const errorMessage = 'An unexpected error occurred during sign up.';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Sign in with email and password
      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            const errorMessage = formatAuthError(error);
            set({ isLoading: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }

          set({
            user: data.user,
            session: data.session,
            isLoading: false,
          });

          // Ensure welcome notification exists (handles users who signed up before this feature)
          createWelcomeNotification();

          return { success: true };
        } catch {
          const errorMessage = 'An unexpected error occurred during sign in.';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Sign out
      signOut: async () => {
        try {
          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.signOut();

          if (error) {
            log.error('Error signing out', { action: 'signOut' }, error);
          }

          set({
            user: null,
            session: null,
            isLoading: false,
          });
        } catch (err) {
          log.error('Error signing out', { action: 'signOut' }, err instanceof Error ? err : new Error(String(err)));
          set({
            user: null,
            session: null,
            isLoading: false,
          });
        }
      },

      // Request password reset email
      resetPassword: async (email: string) => {
        try {
          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: Linking.createURL('reset-password'),
          });

          if (error) {
            const errorMessage = formatAuthError(error);
            set({ isLoading: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }

          set({ isLoading: false });
          return { success: true };
        } catch {
          const errorMessage = 'An unexpected error occurred. Please try again.';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Update password (after reset)
      updatePassword: async (newPassword: string) => {
        try {
          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (error) {
            const errorMessage = formatAuthError(error);
            set({ isLoading: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }

          set({ isLoading: false });
          return { success: true };
        } catch {
          const errorMessage = 'An unexpected error occurred. Please try again.';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Set session (used by auth state change listener)
      setSession: (session: Session | null) => {
        set({
          session,
          user: session?.user ?? null,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: (state) => ({
        // We don't persist session here - Supabase handles that
        // This is just for any additional auth-related preferences
      }),
    }
  )
);
