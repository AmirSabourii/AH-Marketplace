export function buildProductStudioPrompt(productName: string): string {
  const name = productName.trim() || 'the furniture product';

  return `You are a senior e-commerce product photography retoucher.

TASK
Turn the input photograph into a premium catalog product image.

PRODUCT TO ISOLATE (CRITICAL)
The sellable product is: "${name}"
- The photo may be a staged lifestyle scene (room, props, multiple items, default stock staging).
- Locate ONLY the item that best matches "${name}" by type, silhouette, materials, and color.
- Ignore all other furniture, decor, people, plants, and room architecture.
- If several similar items exist, choose the one that most clearly represents "${name}".

PRODUCT FIDELITY (HIGHEST PRIORITY — NON-NEGOTIABLE)
The output product MUST be the SAME physical item as in the reference — not a similar-looking substitute.
- Same exact shape, proportions, silhouette, and component count (legs, arms, drawers, shelves, cushions, panels, handles, etc.).
- Same exact colors and finishes on every visible part (wood tone, fabric, metal, glass, stone) — do not brighten, desaturate, recolor, or "improve" hues.
- Same upholstery pattern, grain direction, stitching, tufting, seams, and hardware style/placement.
- Same visible wear level and material texture; do not simplify or stylize geometry.
- If uncertain about a detail, copy it from the reference — never guess or invent.
- Do NOT merge features from other objects in the scene into this product.

CAMERA & FRAMING
- Re-compose so the product faces the camera on its primary merchandising angle (front or clean 3/4 front).
- Do not show the back unless the reference only allows that view.
- Make the product LARGE in frame: it should dominate the image (roughly 85–92% of frame height or width — whichever is limiting).
- Use tight, catalog-style cropping with minimal white margin (~4–6% on each side).
- Center the product; straighten verticals; level the product; no dutch angle.
- Do not shrink the product to leave excessive empty white space.

BACKGROUND (MANDATORY)
- Full background must be pure solid white: RGB(255,255,255).
- No gradients, no gray sweep, no studio cyclorama color cast.
- Optional: very subtle contact shadow only directly beneath the product on the white floor.

QUALITY
- Maximum sharpness and detail on the product surfaces.
- Clean anti-aliased edges; no halos, fringing, or muddy cutouts.

PROHIBITIONS
- No text, watermarks, badges, or new props.
- No redesign, no variant swap, no added/removed parts, no dimension changes.

OUTPUT
Return ONLY one high-resolution product image on pure white background with the product shown large and faithful to the reference.`;
}

export function buildProductStagedPrompt(productName: string): string {
  const name = productName.trim() || 'the furniture product';

  return `You are an elite lifestyle product photographer and interior visualizer for a premium furniture retailer.

TASK
Create a new, beautiful staged lifestyle photograph featuring the exact product from the input image.

PRODUCT TO FEATURE (CRITICAL)
The hero product is: "${name}"
- The input may already be catalog-style, white-background, or an existing staged/default stock photo with clutter.
- Identify ONLY the item matching "${name}" and use it as the sole hero piece in the new scene.
- Ignore other furniture or props from the input unless they are part of this same product.

PRODUCT FIDELITY (HIGHEST PRIORITY — NON-NEGOTIABLE)
The product in the output MUST be the SAME physical item as in the reference — not a similar substitute.
- Same exact shape, proportions, silhouette, and component count.
- Same exact colors, finishes, upholstery pattern, grain, stitching, tufting, seams, and hardware.
- Do not recolor, redesign, simplify geometry, or swap variants.
- If uncertain, copy from the reference — never invent.

QUALITY ENHANCEMENT
- Upscale perceived detail: sharper textures, cleaner edges, photorealistic materials.
- Fix compression artifacts and muddy cutouts from the source when present.
- Professional editorial lighting on the product.

NEW STAGED ENVIRONMENT (MANDATORY — NOT WHITE BACKGROUND)
- Replace the entire background with a NEW, cohesive, premium interior scene highly relevant to "${name}".
  Examples: sofa → elegant living room; dining table → refined dining area; bed → serene bedroom; desk → modern home office; outdoor chair → tasteful patio/terrace.
- The room must feel intentional, tidy, aspirational, and magazine-quality — never messy or cluttered.
- Complementary decor only (subtle rug, wall art, plant, side table) that supports the product category — do not steal focus from the hero product.
- Do NOT reuse the original room architecture, walls, floor, or layout from the input photo.

COMPOSITION & CAMERA
- Place the product as the clear hero (roughly 40–55% visual weight) with realistic scale and perspective.
- Camera: lifestyle 3/4 or front angle that best showcases the product; eye-level or slight elevation; no dutch angle.
- Perfect grounding: accurate contact shadows; product must not float.
- Lighting: soft natural or studio-window light with consistent direction across product and room.

PROHIBITIONS
- No pure white catalog background, no gray sweep, no cutout floating on empty void.
- No people, pets, text, logos, or watermarks.
- No extra hero furniture competing with "${name}".

OUTPUT
Return ONLY one high-resolution, photorealistic staged lifestyle image with the exact product beautifully placed in a new relevant interior.`;
}
