import Browserbase from '@browserbasehq/sdk';
import { Stagehand } from '@browserbasehq/stagehand';
import type { EmitFn } from '../types.js';

export const SESSION_TIMEOUT_SEC = 3600;

export function createStagehand(apiKey: string, projectId: string): Stagehand {
  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey,
    projectId,
    keepAlive: true,
    model: 'google/gemini-2.5-flash',
    verbose: 0,
    actTimeoutMs: 90_000,
    domSettleTimeout: 4000,
    browserbaseSessionCreateParams: {
      projectId,
      keepAlive: true,
      timeout: SESSION_TIMEOUT_SEC,
    },
  });
}

export async function emitBrowserView(
  bb: Browserbase,
  sessionId: string,
  emit: EmitFn
): Promise<void> {
  try {
    const debug = await bb.sessions.debug(sessionId);
    const activePage = debug.pages.at(-1) ?? debug.pages[0];
    const liveViewUrl = activePage
      ? `${activePage.debuggerFullscreenUrl}&navbar=false`
      : `${debug.debuggerFullscreenUrl}&navbar=false`;

    emit('browser', {
      sessionId,
      liveViewUrl,
      debuggerUrl: activePage?.debuggerUrl ?? debug.debuggerUrl,
    });
  } catch (err) {
    emit('log', {
      level: 'warn',
      message: `Live view refresh failed: ${err instanceof Error ? err.message : String(err)}`,
      ts: Date.now(),
    });
  }
}

export async function initStagehandSession(
  apiKey: string,
  projectId: string,
  emit: EmitFn
): Promise<{ stagehand: Stagehand; bb: Browserbase; sessionId?: string }> {
  const bb = new Browserbase({ apiKey });
  const stagehand = createStagehand(apiKey, projectId);

  await stagehand.init();
  const sessionId = stagehand.browserbaseSessionID;

  if (sessionId) {
    emit('log', {
      level: 'info',
      message: `Session created: ${sessionId} (timeout ${SESSION_TIMEOUT_SEC}s)`,
      ts: Date.now(),
    });
    await emitBrowserView(bb, sessionId, emit);
  }

  return { stagehand, bb, sessionId };
}

export async function safeGoto(
  page: ReturnType<Stagehand['context']['pages']>[number],
  url: string,
  emit: EmitFn,
  label: string
): Promise<void> {
  emit('log', { level: 'info', message: `→ ${label}: ${url}`, ts: Date.now() });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 90_000 });
  await page.waitForTimeout(1500);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; label: string; emit: EmitFn }
): Promise<T> {
  const attempts = opts.attempts ?? 2;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        opts.emit('log', {
          level: 'warn',
          message: `${opts.label} failed (attempt ${i + 1}/${attempts}): ${err instanceof Error ? err.message : String(err)}`,
          ts: Date.now(),
        });
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  throw lastError;
}

export function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}
