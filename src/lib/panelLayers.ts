/** Central z-index ladder — higher panels must not fight ad-hoc values */
export const PANEL_Z = {
  productBackdrop: 40,
  productPanel: 50,
  aiCollapsed: 44,
  userBackdrop: 60,
  cartBackdrop: 60,
  userPanel: 70,
  cartPanel: 70,
  aiBackdrop: 72,
  aiPanel: 75,
  visualizerMobile: 50,
  aiVisualizerExpanded: 80,
} as const;
