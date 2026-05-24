/* Premium spring physics — no linear easing anywhere */

export const easeOut = [0.22, 1, 0.36, 1] as const;
export const easeIn  = [0.64, 0, 0.78, 0] as const;

/* Staggered children entrance — pass custom delay via `i` */
export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 280,
      damping: 28,
      delay: i * 0.07,
    },
  }),
};

export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: easeOut },
  },
};

/* Sidebar panel — slides in from right */
export const slidePanel = {
  hidden:  { x: '100%' },
  visible: {
    x: 0,
    transition: { type: 'spring' as const, stiffness: 340, damping: 34 },
  },
  exit: {
    x: '100%',
    transition: { duration: 0.26, ease: easeIn },
  },
};

/* Bottom sheet — slides up from bottom */
export const slideSheet = {
  hidden:  { y: '100%' },
  visible: {
    y: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 36 },
  },
  exit: {
    y: '100%',
    transition: { duration: 0.24, ease: easeIn },
  },
};

/* Stagger container for orchestrated child reveals */
export const staggerContainer = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/* Scale + fade in for spot/callout elements */
export const spotReveal = {
  hidden:  { opacity: 0, scale: 0.80, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 24 },
  },
};
