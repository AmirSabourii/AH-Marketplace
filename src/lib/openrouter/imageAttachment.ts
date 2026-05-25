/** Convert a blob/object/data URL into a data URL suitable for OpenRouter vision APIs. */
export async function prepareImageForApi(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Could not read the room image for AI.');
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Could not encode the room image.'));
    };
    reader.onerror = () => reject(new Error('Could not encode the room image.'));
    reader.readAsDataURL(blob);
  });
}
