import type { GeminiRoomAnalysisRaw, GeminiRoomElementRaw } from './types';

/**
 * Parses the native Gemini spatial format:
 * [ymin, xmin, ymax, xmax] kind - label
 */
export function parseGeminiAnalysisJson(text: string): GeminiRoomAnalysisRaw {
  const elements: GeminiRoomElementRaw[] = [];
  
  // Matches: [100, 200, 300, 400] sofa - my blue sofa
  // Note: Gemini sometimes uses brackets, sometimes parenthesis, sometimes commas or spaces
  const regex = /\[(\d+)[,\s]+(\d+)[,\s]+(\d+)[,\s]+(\d+)\]\s*([a-zA-Z_]+)\s*[-:]?\s*([^\[\n]+)?/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const ymin = parseInt(match[1], 10);
    const xmin = parseInt(match[2], 10);
    const ymax = parseInt(match[3], 10);
    const xmax = parseInt(match[4], 10);
    
    // Ignore obviously invalid coordinates
    if (ymin >= ymax || xmin >= xmax) continue;
    
    elements.push({
      kind: match[5].toLowerCase(),
      label: match[6] ? match[6].trim() : match[5],
      confidence: 0.9, // Native spatial format implies high confidence
      replaceable: true, // We only request replaceable items in the new prompt
      box_2d: [ymin, xmin, ymax, xmax],
    });
  }

  if (elements.length === 0) {
    throw new Error('Could not read spatial coordinates from image scan.');
  }

  return { elements };
}
