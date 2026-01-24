// Animation Utilities Tests
import { Animated } from 'react-native';
import {
  DURATION,
  EASING,
  createFadeIn,
  createFadeOut,
  createScale,
  createSpringScale,
  createSlideInUp,
  createStaggered,
  initFadeAnimation,
  initScaleAnimation,
  createPulse,
  createShake,
} from '../animations';

describe('Animation Constants', () => {
  describe('DURATION', () => {
    it('should have correct duration values', () => {
      expect(DURATION.instant).toBe(100);
      expect(DURATION.fast).toBe(150);
      expect(DURATION.normal).toBe(250);
      expect(DURATION.slow).toBe(350);
    });
  });

  describe('EASING', () => {
    it('should have all easing presets defined', () => {
      expect(EASING.standard).toBeDefined();
      expect(EASING.decelerate).toBeDefined();
      expect(EASING.accelerate).toBeDefined();
      expect(EASING.bounce).toBeDefined();
    });
  });
});

describe('Animation Creators', () => {
  let timingSpy: jest.SpyInstance;
  let springSpy: jest.SpyInstance;
  let loopSpy: jest.SpyInstance;
  let sequenceSpy: jest.SpyInstance;
  let staggerSpy: jest.SpyInstance;

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

    loopSpy = jest.spyOn(Animated, 'loop').mockReturnValue({
      start: jest.fn((callback?: () => void) => callback?.()),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);

    sequenceSpy = jest.spyOn(Animated, 'sequence').mockReturnValue({
      start: jest.fn((callback?: () => void) => callback?.()),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);

    staggerSpy = jest.spyOn(Animated, 'stagger').mockReturnValue({
      start: jest.fn((callback?: () => void) => callback?.()),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createFadeIn', () => {
    it('should create fade in animation with default duration', () => {
      const animatedValue = new Animated.Value(0);
      const animation = createFadeIn(animatedValue);

      expect(timingSpy).toHaveBeenCalledWith(
        animatedValue,
        expect.objectContaining({
          toValue: 1,
          duration: DURATION.normal,
          delay: 0,
          useNativeDriver: true,
        })
      );
      expect(animation).toHaveProperty('start');
    });

    it('should create fade in animation with custom duration and delay', () => {
      const animatedValue = new Animated.Value(0);
      createFadeIn(animatedValue, 500, 100);

      expect(timingSpy).toHaveBeenCalledWith(
        animatedValue,
        expect.objectContaining({
          duration: 500,
          delay: 100,
        })
      );
    });
  });

  describe('createFadeOut', () => {
    it('should create fade out animation', () => {
      const animatedValue = new Animated.Value(1);
      const animation = createFadeOut(animatedValue);

      expect(timingSpy).toHaveBeenCalledWith(
        animatedValue,
        expect.objectContaining({
          toValue: 0,
          duration: DURATION.fast,
          useNativeDriver: true,
        })
      );
      expect(animation).toHaveProperty('start');
    });
  });

  describe('createScale', () => {
    it('should create scale animation', () => {
      const animatedValue = new Animated.Value(1);
      const animation = createScale(animatedValue, 0.95);

      expect(timingSpy).toHaveBeenCalledWith(
        animatedValue,
        expect.objectContaining({
          toValue: 0.95,
          duration: DURATION.fast,
          useNativeDriver: true,
        })
      );
      expect(animation).toHaveProperty('start');
    });
  });

  describe('createSpringScale', () => {
    it('should create spring scale animation', () => {
      const animatedValue = new Animated.Value(0.95);
      const animation = createSpringScale(animatedValue, 1);

      expect(springSpy).toHaveBeenCalledWith(
        animatedValue,
        expect.objectContaining({
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        })
      );
      expect(animation).toHaveProperty('start');
    });
  });

  describe('createSlideInUp', () => {
    it('should create slide in animation', () => {
      const animatedValue = new Animated.Value(20);
      const animation = createSlideInUp(animatedValue);

      expect(timingSpy).toHaveBeenCalledWith(
        animatedValue,
        expect.objectContaining({
          toValue: 0,
          duration: DURATION.normal,
          useNativeDriver: true,
        })
      );
      expect(animation).toHaveProperty('start');
    });
  });

  describe('createStaggered', () => {
    it('should create staggered animation', () => {
      const animations = [
        createFadeIn(new Animated.Value(0)),
        createFadeIn(new Animated.Value(0)),
      ];
      const staggered = createStaggered(animations);

      expect(staggerSpy).toHaveBeenCalledWith(50, animations);
      expect(staggered).toHaveProperty('start');
    });

    it('should use custom stagger delay', () => {
      const animations = [createFadeIn(new Animated.Value(0))];
      createStaggered(animations, 100);

      expect(staggerSpy).toHaveBeenCalledWith(100, animations);
    });
  });

  describe('createPulse', () => {
    it('should create pulse animation', () => {
      const animatedValue = new Animated.Value(1);
      const animation = createPulse(animatedValue);

      expect(loopSpy).toHaveBeenCalled();
      expect(animation).toBeDefined();
    });
  });

  describe('createShake', () => {
    it('should create shake animation', () => {
      const animatedValue = new Animated.Value(0);
      const animation = createShake(animatedValue);

      expect(sequenceSpy).toHaveBeenCalled();
      expect(animation).toHaveProperty('start');
    });
  });
});

describe('Animation Helpers', () => {
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

  describe('initFadeAnimation', () => {
    it('should return opacity value and startFadeIn function', () => {
      const { opacity, startFadeIn } = initFadeAnimation();

      expect(opacity).toBeDefined();
      expect(typeof startFadeIn).toBe('function');
    });

    it('should call createFadeIn when startFadeIn is called', () => {
      const { startFadeIn } = initFadeAnimation();
      startFadeIn();

      expect(timingSpy).toHaveBeenCalled();
    });
  });

  describe('initScaleAnimation', () => {
    it('should return scale value and press handlers', () => {
      const { scale, onPressIn, onPressOut } = initScaleAnimation();

      expect(scale).toBeDefined();
      expect(typeof onPressIn).toBe('function');
      expect(typeof onPressOut).toBe('function');
    });

    it('should scale down on press in', () => {
      const { onPressIn } = initScaleAnimation();
      onPressIn();

      expect(timingSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          toValue: 0.96,
        })
      );
    });

    it('should spring back on press out', () => {
      const { onPressOut } = initScaleAnimation();
      onPressOut();

      expect(springSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          toValue: 1,
        })
      );
    });
  });
});
