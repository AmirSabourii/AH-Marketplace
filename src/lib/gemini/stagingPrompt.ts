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
