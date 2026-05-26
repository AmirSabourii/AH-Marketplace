import { formatRoomBriefForStaging, type RoomCurateBrief } from './roomCurateBrief';

/** Shared zero-tolerance rules — duplicated in rearrange/curate so the model cannot miss them. */
const REARRANGE_ANTI_HALLUCINATION = `═══════════════════════════════════════════════
ZERO-HALLUCINATION CONTRACT (highest priority — overrides creativity)
═══════════════════════════════════════════════
This task is REPOSITION ONLY. You are moving existing objects, NOT decorating, NOT shopping, NOT "improving" with extras.

BEFORE you render, complete this silent checklist against Image 2:
  1. Count every distinct object instance (each chair, each cushion, each vase, each book stack, each lamp).
  2. Write the total count N.
  3. Your output must contain exactly N instances — no more, no fewer.

INSTANCE RULES (non-negotiable):
  • ONE physical object in Image 2 = ONE physical object in the output. Never two sofas if Image 2 has one sofa.
  • Never duplicate, clone, mirror-copy, or "add a matching pair" unless Image 2 already shows a pair.
  • Never add: extra cushions, extra pillows, extra plants, extra lamps, extra chairs, extra rugs, extra art, extra books, extra vases, extra trays, extra baskets, extra side tables.
  • Never remove, merge, or "declutter away" any visible object from Image 2 — even small items.
  • If Image 2 shows 3 cushions on the sofa, output shows 3 cushions (they may sit on different seats after rearrange).
  • If Image 2 shows 1 floor lamp, output shows 1 floor lamp (it may stand in a new spot).
  • Accessories move with the furniture they belong to — do not spawn new accessories.

FORBIDDEN (automatic failure):
  ✗ Higher object count than Image 2.
  ✗ Lower object count than Image 2.
  ✗ Removing, hiding, or cropping out ANY Tier A furniture (sofa, bed, table, chair, storage).
  ✗ Removing rugs or lamps (Tier B) to simplify the scene.
  ✗ Two of anything that appeared once in Image 2.
  ✗ New furniture, rugs, plants, art, lighting, or decor not visible in Image 2.
  ✗ "Decluttering" or "minimalist edit" that drops real customer items.
  ✗ "Styling additions" — no new throw blankets, no extra coffee-table books, no new plant pot.
  ✗ Stock-photo filler objects.

ALLOWED:
  ✓ Same objects, new positions, new orientations, new groupings.
  ✓ Minor overlap between moved pieces — but every Tier A / Tier B item must stay clearly visible (see protected list below).
  ✓ Slight overlap for small Tier C items only — each original instance must still exist exactly once.`;

/** Major furniture must stay in frame and recognizable — move, never delete or hide. */
const REARRANGE_PROTECT_MAJOR_ITEMS = `═══════════════════════════════════════════════
PROTECTED ITEMS — never remove, hide, or crop out (move them instead)
═══════════════════════════════════════════════
These are the customer's real belongings. Removing them is the worst failure mode.

TIER A — ALWAYS KEEP, FULLY VISIBLE:
Every large furniture piece in Image 2 must appear in the output, clearly recognizable, with most of its mass visible:
  sofa, sectional, loveseat, armchair, recliner, bed, mattress frame, headboard,
  dresser, wardrobe, desk, dining table, coffee table, console, side table, nightstand,
  bookcase, shelving unit, TV stand, ottoman, bench, cabinet.

Rules for Tier A:
  • MOVE them to a new position — never delete, never "declutter", never replace with empty floor.
  • Do NOT crop them out of frame, fade them away, or hide behind walls/doors.
  • Do NOT shrink them into illegible blobs or merge two pieces into one.
  • If partially overlapped by another moved piece, at least ~70% of each Tier A item must remain visible.
  • The room's main functional anchor (usually the largest sofa or bed) MUST remain the visual hero — relocated, not removed.

TIER B — IMPORTANT — KEEP UNLESS IMPOSSIBLE:
  area rug, curtains, floor lamp, table lamp, pendant light on cord.
  • Rugs and lamps must stay in the scene (new position is fine).
  • Never delete a rug to "simplify" the floor or remove lamps to "brighten" artificially.

TIER C — KEEP COUNT, may redistribute:
  cushions, throws, books, vases, plants, small decor — same count, new surfaces OK.

If space feels tight: rotate or slide Tier A pieces — do NOT omit any Tier A/B item to make room.`;

const CURATE_ANTI_HALLUCINATION = `═══════════════════════════════════════════════
ZERO-HALLUCINATION CONTRACT (highest priority — overrides creativity)
═══════════════════════════════════════════════
You may ONLY introduce objects that match a catalog reference image (images 2+). Everything else in the scene must come from Image 1.

INVENTORY RULES:
  1. Count every non-catalog object already in Image 1 (existing sofa, rug, lamp, cushions, plants, art, books, etc.).
  2. Those objects stay at the SAME COUNT unless a catalog piece REPLACES the same role (one out, one in).
  3. Each catalog reference image = exactly ONE instance in the output. Never place the same catalog product twice unless two separate reference images were provided.

REPLACE (one-for-one), never stack duplicates:
  • New catalog sofa → remove/hide the old sofa from view; do NOT show two sofas.
  • New catalog rug → remove the old rug; do NOT layer two rugs.
  • New catalog lamp → remove the old lamp of the same type if replacing; do NOT add a second lamp while keeping the first.
  • Empty zone → add ONE catalog piece from references. Do not fill with multiples of the same SKU.

FORBIDDEN (automatic failure):
  ✗ Extra cushions, pillows, throws, or duplicates of small decor.
  ✗ Two identical catalog items when only one reference was given.
  ✗ Furniture/lamps/rugs/art not in Image 1 and not matching any reference image.
  ✗ "Editorial styling" extras — no invented books, vases, plants, candles, frames, trays.
  ✗ Multiplying items: 1 lamp in room + 1 catalog lamp ≠ 2 lamps unless brief required filling an empty dark corner with the ONLY lamp reference.
  ✗ Keeping old piece AND new catalog piece for the same role (double sofa, double bed, double rug).

ALLOWED:
  ✓ Catalog products from reference images, placed once each, photorealistically.
  ✓ Existing Image 1 objects that were NOT replaced (same count as before).
  ✓ Generic non-branded clutter already in Image 1 (same count).`;

export interface StagingProductContext {
  name: string;
  description: string;
  variantName?: string;
  imageIndex: number;
}

export function buildRoomStagingPrompt(products: StagingProductContext[]): string {
  const productLines = products
    .map(
      (p) =>
        `- Reference image ${p.imageIndex}: "${p.name}"${
          p.variantName ? ` (${p.variantName} finish)` : ''
        }. ${p.description}`
    )
    .join('\n');

  return `You are an elite, highly precise interior visualization AI for a premium furniture retailer.

TASK
You must seamlessly composite the exact furniture piece(s) from the reference image(s) into the customer's room photograph.

INPUT MAPPING
- Image 1: Customer room photo (The Base Scene).
${productLines}

CRITICAL ANTI-HALLUCINATION RULES (MUST FOLLOW STRICTLY):
1. ZERO ALTERATIONS TO THE ROOM: You MUST NOT change the walls, floor, ceiling, windows, doors, or existing lighting fixtures. The room architecture must remain 100% pixel-perfect identical to Image 1.
2. NO EXTRA OBJECTS: You MUST NOT add plants, rugs, paintings, pets, people, or any other decor that is not explicitly provided in the reference images.
3. NO REMOVALS: Do not delete existing furniture unless the new product is clearly meant to replace it (e.g., placing a new sofa where an old sofa sits). Even then, keep the rest of the room untouched.
4. EXACT PRODUCT MATCH: The added product MUST look exactly like the reference image in shape, texture, and color. Do not invent new features for the product.

PLACEMENT & LIGHTING RULES:
1. Scale and Perspective: The product must be sized realistically for the room and align perfectly with the room's vanishing points and floor plane.
2. Grounding: The product MUST NOT float. Generate highly accurate contact shadows on the floor.
3. Lighting Match: The product's highlights and cast shadows must perfectly match the direction, color temperature, and softness of the lighting in Image 1.

OUTPUT
Return ONLY a single, highly photorealistic image of the staged room.`;
}

/** Re-layout furniture already visible in the customer's photo. */
export function buildRoomRearrangeExistingPrompt(): string {
  return `TASK TYPE: REPOSITION-ONLY EDIT — same objects, new places. Adding or duplicating any object is forbidden.

ROLE
You are a licensed residential interior designer and architectural photographer. You redesign REAL rooms for clients — not fantasy sets. You reposition what is already there so the space feels fresh, balanced, and more beautiful. You never add inventory.

INPUT
- Image 1: Customer's room — the BASE SCENE (architecture + camera are locked to this).
- Image 2: The SAME photograph — your inventory checklist. Every object you see here must still exist in the output.

═══════════════════════════════════════════════
PHASE A — INVENTORY (study Image 2 first)
═══════════════════════════════════════════════
Silently list every visible object in three tiers:

  TIER A — Major furniture: MUST stay in the image, clearly visible — only reposition (never remove).
  TIER B — Rugs & lamps: MUST stay in the image — only reposition (never remove to declutter).
  TIER C — Accessories: same count as Image 2 — may move to new surfaces.

${REARRANGE_PROTECT_MAJOR_ITEMS}

${REARRANGE_ANTI_HALLUCINATION}

═══════════════════════════════════════════════
PHASE B — LAYOUT PLAN (mandatory before rendering)
═══════════════════════════════════════════════
Plan at least FOUR concrete spatial moves. Each move must change which zone of the room an object occupies.

Use this floor grid mentally: LEFT | CENTER | RIGHT × FRONT (near camera) | MID | BACK (far wall).

Required moves (execute all that apply — by MOVING protected items, never omitting them):
  1. SOFA / MAIN SEATING (Tier A) — Must remain in frame. Move to a DIFFERENT wall or float in CENTER/MID facing the focal point. Never delete the sofa to open floor space.
  2. EVERY OTHER TIER A PIECE — Each bed, table, chair, dresser, shelf, etc. from Image 2 stays visible; move to a new zone (e.g. BACK-LEFT → CENTER-MID).
  3. RUG (Tier B) — Keep the same rug; re-anchor under the new seating zone.
  4. CHAIRS / SIDE TABLES (Tier A) — All chairs and tables from Image 2 remain; swap sides or pull off walls.
  5. LAMPS (Tier B) — Every lamp from Image 2 stays; relocate near seating.
  6. ACCESSORIES (Tier C) — Same count, new surfaces only.

Circulation: keep ≥70 cm walk paths from doors.
The result must be OBVIOUSLY different at a glance from Image 1 — not a tidy copy.

═══════════════════════════════════════════════
PHASE C — RENDER
═══════════════════════════════════════════════
Photoreal editorial quality:
  • Sharp textures (wood grain, fabric weave, metal, ceramic).
  • Correct contact shadows under every leg and rug edge.
  • Same white balance, sun direction, and time of day as Image 1.
  • No AI smooth/plastic/CGI look. Match or exceed Image 1 resolution.

LOCKED (pixel-identical to Image 1):
  • Walls, floor, ceiling, windows, doors, trim, built-ins, fixed lighting fixtures.
  • Camera position, angle, focal length, crop.

═══════════════════════════════════════════════
FINAL VERIFICATION (before returning the image)
═══════════════════════════════════════════════
Re-count every object in your output. If count ≠ Image 2 count, fix the image before returning.
Walk through every Tier A item from Image 2 (sofa, bed, tables, chairs, storage): each must be clearly visible in the output. If any major piece is missing or cropped out — re-render with it moved, not removed.
If you added even one extra pillow, vase, or chair — DELETE it and re-render.

SUCCESS CHECK (all must pass):
  1. Layout: client says "you moved the sofa / changed the layout" — not "nothing changed".
  2. Inventory: every original item — none missing, none doubled.
  3. Major furniture: every large piece from Image 2 is still there and recognizable — none removed for a "cleaner" look.

OUTPUT
One high-resolution photorealistic photograph. Image only, no text.`;
}

function formatProductLines(products: StagingProductContext[]): string {
  return products
    .map(
      (p) =>
        `- Reference image ${p.imageIndex}: "${p.name}"${
          p.variantName ? ` (${p.variantName} finish)` : ''
        }. ${p.description}`
    )
    .join('\n');
}

export function buildRoomCuratePrompt(
  products: StagingProductContext[],
  brief?: RoomCurateBrief
): string {
  const productLines = formatProductLines(products);
  const briefBlock = brief
    ? `${formatRoomBriefForStaging(brief)}\n\n`
    : '';

  return `TASK TYPE: CONTROLLED STAGING — only catalog reference products may be added; never duplicate items or invent decor.

ROLE
You are a senior residential interior designer AND an editorial interiors photographer. You stage real customer rooms with EXACT catalog products from our store — magazine-quality, believable, and visibly transformed. You never multiply object counts.

INPUT
- Image 1: Customer's room (BASE SCENE — architecture and camera locked).
- Reference images 2+: Catalog products you MUST place. Each reference is the ground truth for shape, color, and material.

${briefBlock}═══════════════════════════════════════════════
STEP 1 — READ IMAGE 1 (align with the room brief above)
═══════════════════════════════════════════════
Confirm room type, style, palette, light direction, scale, focal point, and what is already furnished vs. empty.

═══════════════════════════════════════════════
STEP 2 — CURATE & HARMONIZE (all listed products)
═══════════════════════════════════════════════
You MUST place EVERY catalog product listed below. Do not skip a selected piece.

Harmony rules:
  • Match "${brief?.style ?? 'the room style'}" and colors to: ${brief?.colorPalette ?? 'existing walls, floor, and trim'}.
  • Finishes and upholstery share a coherent family (wood tone, metal finish, textile palette).
  • Replace or visually supersede weak/mismatched existing pieces ONLY where the new catalog item serves the same role (e.g. new sofa where an old sofa sits). Remove the old piece from view when replaced.
  • Fill empty zones first: ${brief?.gapsToFill ?? 'seating, surfaces, rug, lighting'}.
  • ${brief?.stagingNotes ?? 'Create a finished editorial layout anchored on the focal point.'}

═══════════════════════════════════════════════
STEP 3 — STAGE LIKE A PROFESSIONAL PHOTO SHOOT
═══════════════════════════════════════════════
  • Anchor main seating (or bed) toward the focal point: ${brief?.focalPoint ?? 'strongest architectural feature'}.
  • Rug defines the zone — front legs of seating on rug when a rug is staged.
  • Layer light: catalog lamps near seating; match Image 1 light direction on all new shadows.
  • Float one major piece off the wall when the room is medium/large.
  • Do NOT add styling props that were not in Image 1 and are not catalog references.
  • Circulation ≥70 cm from doors. Balanced composition in frame.

${CURATE_ANTI_HALLUCINATION}

═══════════════════════════════════════════════
FINAL VERIFICATION (before returning the image)
═══════════════════════════════════════════════
For each catalog reference: exactly one instance, matching shape/color/material.
For each Image 1 object not replaced: still present, not duplicated.
If any item count increased vs. what Image 1 + catalog list allows — remove the extra and re-render.

═══════════════════════════════════════════════
PHOTOGRAPHY
═══════════════════════════════════════════════
Ultra-sharp, photoreal, contact shadows, natural color science matching Image 1. No blur, haze, or plastic CGI.

SELECTED CATALOG PRODUCTS (place all)
${productLines}

OUTPUT
One high-resolution photorealistic editorial photograph of the curated room. Image only, no text.`;
}
