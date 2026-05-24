export function buildRoomAnalysisPrompt(): string {
  return `You are a specialized 2D bounding box detection model for interior design.

Find the MAIN visible furniture items in this image.
Only detect these exact types: sofa, armchair, coffee_table, dining_table, chair, bed, rug, lamp, tv, plant, decor.
Do NOT detect architectural features (walls, ceiling, floor, windows, doors).
Do NOT detect humans, pets, or very tiny background objects.

Output FORMAT MUST BE exactly:
[ymin, xmin, ymax, xmax] type - short description

Where [ymin, xmin, ymax, xmax] are normalized coordinates mapped to integers from 0 to 1000.
(0,0) is top-left, (1000,1000) is bottom-right.
The bounding box MUST tightly hug the visible pixels of the object.

Example output:
[450, 120, 800, 750] sofa - blue velvet sectional
[750, 50, 950, 900] rug - geometric pattern area rug
[300, 700, 900, 850] lamp - brass floor lamp

Only output the list of boxes. No markdown, no json blocks, no conversational text.
Keep it under 15 distinct items.`;
}
