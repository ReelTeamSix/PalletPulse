// AnimatedPressable Component Tests
import React from 'react';
import { Text, Animated } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AnimatedPressable } from '../AnimatedPressable';

describe('AnimatedPressable', () => {
  let timingSpy: jest.SpyInstance;
  let springSpy: jest.SpyInstance;

  beforeEach(() => {
    timingSpy = jest.spyOn(Animated, 'timing').mockReturnValue({
      start: jest.fn((callback?: () => void) => callback?.()),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);

    springSpy = jest.spyOn(Animated, 'spring').mockReturnValue({
      start: jest.fn((callback?: () => void) => callback?.()),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <AnimatedPressable onPress={jest.fn()}>
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      expect(getByText('Press Me')).toBeTruthy();
    });

    it('should apply custom style', () => {
      const { getByTestId } = render(
        <AnimatedPressable
          testID="animated-pressable"
          style={{ backgroundColor: 'red' }}
          onPress={jest.fn()}
        >
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      const pressable = getByTestId('animated-pressable');
      expect(pressable).toBeTruthy();
    });
  });

  describe('press interactions', () => {
    it('should call onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <AnimatedPressable onPress={mockOnPress}>
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent.press(getByText('Press Me'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <AnimatedPressable testID="pressable" disabled onPress={mockOnPress}>
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent.press(getByTestId('pressable'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should call onPressIn callback when provided', () => {
      const mockOnPressIn = jest.fn();
      const { getByTestId } = render(
        <AnimatedPressable
          testID="pressable"
          onPress={jest.fn()}
          onPressIn={mockOnPressIn}
        >
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent(getByTestId('pressable'), 'pressIn');

      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('should call onPressOut callback when provided', () => {
      const mockOnPressOut = jest.fn();
      const { getByTestId } = render(
        <AnimatedPressable
          testID="pressable"
          onPress={jest.fn()}
          onPressOut={mockOnPressOut}
        >
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent(getByTestId('pressable'), 'pressOut');

      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('animation behavior', () => {
    it('should trigger scale animation on press in', () => {
      const { getByTestId } = render(
        <AnimatedPressable testID="pressable" onPress={jest.fn()}>
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent(getByTestId('pressable'), 'pressIn');

      expect(timingSpy).toHaveBeenCalled();
    });

    it('should trigger spring animation on press out', () => {
      const { getByTestId } = render(
        <AnimatedPressable testID="pressable" onPress={jest.fn()}>
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent(getByTestId('pressable'), 'pressOut');

      expect(springSpy).toHaveBeenCalled();
    });

    it('should not animate when disableAnimation is true', () => {
      jest.clearAllMocks();
      const { getByTestId } = render(
        <AnimatedPressable
          testID="pressable"
          disableAnimation
          onPress={jest.fn()}
        >
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent(getByTestId('pressable'), 'pressIn');
      fireEvent(getByTestId('pressable'), 'pressOut');

      expect(timingSpy).not.toHaveBeenCalled();
      expect(springSpy).not.toHaveBeenCalled();
    });

    it('should not animate when disabled', () => {
      jest.clearAllMocks();
      const { getByTestId } = render(
        <AnimatedPressable testID="pressable" disabled onPress={jest.fn()}>
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent(getByTestId('pressable'), 'pressIn');
      fireEvent(getByTestId('pressable'), 'pressOut');

      expect(timingSpy).not.toHaveBeenCalled();
      expect(springSpy).not.toHaveBeenCalled();
    });
  });

  describe('custom scale', () => {
    it('should use custom pressedScale value', () => {
      const { getByTestId } = render(
        <AnimatedPressable
          testID="pressable"
          pressedScale={0.9}
          onPress={jest.fn()}
        >
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent(getByTestId('pressable'), 'pressIn');

      expect(timingSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          toValue: 0.9,
        })
      );
    });

    it('should use default pressedScale of 0.97', () => {
      const { getByTestId } = render(
        <AnimatedPressable testID="pressable" onPress={jest.fn()}>
          <Text>Press Me</Text>
        </AnimatedPressable>
      );

      fireEvent(getByTestId('pressable'), 'pressIn');

      expect(timingSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          toValue: 0.97,
        })
      );
    });
  });
});
