import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { discoverCatalog } from './agent/orchestrator.js';
import type { DiscoverRequestBody, EmitFn } from './types.js';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return origin;
      return 'http://localhost:5181';
    },
  })
);

app.get('/api/health', (c) => c.json({ ok: true }));

app.post('/api/discover', async (c) => {
  let body: DiscoverRequestBody;
  try {
    body = await c.req.json<DiscoverRequestBody>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { apiKey, projectId, url, categoryQuery, productsPerCategory } = body;
  if (!apiKey?.trim()) return c.json({ error: 'API key is required' }, 400);
  if (!projectId?.trim()) return c.json({ error: 'Project ID is required' }, 400);
  if (!url?.trim()) return c.json({ error: 'Store URL is required' }, 400);

  return streamSSE(c, async (stream) => {
    const pendingWrites: Promise<void>[] = [];

    const emit: EmitFn = (type, data) => {
      pendingWrites.push(
        stream.writeSSE({ event: type, data: JSON.stringify(data) }).catch(() => {})
      );
    };

    try {
      const result = await discoverCatalog({
        apiKey: apiKey.trim(),
        projectId: projectId.trim(),
        url: url.trim(),
        categoryQuery: categoryQuery?.trim() || undefined,
        productsPerCategory: productsPerCategory ?? 5,
        emit,
      });

      emit('result', result);
      emit('done', { ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emit('error', { message });
      emit('done', { ok: false });
    }

    await Promise.all(pendingWrites);
  });
});

const port = Number(process.env.PORT ?? 3456);

console.log(`Store Catalog Agent API → http://localhost:${port}`);

serve({ fetch: app.fetch, port });
