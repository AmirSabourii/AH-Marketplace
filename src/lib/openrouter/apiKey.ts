export function getOpenRouterApiKey(): string | null {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  return key?.trim() ? key.trim() : null;
}

export function getOpenRouterModel(): string {
  return (
    import.meta.env.VITE_OPENROUTER_MODEL?.trim() ||
    'google/gemini-2.0-flash-001'
  );
}

export function hasOpenRouterConfig(): boolean {
  return Boolean(getOpenRouterApiKey());
}
