// MPVP Animation Physics Reference

export const SPRING = {
  DEFAULT: { damping: 20, stiffness: 300, mass: 1 },
  BOUNCY: { damping: 12, stiffness: 150, mass: 1 },
  SNAPPY: { damping: 30, stiffness: 350, mass: 1 },
  MODAL: { damping: 28, stiffness: 300, mass: 1 },
  SCREEN: { damping: 25, stiffness: 200, mass: 1 },
  FILTER: { damping: 25, stiffness: 400, mass: 0.8 },
};

export const TIMING = {
  FAST: 150,
  DEFAULT: 200,
  MEDIUM: 300,
  SLOW: 400,
  SHIMMER: 1400,
  PROGRESS_SHIMMER: 1200,
  AUTO_SAVE_IN: 300,
  AUTO_SAVE_OUT: 500,
  TOGGLE: 200,
  TAB_SWITCH: 150,
  OFFLINE_BANNER: 200,
  ERROR_SHAKE: 300,
  SUCCESS_CHECK: 400,
  CHECKMARK_DRAW: 300,
  CHECKMARK_DELAY: 300,
};
