/**
 * Centralized logging utility for Pallet Pro
 *
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Sentry integration for error tracking
 * - Context enrichment (user, screen, action)
 * - Breadcrumb trail for debugging
 * - Dev-only logging for debug/info levels
 */

import * as Sentry from '@sentry/react-native';

// =============================================================================
// Types
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** Screen or component name */
  screen?: string;
  /** Action being performed */
  action?: string;
  /** User ID (auto-populated if available) */
  userId?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: string;
}

// =============================================================================
// Configuration
// =============================================================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level for console output
const MIN_CONSOLE_LEVEL: LogLevel = __DEV__ ? 'debug' : 'warn';

// Whether to send breadcrumbs to Sentry
const ENABLE_SENTRY_BREADCRUMBS = true;

// Maximum breadcrumbs to keep in memory (for diagnostics export)
const MAX_BREADCRUMBS = 100;

// =============================================================================
// State
// =============================================================================

// In-memory breadcrumb storage for diagnostics
const breadcrumbs: LogEntry[] = [];

// Global context that gets added to all logs
let globalContext: LogContext = {};

// =============================================================================
// Internal Helpers
// =============================================================================

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_CONSOLE_LEVEL];
}

function formatMessage(entry: LogEntry): string {
  const parts = [
    `[${entry.level.toUpperCase()}]`,
    entry.context?.screen ? `[${entry.context.screen}]` : null,
    entry.context?.action ? `(${entry.context.action})` : null,
    entry.message,
  ].filter(Boolean);

  return parts.join(' ');
}

function addBreadcrumb(entry: LogEntry): void {
  // Add to in-memory storage
  breadcrumbs.push(entry);
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }

  // Add to Sentry if enabled
  if (ENABLE_SENTRY_BREADCRUMBS) {
    // Map our log levels to Sentry's severity levels
    const sentryLevel = entry.level === 'warn' ? 'warning' : entry.level;
    Sentry.addBreadcrumb({
      category: entry.context?.screen || 'app',
      message: entry.message,
      level: sentryLevel,
      data: entry.context,
      timestamp: Date.now() / 1000,
    });
  }
}

function logToConsole(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const message = formatMessage(entry);
  const args: unknown[] = [message];

  // Add context if present (excluding screen/action which are in message)
  const extraContext = { ...entry.context };
  delete extraContext.screen;
  delete extraContext.action;
  if (Object.keys(extraContext).length > 0) {
    args.push(extraContext);
  }

  // Add error if present
  if (entry.error) {
    args.push(entry.error);
  }

  /* eslint-disable no-console -- Logger is the authorized console output */
  switch (entry.level) {
    case 'debug':
      console.debug(...args);
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
  /* eslint-enable no-console */
}

function sendToSentry(entry: LogEntry): void {
  if (entry.level !== 'error' || !entry.error) return;

  Sentry.withScope((scope) => {
    // Add context as extra data
    if (entry.context) {
      Object.entries(entry.context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    // Add tags for filtering
    if (entry.context?.screen) {
      scope.setTag('screen', entry.context.screen);
    }
    if (entry.context?.action) {
      scope.setTag('action', entry.context.action);
    }

    // Capture the error
    Sentry.captureException(entry.error);
  });
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Set global context that gets added to all log entries
 * Useful for setting user ID after authentication
 */
export function setGlobalContext(context: LogContext): void {
  globalContext = { ...globalContext, ...context };

  // Also set Sentry user context
  if (context.userId) {
    Sentry.setUser({ id: context.userId });
  }
}

/**
 * Clear global context (e.g., on logout)
 */
export function clearGlobalContext(): void {
  globalContext = {};
  Sentry.setUser(null);
}

/**
 * Get current breadcrumbs for diagnostics export
 */
export function getBreadcrumbs(): LogEntry[] {
  return [...breadcrumbs];
}

/**
 * Clear breadcrumbs (e.g., after export)
 */
export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  contextOrError?: LogContext | Error,
  maybeError?: Error
): void {
  // Handle overloaded parameters
  let context: LogContext | undefined;
  let error: Error | undefined;

  if (contextOrError instanceof Error) {
    error = contextOrError;
  } else {
    context = contextOrError;
    error = maybeError;
  }

  const entry: LogEntry = {
    level,
    message,
    context: { ...globalContext, ...context },
    error,
    timestamp: new Date().toISOString(),
  };

  // Always add breadcrumb
  addBreadcrumb(entry);

  // Log to console based on level
  logToConsole(entry);

  // Send errors to Sentry
  if (level === 'error') {
    sendToSentry(entry);
  }
}

// =============================================================================
// Convenience Methods
// =============================================================================

/**
 * Debug level - only shown in development
 */
export function debug(message: string, context?: LogContext): void {
  log('debug', message, context);
}

/**
 * Info level - general information
 */
export function info(message: string, context?: LogContext): void {
  log('info', message, context);
}

/**
 * Warning level - potential issues
 */
export function warn(message: string, context?: LogContext): void {
  log('warn', message, context);
}

/**
 * Error level - errors that need attention
 * Automatically sent to Sentry in production
 */
export function error(
  message: string,
  errorOrContext?: Error | LogContext,
  maybeError?: Error
): void {
  log('error', message, errorOrContext, maybeError);
}

// =============================================================================
// Scoped Logger
// =============================================================================

/**
 * Create a scoped logger with preset context
 * Useful for creating screen-specific or feature-specific loggers
 *
 * @example
 * const log = createLogger({ screen: 'PalletDetail' });
 * log.info('Loading pallet', { palletId: '123' });
 * log.error('Failed to load', error);
 */
export function createLogger(defaultContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) =>
      debug(message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      info(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      warn(message, { ...defaultContext, ...context }),
    error: (message: string, errorOrContext?: Error | LogContext, maybeError?: Error) => {
      if (errorOrContext instanceof Error) {
        error(message, { ...defaultContext }, errorOrContext);
      } else {
        error(message, { ...defaultContext, ...errorOrContext }, maybeError);
      }
    },
  };
}

// =============================================================================
// Default Export
// =============================================================================

const logger = {
  debug,
  info,
  warn,
  error,
  createLogger,
  setGlobalContext,
  clearGlobalContext,
  getBreadcrumbs,
  clearBreadcrumbs,
};

export default logger;
