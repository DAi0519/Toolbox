export const EASING = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
  drawer: [0.32, 0.72, 0, 1],
  soft: [0.22, 1, 0.36, 1],
} as const;

export const MOTION = {
  page: {
    duration: 0.24,
    ease: EASING.out,
  },
  overlay: {
    duration: 0.18,
    ease: EASING.out,
  },
  card: {
    duration: 0.22,
    ease: EASING.out,
  },
  settle: {
    type: 'spring',
    duration: 0.36,
    bounce: 0.12,
  },
  drawer: {
    type: 'spring',
    duration: 0.44,
    bounce: 0.05,
  },
  press: {
    type: 'spring',
    stiffness: 420,
    damping: 30,
    mass: 0.55,
  },
} as const;
