// Accessibility Constants Tests
import {
  TOUCH_TARGET,
  HIT_SLOP,
  CONTRAST_RATIO,
  A11Y_ROLE,
  A11Y_LABELS,
  getAccessibilityHint,
  getValueLabel,
  isValidTouchTarget,
} from '../accessibility';

describe('Accessibility Constants', () => {
  describe('TOUCH_TARGET', () => {
    it('should have correct minimum touch target (44px WCAG AA)', () => {
      expect(TOUCH_TARGET.MIN).toBe(44);
    });

    it('should have comfortable touch target (48px)', () => {
      expect(TOUCH_TARGET.COMFORTABLE).toBe(48);
    });

    it('should have large touch target (56px)', () => {
      expect(TOUCH_TARGET.LARGE).toBe(56);
    });
  });

  describe('HIT_SLOP', () => {
    it('should have small hit slop', () => {
      expect(HIT_SLOP.sm).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
    });

    it('should have medium hit slop', () => {
      expect(HIT_SLOP.md).toEqual({ top: 12, bottom: 12, left: 12, right: 12 });
    });

    it('should have large hit slop', () => {
      expect(HIT_SLOP.lg).toEqual({ top: 16, bottom: 16, left: 16, right: 16 });
    });
  });

  describe('CONTRAST_RATIO', () => {
    it('should have correct AA normal text ratio', () => {
      expect(CONTRAST_RATIO.AA_NORMAL).toBe(4.5);
    });

    it('should have correct AA large text ratio', () => {
      expect(CONTRAST_RATIO.AA_LARGE).toBe(3.0);
    });

    it('should have correct AAA normal text ratio', () => {
      expect(CONTRAST_RATIO.AAA_NORMAL).toBe(7.0);
    });

    it('should have correct AAA large text ratio', () => {
      expect(CONTRAST_RATIO.AAA_LARGE).toBe(4.5);
    });
  });

  describe('A11Y_ROLE', () => {
    it('should have button role', () => {
      expect(A11Y_ROLE.BUTTON).toBe('button');
    });

    it('should have switch role', () => {
      expect(A11Y_ROLE.SWITCH).toBe('switch');
    });

    it('should have header role', () => {
      expect(A11Y_ROLE.HEADER).toBe('header');
    });
  });

  describe('A11Y_LABELS', () => {
    it('should have common action labels', () => {
      expect(A11Y_LABELS.CLOSE).toBe('Close');
      expect(A11Y_LABELS.BACK).toBe('Go back');
      expect(A11Y_LABELS.SAVE).toBe('Save');
      expect(A11Y_LABELS.CANCEL).toBe('Cancel');
    });

    it('should have navigation labels', () => {
      expect(A11Y_LABELS.HOME).toBe('Go to home');
      expect(A11Y_LABELS.SETTINGS).toBe('Open settings');
    });

    it('should have state labels', () => {
      expect(A11Y_LABELS.LOADING).toBe('Loading');
      expect(A11Y_LABELS.SELECTED).toBe('Selected');
    });
  });
});

describe('Accessibility Helper Functions', () => {
  describe('getAccessibilityHint', () => {
    it('should generate hint with action only', () => {
      const hint = getAccessibilityHint('Save');
      expect(hint).toBe('Double tap to save');
    });

    it('should generate hint with action and target', () => {
      const hint = getAccessibilityHint('Delete', 'this item');
      expect(hint).toBe('Double tap to delete this item');
    });

    it('should lowercase the action', () => {
      const hint = getAccessibilityHint('SUBMIT');
      expect(hint).toBe('Double tap to submit');
    });
  });

  describe('getValueLabel', () => {
    it('should combine label and string value', () => {
      const label = getValueLabel('Theme', 'Dark');
      expect(label).toBe('Theme: Dark');
    });

    it('should combine label and number value', () => {
      const label = getValueLabel('Items', 42);
      expect(label).toBe('Items: 42');
    });
  });

  describe('isValidTouchTarget', () => {
    it('should return true for valid touch target (44x44)', () => {
      expect(isValidTouchTarget(44, 44)).toBe(true);
    });

    it('should return true for larger touch target', () => {
      expect(isValidTouchTarget(48, 56)).toBe(true);
    });

    it('should return false when width is too small', () => {
      expect(isValidTouchTarget(36, 44)).toBe(false);
    });

    it('should return false when height is too small', () => {
      expect(isValidTouchTarget(44, 36)).toBe(false);
    });

    it('should return false when both dimensions are too small', () => {
      expect(isValidTouchTarget(32, 32)).toBe(false);
    });
  });
});
