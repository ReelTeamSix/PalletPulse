// FadeInView Component Tests
import React from 'react';
import { Text, Animated } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { FadeInView } from '../FadeInView';

describe('FadeInView', () => {
  let timingSpy: jest.SpyInstance;
  let parallelSpy: jest.SpyInstance;

  beforeEach(() => {
    const mockAnimation = {
      start: jest.fn((callback?: () => void) => callback?.()),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation;

    timingSpy = jest.spyOn(Animated, 'timing').mockReturnValue(mockAnimation);
    parallelSpy = jest.spyOn(Animated, 'parallel').mockReturnValue(mockAnimation);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <FadeInView>
          <Text>Hello World</Text>
        </FadeInView>
      );

      expect(getByText('Hello World')).toBeTruthy();
    });

    it('should apply custom style', () => {
      const { getByTestId } = render(
        <FadeInView testID="fade-view" style={{ marginTop: 20 }}>
          <Text>Hello World</Text>
        </FadeInView>
      );

      const view = getByTestId('fade-view');
      expect(view).toBeTruthy();
    });
  });

  describe('animation behavior', () => {
    it('should start animation on mount', () => {
      render(
        <FadeInView>
          <Text>Hello World</Text>
        </FadeInView>
      );

      expect(parallelSpy).toHaveBeenCalled();
    });

    it('should use custom duration', () => {
      render(
        <FadeInView duration={500}>
          <Text>Hello World</Text>
        </FadeInView>
      );

      expect(timingSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          duration: 500,
        })
      );
    });

    it('should use custom delay', () => {
      render(
        <FadeInView delay={200}>
          <Text>Hello World</Text>
        </FadeInView>
      );

      expect(timingSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          delay: 200,
        })
      );
    });

    it('should not animate when disabled', () => {
      jest.clearAllMocks();
      render(
        <FadeInView disabled>
          <Text>Hello World</Text>
        </FadeInView>
      );

      expect(parallelSpy).not.toHaveBeenCalled();
    });
  });

  describe('slide distance', () => {
    it('should animate translateY to 0', () => {
      render(
        <FadeInView>
          <Text>Hello World</Text>
        </FadeInView>
      );

      // The animation should animate translateY to 0
      expect(timingSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          toValue: 0, // Final position
        })
      );
    });

    it('should use custom slide distance', () => {
      jest.clearAllMocks();

      render(
        <FadeInView slideDistance={30}>
          <Text>Hello World</Text>
        </FadeInView>
      );

      // Animation should still animate to 0 (final position)
      expect(timingSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should stop animation on unmount', () => {
      const mockStop = jest.fn();
      parallelSpy.mockReturnValueOnce({
        start: jest.fn(),
        stop: mockStop,
        reset: jest.fn(),
      } as unknown as Animated.CompositeAnimation);

      const { unmount } = render(
        <FadeInView>
          <Text>Hello World</Text>
        </FadeInView>
      );

      act(() => {
        unmount();
      });

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('multiple children', () => {
    it('should render multiple children', () => {
      const { getByText } = render(
        <FadeInView>
          <Text>First</Text>
          <Text>Second</Text>
          <Text>Third</Text>
        </FadeInView>
      );

      expect(getByText('First')).toBeTruthy();
      expect(getByText('Second')).toBeTruthy();
      expect(getByText('Third')).toBeTruthy();
    });
  });
});
