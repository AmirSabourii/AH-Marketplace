/**
 * Medusa store API origin. In Vite dev, leave `VITE_MEDUSA_BACKEND_URL` unset so
 * requests go to same-origin `/store/*` (proxied to :9000). Set explicitly for
 * production builds or when not using the Vite dev server.
 */
export function getMedusaBackendUrl(): string {
  const url = import.meta.env.VITE_MEDUSA_BACKEND_URL?.trim();
  if (url) return url.replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'http://localhost:9000';
}
export function getMedusaPublishableKey(): string | undefined {
  const key = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY?.trim();
  return key || undefined;
}
