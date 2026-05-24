export function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      'Gemini API key is missing. Add VITE_GEMINI_API_KEY to your .env file. Get a key at https://aistudio.google.com/apikey'
    );
  }
  return key.trim();
}
