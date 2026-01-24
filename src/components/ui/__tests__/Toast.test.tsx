// Toast Component Tests
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Toast } from '../Toast';

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

describe('Toast', () => {
  const mockOnHide = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should not render when not visible', () => {
      const { queryByText } = render(
        <Toast
          visible={false}
          type="success"
          message="Test message"
          onHide={mockOnHide}
        />
      );

      expect(queryByText('Test message')).toBeNull();
    });

    it('should render when visible', () => {
      const { getByText } = render(
        <Toast
          visible={true}
          type="success"
          message="Test message"
          onHide={mockOnHide}
        />
      );

      expect(getByText('Test message')).toBeTruthy();
    });

    it('should render success toast correctly', () => {
      const { getByText } = render(
        <Toast
          visible={true}
          type="success"
          message="Success!"
          onHide={mockOnHide}
        />
      );

      expect(getByText('Success!')).toBeTruthy();
    });

    it('should render error toast correctly', () => {
      const { getByText } = render(
        <Toast
          visible={true}
          type="error"
          message="Error occurred"
          onHide={mockOnHide}
        />
      );

      expect(getByText('Error occurred')).toBeTruthy();
    });

    it('should render info toast correctly', () => {
      const { getByText } = render(
        <Toast
          visible={true}
          type="info"
          message="Information"
          onHide={mockOnHide}
        />
      );

      expect(getByText('Information')).toBeTruthy();
    });

    it('should render warning toast correctly', () => {
      const { getByText } = render(
        <Toast
          visible={true}
          type="warning"
          message="Warning!"
          onHide={mockOnHide}
        />
      );

      expect(getByText('Warning!')).toBeTruthy();
    });
  });

  describe('action button', () => {
    it('should render action button when provided', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <Toast
          visible={true}
          type="info"
          message="Test"
          action={{ label: 'Undo', onPress: mockAction }}
          onHide={mockOnHide}
        />
      );

      expect(getByText('Undo')).toBeTruthy();
    });

    it('should call action onPress when pressed', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <Toast
          visible={true}
          type="info"
          message="Test"
          action={{ label: 'Undo', onPress: mockAction }}
          onHide={mockOnHide}
        />
      );

      fireEvent.press(getByText('Undo'));

      expect(mockAction).toHaveBeenCalled();
    });
  });

  describe('auto-dismiss', () => {
    it('should auto-dismiss after default duration', async () => {
      render(
        <Toast
          visible={true}
          type="success"
          message="Test"
          onHide={mockOnHide}
        />
      );

      // Default duration is 3000ms
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockOnHide).toHaveBeenCalled();
      });
    });

    it('should auto-dismiss after custom duration', async () => {
      render(
        <Toast
          visible={true}
          type="success"
          message="Test"
          duration={5000}
          onHide={mockOnHide}
        />
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockOnHide).toHaveBeenCalled();
      });
    });
  });

  describe('haptics', () => {
    it('should trigger success haptic for success toast', () => {
      const { haptics } = require('@/src/lib/haptics');

      render(
        <Toast
          visible={true}
          type="success"
          message="Test"
          onHide={mockOnHide}
        />
      );

      expect(haptics.success).toHaveBeenCalled();
    });

    it('should trigger error haptic for error toast', () => {
      const { haptics } = require('@/src/lib/haptics');

      render(
        <Toast
          visible={true}
          type="error"
          message="Test"
          onHide={mockOnHide}
        />
      );

      expect(haptics.error).toHaveBeenCalled();
    });

    it('should trigger warning haptic for warning toast', () => {
      const { haptics } = require('@/src/lib/haptics');

      render(
        <Toast
          visible={true}
          type="warning"
          message="Test"
          onHide={mockOnHide}
        />
      );

      expect(haptics.warning).toHaveBeenCalled();
    });
  });
});
