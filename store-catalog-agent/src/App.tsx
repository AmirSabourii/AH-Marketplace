import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Globe,
  KeyRound,
  Loader2,
  Monitor,
  Play,
  Square,
  Store,
  Terminal,
  FolderTree,
  Phone,
  MapPin,
  Mail,
  Sofa,
  Home,
  Package,
  Palette,
  Ruler,
} from 'lucide-react';

interface CategoryItem {
  name: string;
  url: string;
  parent?: string;
}

interface ProductDetail {
  name: string;
  url: string;
  price?: string;
  originalPrice?: string;
  currency?: string;
  colors?: string[];
  description?: string;
  shortDescription?: string;
  images: string[];
  sku?: string;
  availability?: string;
  specifications?: Record<string, string>;
  dimensions?: string;
  material?: string;
}

interface CategoryProductsBundle {
  category: CategoryItem;
  products: ProductDetail[];
}

interface CatalogResult {
  sourceUrl: string;
  store: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  categories: CategoryItem[];
  categoryProducts?: CategoryProductsBundle[];
  meta: {
    method: string;
    sessionId?: string;
    durationMs: number;
    confidence: string;
  };
}

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  ts: number;
}

const STORAGE_KEY = 'store-catalog-agent-credentials';

function loadSaved(): { apiKey: string; projectId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { apiKey: '', projectId: '' };
    return JSON.parse(raw) as { apiKey: string; projectId: string };
  } catch {
    return { apiKey: '', projectId: '' };
  }
}

function levelColor(level: LogEntry['level']): string {
  switch (level) {
    case 'success':
      return 'text-emerald-400';
    case 'warn':
      return 'text-amber-400';
    case 'error':
      return 'text-red-400';
    default:
      return 'text-zinc-400';
  }
}

function ProductCard({ product, index }: { product: ProductDetail; index: number }) {
  const [activeImage, setActiveImage] = useState(0);
  const images = product.images?.length ? product.images : [];

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
      <div className="p-3 border-b border-zinc-800 flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-violet-400 font-medium">#{index + 1}</span>
          <h3 className="text-sm font-semibold text-white mt-0.5">{product.name}</h3>
          {product.shortDescription && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{product.shortDescription}</p>
          )}
        </div>
        <a
          href={product.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-violet-400 hover:underline shrink-0"
          dir="ltr"
        >
          صفحه محصول ↗
        </a>
      </div>

      {images.length > 0 && (
        <div className="p-3 space-y-2">
          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
            <img
              src={images[activeImage]}
              alt={product.name}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`size-12 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                    activeImage === i ? 'border-violet-500' : 'border-zinc-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-zinc-600">{images.length} تصویر</p>
        </div>
      )}

      <div className="px-3 pb-3 space-y-2 text-sm">
        <div className="flex flex-wrap items-baseline gap-2">
          {product.price && (
            <span className="text-emerald-400 font-semibold" dir="ltr">
              {product.price}
            </span>
          )}
          {product.originalPrice && (
            <span className="text-zinc-500 line-through text-xs" dir="ltr">
              {product.originalPrice}
            </span>
          )}
          {product.availability && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {product.availability}
            </span>
          )}
        </div>

        {product.colors && product.colors.length > 0 && (
          <p className="flex items-start gap-2 text-zinc-300 text-xs">
            <Palette className="size-3.5 mt-0.5 shrink-0 text-zinc-500" />
            {product.colors.join(' · ')}
          </p>
        )}

        {product.material && (
          <p className="text-xs text-zinc-400">
            <span className="text-zinc-600">جنس: </span>
            {product.material}
          </p>
        )}

        {product.dimensions && (
          <p className="flex items-center gap-2 text-xs text-zinc-400">
            <Ruler className="size-3.5 shrink-0 text-zinc-500" />
            {product.dimensions}
          </p>
        )}

        {product.sku && (
          <p className="text-xs text-zinc-500" dir="ltr">
            SKU: {product.sku}
          </p>
        )}

        {product.description && (
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-4">{product.description}</p>
        )}

        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-1 border-t border-zinc-800/80">
            {Object.entries(product.specifications).map(([key, val]) => (
              <div key={key}>
                <dt className="text-zinc-600">{key}</dt>
                <dd className="text-zinc-300">{val}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const saved = loadSaved();
  const [apiKey, setApiKey] = useState(saved.apiKey);
  const [projectId, setProjectId] = useState(saved.projectId);
  const [url, setUrl] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<{ step: number; total: number; label: string } | null>(
    null
  );
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [browserDisconnected, setBrowserDisconnected] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<CatalogResult | null>(null);
  const [streamingByCategory, setStreamingByCategory] = useState<Record<string, ProductDetail[]>>({});
  const [error, setError] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey, projectId }));
  }, [apiKey, projectId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === 'browserbase-disconnected') {
        setBrowserDisconnected(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, level, message, ts: Date.now() },
    ]);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
    addLog('warn', 'Stopped by user');
  }, [addLog]);

  const run = useCallback(async () => {
    if (!apiKey.trim() || !projectId.trim() || !url.trim()) {
      setError('API Key، Project ID و آدرس سایت الزامی است');
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);
    setStreamingByCategory({});
    setLogs([]);
    setProgress(null);
    setLiveViewUrl(null);
    setBrowserDisconnected(false);
    setIframeKey(0);
    setSessionId(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          projectId: projectId.trim(),
          url: url.trim(),
          categoryQuery: categoryQuery.trim() || undefined,
          productsPerCategory: 5,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errBody?.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;

          let eventType = 'message';
          let dataStr = '';

          for (const line of chunk.split('\n')) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            if (line.startsWith('data:')) dataStr = line.slice(5).trim();
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr) as Record<string, unknown>;

            switch (eventType) {
              case 'log':
                addLog(
                  (data.level as LogEntry['level']) ?? 'info',
                  String(data.message ?? '')
                );
                break;
              case 'progress':
                setProgress({
                  step: Number(data.step ?? 0),
                  total: Number(data.total ?? 1),
                  label: String(data.label ?? ''),
                });
                break;
              case 'browser':
                setSessionId(String(data.sessionId ?? ''));
                setLiveViewUrl(String(data.liveViewUrl ?? ''));
                setBrowserDisconnected(false);
                setIframeKey((k) => k + 1);
                addLog('info', 'Live browser view refreshed');
                break;
              case 'product': {
                const categoryName = String(data.category ?? 'Products');
                const product = data.product as ProductDetail;
                const index = Number(data.index ?? 0);
                setStreamingByCategory((prev) => {
                  const list = [...(prev[categoryName] ?? [])];
                  list[index] = product;
                  return { ...prev, [categoryName]: list.filter(Boolean) };
                });
                break;
              }
              case 'result':
                setResult(data as unknown as CatalogResult);
                break;
              case 'error':
                setError(String(data.message ?? 'Unknown error'));
                addLog('error', String(data.message ?? 'Unknown error'));
                break;
              case 'done':
                setRunning(false);
                break;
            }
          } catch {
            // ignore malformed SSE chunk
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog('error', msg);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [apiKey, projectId, url, categoryQuery, addLog]);

  const progressPct = progress ? Math.round((progress.step / progress.total) * 100) : 0;

  const productSections: CategoryProductsBundle[] =
    result?.categoryProducts ??
    Object.entries(streamingByCategory).map(([name, products]) => ({
      category: { name, url: '' },
      products,
    }));

  const hasProductActivity =
    productSections.some((s) => s.products.length > 0) ||
    (running &&
      (progress?.label?.includes('محصول') ||
        progress?.label?.includes('دسته') ||
        Object.keys(streamingByCategory).length > 0));

  function categoryIcon(name: string) {
    if (/living\s*room|نشیمن|نشین|پذیرایی/i.test(name)) return Home;
    if (/مبل|sofa|couch/i.test(name)) return Sofa;
    return Package;
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="size-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Store className="size-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Store Catalog Agent</h1>
            <p className="text-sm text-zinc-500">استخراج اطلاعات فروشگاه و دسته‌بندی با Browserbase</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid lg:grid-cols-2 gap-4">
        {/* Left: Form + Output */}
        <section className="flex flex-col gap-4 min-h-0">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <label className="block">
              <span className="text-xs text-zinc-500 flex items-center gap-1 mb-1">
                <KeyRound className="size-3" /> Browserbase API Key
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="bb_live_..."
                className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                disabled={running}
              />
            </label>

            <label className="block">
              <span className="text-xs text-zinc-500 flex items-center gap-1 mb-1">
                <KeyRound className="size-3" /> Project ID
              </span>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="از Dashboard → Settings"
                className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                disabled={running}
              />
            </label>

            <label className="block">
              <span className="text-xs text-zinc-500 flex items-center gap-1 mb-1">
                <FolderTree className="size-3" /> دسته برای استخراج محصول (اختیاری)
              </span>
              <input
                type="text"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                placeholder="مثلاً living room یا مبل — خالی = انتخاب خودکار"
                className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                disabled={running}
              />
            </label>

            <label className="block">
              <span className="text-xs text-zinc-500 flex items-center gap-1 mb-1">
                <Globe className="size-3" /> آدرس فروشگاه
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example-shop.com"
                className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                disabled={running}
                dir="ltr"
              />
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-white transition-colors"
              >
                {running ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> در حال اجرا...
                  </>
                ) : (
                  <>
                    <Play className="size-4" /> شروع کشف
                  </>
                )}
              </button>
              {running && (
                <button
                  type="button"
                  onClick={stop}
                  className="flex items-center gap-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 px-4 py-2.5 text-sm transition-colors"
                >
                  <Square className="size-4" /> توقف
                </button>
              )}
            </div>

            {progress && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>{progress.label}</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {hasProductActivity ? (
            <div className="space-y-4">
              {productSections.length > 0 ? (
                productSections.map((section) => {
                  const Icon = categoryIcon(section.category.name);
                  return (
                    <div
                      key={section.category.name}
                      className="rounded-2xl border border-violet-900/40 bg-zinc-900 p-4 space-y-3"
                    >
                      <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Icon className="size-4 text-violet-400" />
                        محصولات {section.category.name}
                        <span className="text-zinc-600 font-normal">
                          ({section.products.length}/5)
                        </span>
                        {running && section.products.length < 5 && (
                          <Loader2 className="size-3.5 animate-spin text-violet-400" />
                        )}
                      </h2>
                      {section.products.length > 0 ? (
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                          {section.products.map((product, i) => (
                            <ProductCard
                              key={`${section.category.name}-${product.url}-${i}`}
                              product={product}
                              index={i}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 flex items-center gap-2">
                          <Package className="size-3.5" />
                          در حال استخراج محصولات...
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-violet-900/40 bg-zinc-900 p-4">
                  <p className="text-xs text-zinc-500 flex items-center gap-2">
                    <Package className="size-3.5" />
                    در حال انتخاب دسته و استخراج ۵ محصول...
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {result && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-4 flex-1 overflow-auto">
              <div>
                <h2 className="text-sm font-medium text-zinc-400 mb-2">اطلاعات فروشگاه</h2>
                <div className="space-y-2 text-sm">
                  <p className="text-white font-semibold text-base">{result.store.name}</p>
                  {result.store.address && (
                    <p className="flex items-start gap-2 text-zinc-300">
                      <MapPin className="size-4 mt-0.5 shrink-0 text-zinc-500" />
                      {result.store.address}
                    </p>
                  )}
                  {result.store.phone && (
                    <p className="flex items-center gap-2 text-zinc-300" dir="ltr">
                      <Phone className="size-4 shrink-0 text-zinc-500" />
                      {result.store.phone}
                    </p>
                  )}
                  {result.store.email && (
                    <p className="flex items-center gap-2 text-zinc-300" dir="ltr">
                      <Mail className="size-4 shrink-0 text-zinc-500" />
                      {result.store.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                  <FolderTree className="size-4" />
                  دسته‌بندی‌ها ({result.categories.length})
                </h2>
                <ul className="space-y-1 max-h-64 overflow-y-auto text-sm">
                  {result.categories.map((cat) => (
                    <li
                      key={`${cat.name}-${cat.url}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950/60 px-3 py-2 border border-zinc-800/60"
                    >
                      <span className="text-zinc-200">
                        {cat.parent ? (
                          <span className="text-zinc-500">{cat.parent} / </span>
                        ) : null}
                        {cat.name}
                      </span>
                      <a
                        href={cat.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-400 hover:underline text-xs shrink-0"
                        dir="ltr"
                      >
                        link
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-xs text-zinc-600 flex flex-wrap gap-3 pt-2 border-t border-zinc-800">
                <span>method: {result.meta.method}</span>
                <span>confidence: {result.meta.confidence}</span>
                <span>{(result.meta.durationMs / 1000).toFixed(1)}s</span>
                {result.meta.sessionId && <span dir="ltr">session: {result.meta.sessionId.slice(0, 8)}…</span>}
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">JSON خام</summary>
                <pre className="mt-2 p-3 rounded-lg bg-zinc-950 overflow-auto text-zinc-400" dir="ltr">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>

        {/* Right: Browser + Stream */}
        <section className="flex flex-col gap-4 min-h-[70vh] lg:min-h-0">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col flex-1 min-h-[320px]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
              <span className="text-xs text-zinc-500 flex items-center gap-2">
                <Monitor className="size-3.5" />
                Live Browser
                {running && <span className="size-2 rounded-full bg-emerald-500 animate-pulse-dot" />}
              </span>
              {sessionId && (
                <a
                  href={`https://browserbase.com/sessions/${sessionId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-violet-400 hover:underline"
                  dir="ltr"
                >
                  Session Inspector ↗
                </a>
              )}
            </div>
            <div className="flex-1 bg-black relative min-h-[280px]">
              {liveViewUrl ? (
                <>
                  <iframe
                    key={iframeKey}
                    src={liveViewUrl}
                    title="Browserbase Live View"
                    className="absolute inset-0 w-full h-full border-0"
                    sandbox="allow-same-origin allow-scripts"
                    allow="clipboard-read; clipboard-write"
                  />
                  {browserDisconnected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-zinc-300 text-sm px-4 text-center">
                      <div>
                        <p>اتصال Live View موقتاً قطع شد (معمولاً هنگام تغییر صفحه)</p>
                        <p className="text-xs text-zinc-500 mt-1">agent همچنان کار می‌کند — iframe خودکار refresh می‌شود</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <Monitor className="size-10 opacity-30" />
                  <p className="text-sm">پس از شروع، مرورگر زنده اینجا نمایش داده می‌شود</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 flex flex-col h-64">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500">
              <Terminal className="size-3.5" /> Event Stream
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1" dir="ltr">
              {logs.length === 0 ? (
                <p className="text-zinc-600">Logs appear here during discovery...</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={levelColor(log.level)}>
                    <span className="text-zinc-600">
                      {new Date(log.ts).toLocaleTimeString('en-GB')}
                    </span>{' '}
                    {log.message}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
