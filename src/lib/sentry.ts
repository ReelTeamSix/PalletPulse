/**
 * Sentry Configuration and Initialization
 *
 * Provides error tracking and performance monitoring for Pallet Pro.
 * Sentry captures uncaught exceptions, unhandled promise rejections,
 * and manually reported errors via the logger utility.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// =============================================================================
// Configuration
// =============================================================================

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

// App version from Expo config
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

// Environment based on __DEV__ flag
const ENVIRONMENT = __DEV__ ? 'development' : 'production';

// =============================================================================
// Initialization
// =============================================================================

/**
 * Check if Sentry is properly configured
 */
export function isSentryConfigured(): boolean {
  return Boolean(SENTRY_DSN && !SENTRY_DSN.includes('your-'));
}

/**
 * Initialize Sentry error tracking
 * Should be called as early as possible in app startup
 */
export function initializeSentry(): void {
  if (!isSentryConfigured()) {
    if (__DEV__) {
      // eslint-disable-next-line no-console -- Intentional startup message
      console.log('[Sentry] Not configured - set EXPO_PUBLIC_SENTRY_DSN in .env.local');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment tag for filtering in Sentry dashboard
    environment: ENVIRONMENT,

    // Release version for tracking issues across versions
    release: `pallet-pro@${APP_VERSION}`,

    // Only send errors in production (debug logs only in dev)
    enabled: !__DEV__,

    // Sample rate for performance monitoring (0.0 to 1.0)
    // Start with 20% to avoid quota issues
    tracesSampleRate: 0.2,

    // Capture 100% of error events
    sampleRate: 1.0,

    // Enable native crash reporting
    enableNative: true,

    // Enable auto session tracking
    enableAutoSessionTracking: true,

    // Session tracking interval (default: 30 seconds)
    sessionTrackingIntervalMillis: 30000,

    // Attach stack traces to all messages
    attachStacktrace: true,

    // Filter out sensitive data
    beforeSend(event) {
      // Remove any potentially sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          // Redact any auth tokens or passwords in URLs
          if (breadcrumb.data?.url) {
            breadcrumb.data.url = redactSensitiveUrl(breadcrumb.data.url as string);
          }
          return breadcrumb;
        });
      }

      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      return event;
    },

    // Filter out development noise
    ignoreErrors: [
      // Network errors that are expected
      'Network request failed',
      'Failed to fetch',
      'AbortError',
      // User cancelled operations
      'User cancelled',
      'Purchase cancelled',
      // React Native specific
      'Invariant Violation',
    ],

    // Don't report from localhost in production builds
    denyUrls: [/localhost/],
  });

  if (__DEV__) {
    // eslint-disable-next-line no-console -- Intentional startup message
    console.log('[Sentry] Initialized for environment:', ENVIRONMENT);
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Redact sensitive information from URLs
 */
function redactSensitiveUrl(url: string): string {
  // Redact access tokens
  url = url.replace(/access_token=[^&]+/gi, 'access_token=[REDACTED]');
  // Redact API keys
  url = url.replace(/api_key=[^&]+/gi, 'api_key=[REDACTED]');
  // Redact passwords
  url = url.replace(/password=[^&]+/gi, 'password=[REDACTED]');
  return url;
}

/**
 * Set user context for error tracking
 * Call after user authentication
 */
export function setSentryUser(userId: string, email?: string): void {
  if (!isSentryConfigured()) return;

  Sentry.setUser({
    id: userId,
    email: email,
  });
}

/**
 * Clear user context
 * Call on logout
 */
export function clearSentryUser(): void {
  if (!isSentryConfigured()) return;

  Sentry.setUser(null);
}

/**
 * Add custom tag for filtering
 */
export function setSentryTag(key: string, value: string): void {
  if (!isSentryConfigured()) return;

  Sentry.setTag(key, value);
}

/**
 * Capture a message (non-error) to Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!isSentryConfigured()) return;

  Sentry.captureMessage(message, level);
}

/**
 * Capture an exception to Sentry
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!isSentryConfigured()) return;

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

// =============================================================================
// Exports
// =============================================================================

export { Sentry };
