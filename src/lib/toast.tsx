// Toast Context and Provider
// Global toast notification system

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastConfig, ToastType } from '@/src/components/ui/Toast';

interface ToastContextType {
  /** Show a toast notification */
  showToast: (config: ToastConfig) => void;
  /** Show a success toast */
  success: (message: string, action?: ToastConfig['action']) => void;
  /** Show an error toast */
  error: (message: string, action?: ToastConfig['action']) => void;
  /** Show an info toast */
  info: (message: string, action?: ToastConfig['action']) => void;
  /** Show a warning toast */
  warning: (message: string, action?: ToastConfig['action']) => void;
  /** Hide current toast */
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [visible, setVisible] = useState(false);
  const [currentToast, setCurrentToast] = useState<ToastConfig | null>(null);

  const showToast = useCallback((config: ToastConfig) => {
    // If a toast is already visible, hide it first
    if (visible) {
      setVisible(false);
      // Small delay to allow animation
      setTimeout(() => {
        setCurrentToast(config);
        setVisible(true);
      }, 250);
    } else {
      setCurrentToast(config);
      setVisible(true);
    }
  }, [visible]);

  const hideToast = useCallback(() => {
    setVisible(false);
  }, []);

  const createShorthand = useCallback(
    (type: ToastType) =>
      (message: string, action?: ToastConfig['action']) => {
        showToast({ type, message, action });
      },
    [showToast]
  );

  const value: ToastContextType = {
    showToast,
    success: createShorthand('success'),
    error: createShorthand('error'),
    info: createShorthand('info'),
    warning: createShorthand('warning'),
    hideToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {currentToast && (
        <Toast
          visible={visible}
          type={currentToast.type}
          message={currentToast.message}
          duration={currentToast.duration}
          action={currentToast.action}
          onHide={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast notifications
 *
 * @example
 * const toast = useToast();
 * toast.success('Item sold!');
 * toast.error('Failed to save');
 * toast.info('Syncing...');
 * toast.warning('Low inventory');
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Re-export types
export type { ToastConfig, ToastType };
