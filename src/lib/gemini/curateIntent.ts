import type { RoomCurateBrief } from './roomCurateBrief';

export const CURATE_INTENT_STORAGE_KEY = 'store-curate-intent-v2';
export const CURATE_INTENT_STORAGE_KEY_V1 = 'store-curate-intent-v1';
export const CURATE_WISH_MAX = 450;
/** @deprecated use CURATE_WISH_MAX */
export const CURATE_CUSTOM_NOTE_MAX = CURATE_WISH_MAX;

export interface CurateIntent {
  /** Free-form: family, products, mood, constraints — anything the customer shares */
  wish: string;
}

export const EMPTY_CURATE_INTENT: CurateIntent = { wish: '' };

/** Tap-to-add starters — appended to the wish field */
export const CURATE_WISH_SUGGESTIONS = [
  {
    id: 'modern',
    label: 'Modern & calm',
    insert: 'A modern, calm feel with clean lines.',
  },
  {
    id: 'kids-bunk',
    label: 'Kids · bunk bed',
    insert:
      'I have two young sons and I’m looking for a bunk bed that fits this room.',
  },
  {
    id: 'cozy',
    label: 'Warm & cozy',
    insert: 'Warm, cozy atmosphere — soft textures and gentle light.',
  },
  {
    id: 'storage',
    label: 'More storage',
    insert: 'We need more storage and uncluttered surfaces.',
  },
  {
    id: 'guest',
    label: 'Guest-ready',
    insert: 'Comfortable for overnight guests.',
  },
  {
    id: 'surprise',
    label: 'Surprise me',
    insert: 'Surprise me — cohesive but bold for this space.',
  },
] as const;

export function isCurateIntentEmpty(intent: CurateIntent): boolean {
  return !intent.wish.trim();
}

export function appendCurateWishSuggestion(
  current: string,
  snippet: string
): string {
  const base = current.trim();
  if (!base) return snippet.slice(0, CURATE_WISH_MAX);
  const joiner = base.endsWith('.') || base.endsWith('!') || base.endsWith('?') ? ' ' : '. ';
  return (base + joiner + snippet).slice(0, CURATE_WISH_MAX);
}

function loadV1Intent(): CurateIntent | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CURATE_INTENT_STORAGE_KEY_V1);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      customNote?: string;
      styleChipId?: string;
    };
    const parts: string[] = [];
    if (parsed.customNote?.trim()) parts.push(parsed.customNote.trim());
    if (parsed.styleChipId && parsed.styleChipId !== 'surprise') {
      parts.push(`Style direction: ${parsed.styleChipId.replace(/-/g, ' ')}.`);
    }
    if (!parts.length) return null;
    return { wish: parts.join(' ').slice(0, CURATE_WISH_MAX) };
  } catch {
    return null;
  }
}

export function loadSavedCurateIntent(): CurateIntent {
  if (typeof sessionStorage === 'undefined') return { ...EMPTY_CURATE_INTENT };
  try {
    const raw = sessionStorage.getItem(CURATE_INTENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CurateIntent & { customNote?: string }>;
      const wish = String(parsed.wish ?? parsed.customNote ?? '').slice(
        0,
        CURATE_WISH_MAX
      );
      return { wish };
    }
    return loadV1Intent() ?? { ...EMPTY_CURATE_INTENT };
  } catch {
    return { ...EMPTY_CURATE_INTENT };
  }
}

export function saveCurateIntent(intent: CurateIntent): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      CURATE_INTENT_STORAGE_KEY,
      JSON.stringify({
        wish: intent.wish.trim().slice(0, CURATE_WISH_MAX),
      })
    );
  } catch {
    /* quota / private mode */
  }
}

/** Short label for loading overlay */
export function formatCurateIntentLabel(intent: CurateIntent): string | null {
  const wish = intent.wish.trim();
  if (!wish) return null;
  if (wish.length <= 56) return wish;
  return `${wish.slice(0, 53)}…`;
}

/** Injected into Gemini room-brief and product-pick prompts */
export function formatCurateIntentForPrompt(intent: CurateIntent): string | null {
  const wish = intent.wish.trim();
  if (!wish) return null;

  return `CUSTOMER WISH (their own words — read carefully)
"${wish}"

How to use this:
- Treat every detail as a real constraint: family (e.g. two sons), specific products (bunk bed, sectional, desk), style, colors, budget hints, room use.
- When they name a product type, prefer matching store categories (bunk bed / kids bed → bed; more seating → sofa; etc.).
- Lifestyle and household needs outweigh generic style when both appear.
- Honor the wish when compatible with the photo; never fake windows, walls, or room size.
- If something cannot fit the architecture, express it through furniture, layout, and decor choices only.`;
}

/** Merge wish into an analyzed brief before product pick / staging */
export function applyCurateIntentToBrief(
  brief: RoomCurateBrief,
  intent?: CurateIntent
): RoomCurateBrief {
  const wish = intent?.wish.trim();
  if (!wish) return brief;

  return {
    ...brief,
    stagingNotes: [
      brief.stagingNotes,
      `Customer wish (follow when choosing and staging): ${wish}`,
    ]
      .filter(Boolean)
      .join(' '),
  };
}
