// Toast Context Tests
import React from 'react';
import { Text, Button } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ToastProvider, useToast } from '../toast';

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

// Mock haptics
jest.mock('@/src/lib/haptics', () => ({
  haptics: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    light: jest.fn(),
  },
}));

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = () => ({
    start: (callback?: () => void) => callback?.(),
    stop: jest.fn(),
  });
  RN.Animated.spring = () => ({
    start: (callback?: () => void) => callback?.(),
    stop: jest.fn(),
  });
  RN.Animated.parallel = (animations: { start: (cb?: () => void) => void }[]) => ({
    start: (callback?: () => void) => {
      animations.forEach((a) => a.start());
      callback?.();
    },
    stop: jest.fn(),
  });
  return RN;
});

// Test component that uses the toast hook
function TestComponent() {
  const toast = useToast();

  return (
    <>
      <Button title="Show Success" onPress={() => toast.success('Success!')} />
      <Button title="Show Error" onPress={() => toast.error('Error!')} />
      <Button title="Show Info" onPress={() => toast.info('Info!')} />
      <Button title="Show Warning" onPress={() => toast.warning('Warning!')} />
      <Button
        title="Show with Action"
        onPress={() =>
          toast.success('Done!', { label: 'Undo', onPress: jest.fn() })
        }
      />
    </>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render children', () => {
    const { getByText } = render(
      <ToastProvider>
        <Text>Child Content</Text>
      </ToastProvider>
    );

    expect(getByText('Child Content')).toBeTruthy();
  });

  it('should show success toast', async () => {
    const { getByText } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.press(getByText('Show Success'));

    await waitFor(() => {
      expect(getByText('Success!')).toBeTruthy();
    });
  });

  it('should show error toast', async () => {
    const { getByText } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.press(getByText('Show Error'));

    await waitFor(() => {
      expect(getByText('Error!')).toBeTruthy();
    });
  });

  it('should show info toast', async () => {
    const { getByText } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.press(getByText('Show Info'));

    await waitFor(() => {
      expect(getByText('Info!')).toBeTruthy();
    });
  });

  it('should show warning toast', async () => {
    const { getByText } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.press(getByText('Show Warning'));

    await waitFor(() => {
      expect(getByText('Warning!')).toBeTruthy();
    });
  });

  it('should show toast with action', async () => {
    const { getByText } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.press(getByText('Show with Action'));

    await waitFor(() => {
      expect(getByText('Done!')).toBeTruthy();
      expect(getByText('Undo')).toBeTruthy();
    });
  });
});

describe('useToast', () => {
  it('should throw error when used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      function InvalidComponent() {
        useToast();
        return null;
      }
      render(<InvalidComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });
});
