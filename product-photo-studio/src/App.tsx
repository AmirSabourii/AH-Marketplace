import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Download,
  ImagePlus,
  Loader2,
  Settings2,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { processProductPhoto } from './lib/gemini';
import { dataUrlToBlob, slugifyFilename } from './lib/imageUtils';
import { MODE_LABELS, type ProcessingMode } from './lib/modes';

type JobStatus = 'pending' | 'processing' | 'done' | 'error';

interface PhotoJob {
  id: string;
  file: File;
  productName: string;
  previewUrl: string;
  status: JobStatus;
  error?: string;
  resultUrl?: string;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function guessProductName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  return base.replace(/[-_]+/g, ' ').trim();
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<PhotoJob[]>([]);
  const [processing, setProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [mode, setMode] = useState<ProcessingMode>('catalog');
  const [outputSize, setOutputSize] = useState(2048);
  const [productFill, setProductFill] = useState(90);
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [showSettings, setShowSettings] = useState(false);

  const isCatalog = mode === 'catalog';
  const modeInfo = MODE_LABELS[mode];

  const pendingCount = jobs.filter((j) => j.status === 'pending').length;
  const doneCount = jobs.filter((j) => j.status === 'done').length;

  const addFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const newJobs: PhotoJob[] = imageFiles.map((file) => ({
      id: makeId(),
      file,
      productName: guessProductName(file.name),
      previewUrl: URL.createObjectURL(file),
      status: 'pending' as const,
    }));

    setJobs((prev) => [...prev, ...newJobs]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const updateJob = useCallback((id: string, patch: Partial<PhotoJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => {
      const job = prev.find((j) => j.id === id);
      if (job) URL.revokeObjectURL(job.previewUrl);
      return prev.filter((j) => j.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    jobs.forEach((j) => URL.revokeObjectURL(j.previewUrl));
    setJobs([]);
  }, [jobs]);

  const resizeOpts = useMemo(
    () => ({
      size: outputSize,
      productFill: productFill / 100,
      format,
      jpegQuality: 0.95,
      background: '#FFFFFF',
    }),
    [outputSize, productFill, format]
  );

  const runBatch = async () => {
    const queue = jobs.filter((j) => j.status === 'pending' || j.status === 'error');
    if (queue.length === 0) return;

    setProcessing(true);
    const controller = new AbortController();
    abortRef.current = controller;

    for (const job of queue) {
      if (controller.signal.aborted) break;

      updateJob(job.id, { status: 'processing', error: undefined });

      try {
        const { finalDataUrl } = await processProductPhoto({
          file: job.file,
          productName: job.productName,
          mode,
          resize: resizeOpts,
          signal: controller.signal,
        });
        updateJob(job.id, { status: 'done', resultUrl: finalDataUrl });
      } catch (err) {
        if (controller.signal.aborted) break;
        const message = err instanceof Error ? err.message : 'خطای ناشناخته';
        updateJob(job.id, { status: 'error', error: message });
      }
    }

    setProcessing(false);
    abortRef.current = null;
  };

  const stopBatch = () => {
    abortRef.current?.abort();
    setProcessing(false);
    setJobs((prev) =>
      prev.map((j) =>
        j.status === 'processing' ? { ...j, status: 'pending' as const } : j
      )
    );
  };

  const downloadResult = (job: PhotoJob) => {
    if (!job.resultUrl) return;
    const ext = format === 'png' ? 'png' : 'jpg';
    const slug = slugifyFilename(job.productName);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(dataUrlToBlob(job.resultUrl));
    a.download = `${slug}-${isCatalog ? 'catalog' : 'staged'}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadAllDone = () => {
    jobs.filter((j) => j.status === 'done' && j.resultUrl).forEach((j) => downloadResult(j));
  };

  const hasApiKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim());

  return (
    <div className="min-h-dvh pb-16">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">استودیو عکس محصول</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{modeInfo.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
          >
            <Settings2 className="size-4" />
            تنظیمات خروجی
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-medium text-zinc-800 mb-3">نوع خروجی</p>
          <div
            className="inline-flex w-full sm:w-auto rounded-xl border border-zinc-200 p-1 bg-zinc-50"
            role="group"
            aria-label="نوع پردازش"
          >
            {(['catalog', 'staged'] as const).map((m) => {
              const active = mode === m;
              const info = MODE_LABELS[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  disabled={processing}
                  className={`flex-1 sm:flex-none rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    active
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <span className="block">{info.title}</span>
                  <span className="block text-xs font-normal text-zinc-500 mt-0.5">
                    {info.short}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
            {isCatalog ? (
              <>
                <strong>کاتالوگ:</strong> محصول روی پس‌زمینه سفید، زاویه روبرو، بزرگ در قاب — مناسب
                فروشگاه آنلاین.
              </>
            ) : (
              <>
                <strong>استیج شده:</strong> همان محصول (رنگ و ساختار بدون تغییر) با کیفیت بالاتر در
                یک فضای داخلی جدید، مرتبط و زیبا — مناسب مارکتینگ و شبکه‌های اجتماعی.
              </>
            )}
          </p>
        </section>

        {!hasApiKey && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>کلید API لازم است.</strong> در پوشه{' '}
            <code className="bg-amber-100 px-1 rounded">product-photo-studio</code> فایل{' '}
            <code className="bg-amber-100 px-1 rounded">.env</code> بسازید و{' '}
            <code className="bg-amber-100 px-1 rounded">VITE_GEMINI_API_KEY</code> را قرار دهید
            (می‌توانید از کلید پروژه اصلی استفاده کنید).
          </div>
        )}

        {showSettings && (
          <section
            className={`rounded-2xl border border-zinc-200 bg-white p-4 grid gap-4 ${
              isCatalog ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            }`}
          >
            <label className="block text-sm">
              <span className="text-zinc-600">
                {isCatalog ? 'اندازه خروجی (مربع)' : 'بلندترین ضلع (پیکسل)'}
              </span>
              <select
                value={outputSize}
                onChange={(e) => setOutputSize(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
              >
                <option value={1200}>1200</option>
                <option value={1600}>1600</option>
                <option value={2048}>2048</option>
                <option value={2560}>2560</option>
              </select>
            </label>
            {isCatalog && (
              <label className="block text-sm">
                <span className="text-zinc-600">فضای محصول در قاب ({productFill}%)</span>
                <input
                  type="range"
                  min={75}
                  max={96}
                  value={productFill}
                  onChange={(e) => setProductFill(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>
            )}
            <label className="block text-sm">
              <span className="text-zinc-600">فرمت فایل</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'jpeg' | 'png')}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
              >
                <option value="jpeg">JPEG (کیفیت 95%)</option>
                <option value="png">PNG</option>
              </select>
            </label>
          </section>
        )}

        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-8 text-center hover:border-zinc-400 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <ImagePlus className="size-10 mx-auto text-zinc-400 mb-3" />
          <p className="font-medium text-zinc-800">عکس‌ها را اینجا رها کنید یا انتخاب کنید</p>
          <p className="text-sm text-zinc-500 mt-1">Bulk — چند فایل همزمان</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-800"
          >
            <Upload className="size-4" />
            انتخاب عکس
          </button>
        </section>

        {jobs.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {processing ? (
                <button
                  type="button"
                  onClick={stopBatch}
                  className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-red-700"
                >
                  توقف
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!hasApiKey || pendingCount === 0}
                  onClick={runBatch}
                  className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {processing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  پردازش {pendingCount > 0 ? `(${pendingCount})` : 'همه'}
                </button>
              )}
              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={downloadAllDone}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm hover:bg-zinc-50 inline-flex items-center gap-2"
                >
                  <Download className="size-4" />
                  دانلود {doneCount} فایل
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                disabled={processing}
                className="text-sm text-zinc-500 hover:text-red-600 disabled:opacity-50"
              >
                پاک کردن لیست
              </button>
            </div>

            <ul className="space-y-4">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
                >
                  <div className="grid sm:grid-cols-[140px_1fr_auto] gap-4 p-4">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100">
                      <img
                        src={job.previewUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                      {job.status === 'processing' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="size-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 min-w-0">
                      <label className="block text-sm font-medium text-zinc-700">
                        عنوان محصول (برای تشخیص در صحنه stage شده)
                      </label>
                      <input
                        type="text"
                        value={job.productName}
                        disabled={job.status === 'processing'}
                        onChange={(e) =>
                          updateJob(job.id, { productName: e.target.value })
                        }
                        placeholder="مثلاً: مبل راحتی لینن خاکستری"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
                      />
                      <p className="text-xs text-zinc-500 truncate">{job.file.name}</p>
                      {job.error && (
                        <p className="text-xs text-red-600 flex items-start gap-1">
                          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                          {job.error}
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center justify-end gap-2">
                      {job.status === 'done' && job.resultUrl && (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="size-3.5" />
                            آماده
                          </span>
                          <button
                            type="button"
                            onClick={() => downloadResult(job)}
                            className="rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50"
                            title="دانلود"
                          >
                            <Download className="size-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() => removeJob(job.id)}
                        className="rounded-lg border border-zinc-200 p-2 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="حذف"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {job.resultUrl && (
                    <div className="border-t border-zinc-100 bg-zinc-50 p-4 grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-2">ورودی</p>
                        <img
                          src={job.previewUrl}
                          alt="ورودی"
                          className="rounded-lg max-h-48 w-full object-contain bg-white"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-2">
                          خروجی ({isCatalog ? 'کاتالوگ · سفید' : 'استیج · فضای جدید'})
                        </p>
                        <img
                          src={job.resultUrl}
                          alt="خروجی"
                          className="rounded-lg max-h-48 w-full object-contain bg-white border border-zinc-200"
                        />
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
