import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, AlertCircle, Scan, RotateCcw } from 'lucide-react';
import {
  type Product,
  getProductDisplayImage,
  getProductVariant,
  findSceneForProduct,
} from '../data/scenes';
import { buildShareUrl, sharePageLink } from '../lib/share';
import { generateRoomVisualization } from '../lib/gemini/visualizer';
import { analyzeRoomScene } from '../lib/gemini/roomAnalysis';
import {
  hashRoomFile,
  loadCachedRoomAnalysis,
  pickBestProductForElement,
  saveCachedRoomAnalysis,
  type DetectedRoomElement,
  type RoomSceneAnalysis,
} from '../lib/roomAnalysis';
import { loadRoomPhoto, saveRoomPhoto } from '../lib/savedRoom';
import { cn } from '../lib/cn';
import VisualizerLoading3D from './VisualizerLoading3D';
import CompareSlider from './CompareSlider';
import VisualizerProductBar from './VisualizerProductBar';
import RoomSceneFrame from './RoomSceneFrame';
import type { VisualizerChromeState } from './visualizerChrome';

type Step = 'pick' | 'ready' | 'generating' | 'result';
type AnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TryInMyRoomViewProps {
  products: Product[];
  activeProductId: string | null;
  colorSelections: Record<string, string>;
  onColorSelect: (productId: string, variantId: string) => void;
  onActiveProductChange: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  onRoomSaved?: () => void;
  onChromeChange?: (chrome: VisualizerChromeState) => void;
  /** Direct ref so the top header can open the file picker synchronously on click */
  registerRoomPhotoPicker?: (picker: (() => void) | null) => void;
  /** User tapped a detected room element — parent can filter shop + stage product */
  onElementPersonalize?: (
    element: DetectedRoomElement,
    suggestedProduct: Product | null
  ) => void;
}

export default function TryInMyRoomView({
  products,
  activeProductId,
  colorSelections,
  onColorSelect,
  onActiveProductChange,
  onRemoveProduct,
  onClose,
  onAddToCart,
  onRoomSaved,
  onChromeChange,
  registerRoomPhotoPicker,
  onElementPersonalize,
}: TryInMyRoomViewProps) {
  const [step, setStep] = useState<Step>('pick');
  const [preview, setPreview] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [isComparing, setIsComparing] = useState(false);
  const [roomLoaded, setRoomLoaded] = useState(false);
  const [roomAnalysis, setRoomAnalysis] = useState<RoomSceneAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const roomFileRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const roomHashRef = useRef<string | null>(null);

  const activeProduct =
    products.find((p) => p.id === activeProductId) ?? products[0] ?? null;
  const hasProducts = products.length > 0;

  const revokePreview = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  };

  const runRoomAnalysis = useCallback(async (file: File) => {
    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;

    setAnalysisStatus('loading');
    setAnalysisError(null);
    setRoomAnalysis(null);
    setActiveElementId(null);

    try {
      const hash = await hashRoomFile(file);
      roomHashRef.current = hash;

      const cached = await loadCachedRoomAnalysis(hash);
      if (cached && !controller.signal.aborted) {
        setRoomAnalysis(cached);
        setAnalysisStatus('ready');
        return;
      }

      const analysis = await analyzeRoomScene({
        roomFile: file,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      await saveCachedRoomAnalysis(hash, analysis);
      setRoomAnalysis(analysis);
      setAnalysisStatus('ready');
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : 'Room scan failed. Please try again.';
      setAnalysisError(message);
      setAnalysisStatus('error');
    }
  }, []);

  const applyRoomFile = useCallback(
    (file: File) => {
      abortRef.current?.abort();
      revokePreview();
      const url = URL.createObjectURL(file);
      previewRef.current = url;
      roomFileRef.current = file;
      setPreview(url);
      setGeneratedImage(null);
      setError(null);
      setIsComparing(false);
      setStep('ready');
      void runRoomAnalysis(file);
    },
    [runRoomAnalysis]
  );

  const handleFile = useCallback(
    async (file: File) => {
      applyRoomFile(file);
      try {
        await saveRoomPhoto(file);
        onRoomSaved?.();
      } catch {
        // Non-blocking
      }
    },
    [applyRoomFile, onRoomSaved]
  );

  const handleRetryAnalysis = useCallback(() => {
    const file = roomFileRef.current;
    if (file) void runRoomAnalysis(file);
  }, [runRoomAnalysis]);

  const handleElementSelect = useCallback(
    (element: DetectedRoomElement) => {
      setActiveElementId(element.id);
      const stagedIds = new Set(products.map((p) => p.id));
      const suggested = pickBestProductForElement(element, stagedIds);
      onElementPersonalize?.(element, suggested);
      if (suggested) {
        onActiveProductChange(suggested.id);
      }
    },
    [products, onElementPersonalize, onActiveProductChange]
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      analysisAbortRef.current?.abort();
      revokePreview();
    };
  }, []);

  useEffect(() => {
    if (roomLoaded) return;
    let cancelled = false;

    loadRoomPhoto()
      .then((file) => {
        if (cancelled) return;
        setRoomLoaded(true);
        if (file) applyRoomFile(file);
      })
      .catch(() => {
        if (!cancelled) setRoomLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [roomLoaded, applyRoomFile]);

  const runVisualization = useCallback(async () => {
    const roomFile = roomFileRef.current;
    if (!roomFile || products.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setStep('generating');

    try {
      const result = await generateRoomVisualization({
        roomFile,
        products: products.map((product) => {
          const variant = getProductVariant(product, colorSelections[product.id]);
          return {
            name: product.name,
            description: product.description,
            imageUrl: getProductDisplayImage(product, colorSelections),
            variantName: variant?.name,
          };
        }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      setGeneratedImage(result);
      setStep('result');
      setActiveElementId(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : 'Visualization failed. Please try again.';
      setError(message);
      setStep('ready');
    }
  }, [products, colorSelections]);

  const handlePreview = () => {
    void runVisualization();
  };

  const handleShare = useCallback(async () => {
    if (!activeProduct) return;
    const scene = findSceneForProduct(activeProduct.id);
    if (!scene) return;

    const url = buildShareUrl({
      categoryId: scene.categoryId,
      sceneId: scene.id,
      productId: activeProduct.id,
      room: true,
    });
    const result = await sharePageLink(url);
    if (result === 'cancelled') return;
    setShareFeedback(result === 'copied' ? 'copied' : 'shared');
    window.setTimeout(() => setShareFeedback('idle'), 2200);
  }, [activeProduct]);

  const openRoomPhotoPicker = useCallback(() => {
    if (step === 'generating') return;
    const input = inputRef.current;
    if (!input) return;
    input.click();
  }, [step]);

  useEffect(() => {
    registerRoomPhotoPicker?.(openRoomPhotoPicker);
    return () => registerRoomPhotoPicker?.(null);
  }, [openRoomPhotoPicker, registerRoomPhotoPicker]);

  useEffect(() => {
    onChromeChange?.({
      canShare: Boolean(activeProduct),
      shareFeedback,
      onShare: () => void handleShare(),
      showCompare: step === 'result' && Boolean(preview && generatedImage),
      isComparing,
      onToggleCompare: () => setIsComparing((v) => !v),
      showChangePhoto: step !== 'generating',
      onChangeRoomPhoto: openRoomPhotoPicker,
    });
  }, [
    activeProduct,
    shareFeedback,
    handleShare,
    step,
    preview,
    generatedImage,
    isComparing,
    onChromeChange,
    openRoomPhotoPicker,
  ]);

  const displayImage = step === 'result' && generatedImage ? generatedImage : preview;
  const showOriginalWithHotspots =
    Boolean(preview) && step !== 'generating' && (!generatedImage || step === 'ready');
  const showHotspots =
    showOriginalWithHotspots &&
    !isComparing &&
    analysisStatus === 'ready' &&
    Boolean(roomAnalysis?.elements.length);

  const hasRoomImage =
    Boolean(preview && displayImage) &&
    (step === 'ready' || step === 'generating' || step === 'result');

  const canPreview = step === 'ready' && hasProducts;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex h-full w-full flex-col overflow-hidden bg-ink"
    >
      <input
        ref={inputRef}
        id="visualizer-room-photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative min-h-0 flex-1 w-full overflow-hidden"
      >
        <AnimatePresence>
          {hasRoomImage && (
            <motion.div
              key="room-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-0"
            >
              {isComparing && preview && generatedImage ? (
                <CompareSlider
                  originalImage={preview}
                  generatedImage={generatedImage}
                  className="h-full w-full"
                />
              ) : showOriginalWithHotspots && preview ? (
                <RoomSceneFrame
                  imageSrc={preview}
                  alt="Your room"
                  analysis={roomAnalysis}
                  activeElementId={activeElementId}
                  showHotspots={showHotspots}
                  onElementSelect={handleElementSelect}
                  className="absolute inset-0"
                />
              ) : (
                <img
                  src={displayImage!}
                  alt={step === 'result' ? 'AI staged room' : 'Your room'}
                  className="h-full w-full object-cover"
                />
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/35 via-transparent to-ink/20"
                aria-hidden
              />
              {step === 'generating' && (
                <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" aria-hidden />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanning / hotspot hint */}
        {preview && step === 'ready' && (
          <div className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] z-20 flex justify-center px-4">
            <AnimatePresence mode="wait">
              {analysisStatus === 'loading' && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="glass pointer-events-none flex items-center gap-2 rounded-full px-4 py-2 shadow-lg"
                >
                  <Scan className="h-4 w-4 animate-pulse text-bronze" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-ink">
                    Finding items in your room…
                  </span>
                </motion.div>
              )}
              {showHotspots && (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="glass pointer-events-none rounded-full px-4 py-2 shadow-lg"
                >
                  <span className="text-xs font-medium text-ink">
                    Tap a dot to personalize that area
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {analysisStatus === 'error' && preview && step === 'ready' && (
          <div className="absolute inset-x-0 top-24 z-20 flex justify-center px-4">
            <div className="glass pointer-events-auto flex max-w-sm items-start gap-2 rounded-2xl px-4 py-3 shadow-lg">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink">{analysisError}</p>
                <button
                  type="button"
                  onClick={handleRetryAnalysis}
                  className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-bronze hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry scan
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute top-0 right-0 z-30 p-4 pt-[max(3.5rem,calc(env(safe-area-inset-top)+3rem))] sm:p-6 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 active:scale-95',
              hasRoomImage
                ? 'glass text-cream hover:bg-cream/20'
                : 'glass text-ink hover:bg-parchment'
            )}
            aria-label="Close visualizer"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {step === 'pick' && (
              <motion.button
                key="pick"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                type="button"
                onClick={() => inputRef.current?.click()}
                className="pointer-events-auto flex w-[calc(100%-3rem)] max-w-lg min-h-[280px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-cream/30 bg-cream/95 py-10 shadow-2xl backdrop-blur-md transition-all duration-200 hover:border-bronze/40 hover:bg-parchment/95 active:scale-[0.99]"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bronze text-cream shadow-[0_4px_20px_rgba(184,114,58,0.35)]">
                  <Upload className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <p className="font-medium text-lg text-ink">Upload a photo of your room</p>
                  <p className="mt-2 text-ink-muted">JPG or PNG · we&apos;ll tag furniture for you</p>
                  {hasProducts && (
                    <p className="mt-3 text-xs font-medium text-bronze">
                      {products.length} product{products.length > 1 ? 's' : ''} ready to stage
                    </p>
                  )}
                </motion.div>
              </motion.button>
            )}

            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-auto w-full max-w-lg px-6"
              >
                <VisualizerLoading3D
                  overlay
                  label="Creating your staged room"
                  sublabel="Gemini 3.1 Flash Image is composing your space…"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {error && (step === 'ready' || step === 'result') && preview && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none absolute bottom-4 left-1/2 z-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 lg:bottom-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass pointer-events-auto flex items-start gap-2 rounded-2xl px-4 py-3 text-left shadow-lg"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bronze" strokeWidth={1.75} />
              <p className="text-sm text-ink">{error}</p>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      <VisualizerProductBar
        products={products}
        activeProduct={activeProduct}
        colorSelections={colorSelections}
        step={step}
        canPreview={canPreview}
        onColorSelect={onColorSelect}
        onActiveProductChange={onActiveProductChange}
        onRemoveProduct={onRemoveProduct}
        onPreview={handlePreview}
        onAddToCart={onAddToCart}
      />
    </motion.div>
  );
}
