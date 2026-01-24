// Skeleton Component Tests
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonCard,
  SkeletonRow,
  SkeletonMetric,
  SkeletonList,
} from '../Skeleton';

// Mock Animated to avoid timing issues in tests
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = () => ({
    start: jest.fn(),
    stop: jest.fn(),
  });
  RN.Animated.loop = (animation: { start: jest.Mock; stop: jest.Mock }) => ({
    start: animation.start,
    stop: animation.stop,
  });
  RN.Animated.sequence = (animations: unknown[]) => animations[0];
  return RN;
});

describe('Skeleton', () => {
  describe('base Skeleton component', () => {
    it('should render with default props', () => {
      const { toJSON } = render(<Skeleton />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with custom width and height', () => {
      const { toJSON } = render(<Skeleton width={100} height={50} />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });

    it('should render with percentage width', () => {
      const { toJSON } = render(<Skeleton width="80%" height={20} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render circle variant', () => {
      const { toJSON } = render(<Skeleton variant="circle" height={40} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render without animation when animated is false', () => {
      const { toJSON } = render(<Skeleton animated={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should apply custom style', () => {
      const { toJSON } = render(<Skeleton style={{ marginTop: 10 }} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('SkeletonText', () => {
    it('should render with default props', () => {
      const { toJSON } = render(<SkeletonText />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with custom width', () => {
      const { toJSON } = render(<SkeletonText width="60%" />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with custom height', () => {
      const { toJSON } = render(<SkeletonText height={18} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('SkeletonCircle', () => {
    it('should render with default size', () => {
      const { toJSON } = render(<SkeletonCircle />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with custom size', () => {
      const { toJSON } = render(<SkeletonCircle size={60} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('SkeletonCard', () => {
    it('should render card skeleton with image and content', () => {
      const { toJSON } = render(<SkeletonCard />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
      // Card should contain multiple children (image, content area)
      expect(tree?.children?.length).toBeGreaterThan(0);
    });

    it('should apply custom style', () => {
      const { toJSON } = render(<SkeletonCard style={{ margin: 10 }} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('SkeletonRow', () => {
    it('should render row skeleton with icon and content', () => {
      const { toJSON } = render(<SkeletonRow />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(tree?.children?.length).toBeGreaterThan(0);
    });

    it('should apply custom style', () => {
      const { toJSON } = render(<SkeletonRow style={{ padding: 20 }} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('SkeletonMetric', () => {
    it('should render metric skeleton', () => {
      const { toJSON } = render(<SkeletonMetric />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(tree?.children?.length).toBeGreaterThan(0);
    });

    it('should apply custom style', () => {
      const { toJSON } = render(<SkeletonMetric style={{ flex: 1 }} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('SkeletonList', () => {
    it('should render 3 cards by default', () => {
      const { toJSON } = render(<SkeletonList />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(tree?.children?.length).toBe(3);
    });

    it('should render specified number of items', () => {
      const { toJSON } = render(<SkeletonList count={5} />);
      const tree = toJSON();
      expect(tree?.children?.length).toBe(5);
    });

    it('should render row variant', () => {
      const { toJSON } = render(<SkeletonList variant="row" count={2} />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(tree?.children?.length).toBe(2);
    });

    it('should apply custom style to container', () => {
      const { toJSON } = render(<SkeletonList style={{ padding: 16 }} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
