export type MasonryLayoutSlot = {
  /** Container width / height (CSS aspect-ratio). */
  aspectRatio: number;
  /** Main grid only — double-width card, image stays contained inside. */
  colSpan?: 1 | 2;
};

/** Two-column sidebar / compact shop rhythm. */
const SIDEBAR_RHYTHM: MasonryLayoutSlot[] = [
  { aspectRatio: 3 / 4 },
  { aspectRatio: 4 / 3 },
  { aspectRatio: 4 / 5 },
  { aspectRatio: 1 },
  { aspectRatio: 2 / 3 },
  { aspectRatio: 3 / 2 },
  { aspectRatio: 5 / 4 },
  { aspectRatio: 9 / 16 },
];

/** Full-width collection grid — mixed heights + occasional wide tiles. */
const MAIN_RHYTHM: MasonryLayoutSlot[] = [
  { aspectRatio: 3 / 4 },
  { aspectRatio: 4 / 3 },
  { aspectRatio: 2 / 3 },
  { aspectRatio: 1 },
  { aspectRatio: 3 / 2, colSpan: 2 },
  { aspectRatio: 4 / 5 },
  { aspectRatio: 9 / 16 },
  { aspectRatio: 16 / 9, colSpan: 2 },
  { aspectRatio: 5 / 4 },
  { aspectRatio: 3 / 4 },
  { aspectRatio: 1, colSpan: 2 },
  { aspectRatio: 2 / 3 },
];

export function getMasonryLayout(index: number, compact: boolean): MasonryLayoutSlot {
  const rhythm = compact ? SIDEBAR_RHYTHM : MAIN_RHYTHM;
  return rhythm[index % rhythm.length]!;
}

export function masonryAspectRatioStyle(ratio: number): { aspectRatio: string } {
  return { aspectRatio: String(ratio) };
}
