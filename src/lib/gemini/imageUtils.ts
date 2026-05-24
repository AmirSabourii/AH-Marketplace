export interface InlineImagePayload {
  data: string;
  mimeType: string;
}

export async function fileToInlineImage(file: File): Promise<InlineImagePayload> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: file.type || 'image/jpeg',
  };
}

export async function urlToInlineImage(url: string): Promise<InlineImagePayload> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load image: ${url}`);
  }
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: blob.type || 'image/png',
  };
}

export function loadImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not read image dimensions'));
    img.src = src;
  });
}

const ASPECT_RATIOS: { label: string; value: number }[] = [
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
  { label: '4:5', value: 4 / 5 },
  { label: '5:4', value: 5 / 4 },
  { label: '21:9', value: 21 / 9 },
];

export function closestAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  return ASPECT_RATIOS.reduce((best, candidate) =>
    Math.abs(candidate.value - ratio) < Math.abs(best.value - ratio) ? candidate : best
  ).label;
}
