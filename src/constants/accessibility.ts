// Accessibility Constants
// WCAG 2.1 guidelines for touch targets and accessibility

/**
 * Minimum touch target sizes per WCAG 2.1 AA guidelines
 * - Level AA: 44x44px recommended minimum
 * - Level AAA: 48x48px or larger for optimal accessibility
 */
export const TOUCH_TARGET = {
  /** Minimum touch target (WCAG 2.1 Level AA) */
  MIN: 44,
  /** Comfortable touch target */
  COMFORTABLE: 48,
  /** Large touch target (easier for users with motor impairments) */
  LARGE: 56,
} as const;

/**
 * Hit slop values to extend touch area beyond visual bounds
 * Useful for small icons or buttons that need larger touch areas
 */
export const HIT_SLOP = {
  /** Small hit slop for tight layouts */
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  /** Medium hit slop for standard icons */
  md: { top: 12, bottom: 12, left: 12, right: 12 },
  /** Large hit slop for small interactive elements */
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;

/**
 * Minimum contrast ratios per WCAG 2.1 guidelines
 * Note: These are for reference; actual contrast checking requires color analysis
 */
export const CONTRAST_RATIO = {
  /** Normal text minimum (Level AA) */
  AA_NORMAL: 4.5,
  /** Large text minimum (Level AA) - 18pt or 14pt bold */
  AA_LARGE: 3.0,
  /** Normal text enhanced (Level AAA) */
  AAA_NORMAL: 7.0,
  /** Large text enhanced (Level AAA) */
  AAA_LARGE: 4.5,
} as const;

/**
 * Accessibility roles for React Native components
 */
export const A11Y_ROLE = {
  BUTTON: 'button',
  LINK: 'link',
  CHECKBOX: 'checkbox',
  SWITCH: 'switch',
  SLIDER: 'adjustable',
  HEADER: 'header',
  IMAGE: 'image',
  TEXT: 'text',
  SEARCH: 'search',
  ALERT: 'alert',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  RADIO: 'radio',
  TAB: 'tab',
  TABLIST: 'tablist',
  TIMER: 'timer',
  TOOLBAR: 'toolbar',
} as const;

/**
 * Common accessibility labels for reusable elements
 */
export const A11Y_LABELS = {
  // Actions
  CLOSE: 'Close',
  BACK: 'Go back',
  SEARCH: 'Search',
  MENU: 'Open menu',
  MORE: 'More options',
  DELETE: 'Delete',
  EDIT: 'Edit',
  ADD: 'Add',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  CONFIRM: 'Confirm',
  REFRESH: 'Refresh',

  // Navigation
  HOME: 'Go to home',
  SETTINGS: 'Open settings',
  NOTIFICATIONS: 'View notifications',

  // States
  LOADING: 'Loading',
  SELECTED: 'Selected',
  EXPANDED: 'Expanded',
  COLLAPSED: 'Collapsed',
} as const;

/**
 * Generate accessibility hint based on action
 */
export function getAccessibilityHint(action: string, target?: string): string {
  if (target) {
    return `Double tap to ${action.toLowerCase()} ${target}`;
  }
  return `Double tap to ${action.toLowerCase()}`;
}

/**
 * Generate accessibility label for a value
 */
export function getValueLabel(label: string, value: string | number): string {
  return `${label}: ${value}`;
}

/**
 * Check if a touch target meets minimum size requirements
 */
export function isValidTouchTarget(width: number, height: number): boolean {
  return width >= TOUCH_TARGET.MIN && height >= TOUCH_TARGET.MIN;
}
