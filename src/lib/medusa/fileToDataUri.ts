const MAX_BYTES = 4_500_000;

export async function fileToDataUri(
  file: File,
  maxEdge = 1024,
  quality = 0.82
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare image');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const mime = file.type.startsWith('image/') ? file.type : 'image/jpeg';
  const dataUri = canvas.toDataURL(mime === 'image/png' ? 'image/png' : 'image/jpeg', quality);

  const comma = dataUri.indexOf(',');
  const b64Len = comma >= 0 ? dataUri.length - comma - 1 : dataUri.length;
  const approxBytes = (b64Len * 3) / 4;
  if (approxBytes > MAX_BYTES) {
    throw new Error('Image is too large. Use a smaller photo.');
  }

  return dataUri;
}
