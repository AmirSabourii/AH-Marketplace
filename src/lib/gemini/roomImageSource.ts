async function blobUrlOrDataUriToFile(
  src: string,
  filename = 'room.jpg'
): Promise<File> {
  const res = await fetch(src);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

/**
 * Resolve the room photo sent to Gemini — original upload vs latest staged frame.
 */
export async function resolveRoomFileForAi(options: {
  preview: string | null;
  generatedImage: string | null;
  preferGenerated: boolean;
  roomFile: File | null;
}): Promise<File> {
  const { preview, generatedImage, preferGenerated, roomFile } = options;

  if (!preferGenerated && roomFile) {
    return roomFile;
  }

  if (preferGenerated && generatedImage) {
    return blobUrlOrDataUriToFile(generatedImage, 'room-staged.jpg');
  }

  if (preview) {
    return blobUrlOrDataUriToFile(preview, 'room-preview.jpg');
  }

  if (roomFile) {
    return roomFile;
  }

  if (generatedImage) {
    return blobUrlOrDataUriToFile(generatedImage, 'room-staged.jpg');
  }

  throw new Error('No room image available for AI staging.');
}
