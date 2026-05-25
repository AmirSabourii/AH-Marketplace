import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  AlertCircle,
  Scan,
  RotateCcw,
  ArrowLeft,
  ImagePlus,
  SlidersHorizontal,
  Share2,
  Check,
  ShoppingBag,
  Sparkles,
  MessageCircle,
  Home,
} from 'lucide-react';
import {
  SCENES,
  type Product,
  getProductDisplayImage,
  getProductVariant,
  findSceneForProduct,
} from '../data/scenes';
import type { CategoryId } from '../data/categories';
import CategoryImagePicker from './CategoryImagePicker';
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
import AskAiToolbarButton from './AskAiToolbarButton';
import { cn } from '../lib/cn';
import VisualizerLoading3D from './VisualizerLoading3D';
import CompareSlider from './CompareSlider';
import VisualizerProductBar from './VisualizerProductBar';
import RoomSceneFrame from './RoomSceneFrame';
import type { VisualizerChromeState } from './visualizerChrome';

type Step = 'pick' | 'ready' | 'generating' | 'result';
type AnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';
type MobileTab = 'products' | 'details';

const CATALOG_ASPECT_RATIOS = [
  'aspect-[3/4]',
  'aspect-[4/3]',
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[2/3]',
  'aspect-[3/2]',
  'aspect-[5/4]',
  'aspect-[16/9]',
];

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
  /** Mobile-only: open the cart drawer */
  onCartClick?: () => void;
  /** Open AI designer assistant (optional product context) */
  onOpenAI?: (product?: Product) => void;
  /** Mobile-only: current cart item count */
  cartCount?: number;
  /** Mobile-only: shop category filter for catalog in Products tab */
  selectedCategory?: CategoryId;
  onCategorySelect?: (id: CategoryId) => void;
  /** Mobile-only: add product to staged list */
  onStageProduct?: (product: Product) => void;
  /** Layout mode — set explicitly from App (do not rely on viewport detection) */
  variant?: 'mobile' | 'desktop';
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
  onCartClick,
  onOpenAI,
  cartCount = 0,
  selectedCategory = 'all',
  onCategorySelect,
  onStageProduct,
  variant = 'desktop',
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
  const [activeTab, setActiveTab] = useState<MobileTab>('products');

  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const roomFileRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const roomHashRef = useRef<string | null>(null);

  const activeProduct =
    products.find((p) => p.id === activeProductId) ?? products[0] ?? null;
  const activeVariant = activeProduct
    ? getProductVariant(activeProduct, colorSelections[activeProduct.id])
    : undefined;
  const activeProductImage = activeProduct
    ? getProductDisplayImage(activeProduct, colorSelections)
    : '';
  const hasProducts = products.length > 0;
  const stagedIds = useMemo(() => new Set(products.map((p) => p.id)), [products]);

  const catalogProducts = useMemo(() => {
    const seen = new Set<string>();
    const out: { product: Product; sceneImage: string }[] = [];
    const scenes =
      selectedCategory === 'all'
        ? SCENES
        : SCENES.filter((s) => s.categoryId === selectedCategory);
    for (const scene of scenes) {
      for (const product of scene.products) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        out.push({ product, sceneImage: scene.image });
      }
    }
    return out;
  }, [selectedCategory]);

  const handleCatalogProductTap = useCallback(
    (product: Product) => {
      if (stagedIds.has(product.id)) {
        if (activeProduct?.id === product.id) {
          onRemoveProduct(product.id);
        } else {
          onActiveProductChange(product.id);
        }
      } else {
        onStageProduct?.(product);
      }
    },
    [stagedIds, activeProduct, onActiveProductChange, onRemoveProduct, onStageProduct]
  );

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
  const showCompare = step === 'result' && Boolean(preview && generatedImage);

  // ─── SHARED: room image content ────────────────────────────────────────────
  const roomImageContent = (
    <>
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
    </>
  );

  // ─── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (variant === 'mobile') {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-ink">
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

        {/* ── TOP: Room visualizer (fixed, no scroll) ─────────────────── */}
        <div className="relative min-h-0 flex-[0_0_48%] overflow-hidden">

          {/* Upload CTA (step = pick) */}
          <AnimatePresence mode="wait">
            {step === 'pick' ? (
              <motion.button
                key="pick-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                type="button"
                onClick={() => inputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink active:bg-ink/90"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bronze shadow-[0_4px_20px_rgba(184,114,58,0.40)]">
                  <Upload className="h-6 w-6 text-cream" strokeWidth={1.75} />
                </span>
                <div className="text-center">
                  <p className="text-lg font-medium text-cream">Upload your room</p>
                  <p className="mt-1 text-sm text-cream/55">JPG · PNG · HEIC</p>
                  {hasProducts && (
                    <p className="mt-2 text-xs font-semibold text-bronze">
                      {products.length} product{products.length > 1 ? 's' : ''} ready to stage
                    </p>
                  )}
                </div>
              </motion.button>
            ) : (
              <motion.div
                key="room-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                {roomImageContent}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading overlay */}
          {step === 'generating' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <VisualizerLoading3D
                overlay
                label="Creating your staged room"
                sublabel="Gemini is composing your space…"
              />
            </div>
          )}

          {/* Scanning / hotspot hint — bottom of room area */}
          {preview && step === 'ready' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
              <AnimatePresence mode="wait">
                {analysisStatus === 'loading' && (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="glass-dark pointer-events-none flex items-center gap-2 rounded-full px-4 py-2"
                  >
                    <Scan className="h-3.5 w-3.5 animate-pulse text-bronze" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-cream/85">Finding items…</span>
                  </motion.div>
                )}
                {showHotspots && (
                  <motion.div
                    key="hint"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="glass-dark pointer-events-none rounded-full px-4 py-2"
                  >
                    <span className="text-xs font-medium text-cream/80">
                      Tap a dot to personalize
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Analysis error */}
          {analysisStatus === 'error' && preview && step === 'ready' && (
            <div className="absolute inset-x-4 bottom-3 z-20">
              <div className="glass-dark flex items-start gap-2 rounded-2xl px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-cream/80">{analysisError}</p>
                  <button
                    type="button"
                    onClick={handleRetryAnalysis}
                    className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-bronze"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Visualization error */}
          {error && step !== 'pick' && (
            <div className="absolute inset-x-4 bottom-3 z-20">
              <div className="glass-dark flex items-start gap-2 rounded-2xl px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
                <p className="text-sm text-cream/80">{error}</p>
              </div>
            </div>
          )}

          {/* ── Top controls bar ──────────────────────────────── */}
          <div
            className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all active:scale-95',
                step !== 'pick' ? 'glass-dark text-cream/90' : 'glass text-ink'
              )}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Shop
            </button>

            <div className="flex items-center gap-1.5">
              {step !== 'generating' && (
                <button
                  type="button"
                  onClick={openRoomPhotoPicker}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95',
                    step !== 'pick' ? 'glass-dark text-cream/90' : 'glass text-ink'
                  )}
                  aria-label="Change room photo"
                >
                  <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}

              {showCompare && (
                <button
                  type="button"
                  onClick={() => setIsComparing((v) => !v)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95',
                    isComparing ? 'bg-bronze text-cream shadow-md' : 'glass-dark text-cream/90'
                  )}
                  aria-label="Compare before/after"
                  aria-pressed={isComparing}
                >
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleShare()}
                disabled={!activeProduct}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95',
                  step !== 'pick'
                    ? activeProduct
                      ? 'glass-dark text-cream/90'
                      : 'glass-dark text-cream/30 cursor-not-allowed'
                    : activeProduct
                      ? 'glass text-ink'
                      : 'glass text-ink/30 cursor-not-allowed'
                )}
                aria-label="Share"
              >
                {shareFeedback !== 'idle' ? (
                  <Check className="h-4 w-4 text-[#8BC48B]" strokeWidth={2} />
                ) : (
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>

              {onOpenAI && (
                <AskAiToolbarButton onClick={() => onOpenAI()} variant="dark" />
              )}

              <button
                type="button"
                onClick={onCartClick}
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95',
                  step !== 'pick' ? 'glass-dark text-cream' : 'glass text-ink'
                )}
                aria-label="Shopping cart"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bronze px-0.5 text-[9px] font-bold text-cream"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Tab panel ────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[1.5rem] bg-cream shadow-[0_-12px_40px_rgba(0,0,0,0.30)]">

          {/* Tab bar */}
          <div className="shrink-0 px-4 pt-3 pb-1">
            <div className="flex rounded-full bg-parchment p-1 gap-0.5">
              {(['products', 'details'] as MobileTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold capitalize transition-all duration-200 active:scale-[0.98]',
                    activeTab === tab
                      ? 'bg-ink text-cream shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  )}
                >
                  {tab === 'products' ? 'Products' : 'Details'}
                  {tab === 'products' && (products.length > 0 || catalogProducts.length > 0) && (
                    <span
                      className={cn(
                        'flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold',
                        activeTab === 'products' ? 'bg-cream/20 text-cream' : 'bg-ink/12 text-ink'
                      )}
                    >
                      {products.length > 0 ? products.length : catalogProducts.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === 'products' ? (
              <motion.div
                key="tab-products"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                {onCategorySelect && (
                  <div className="shrink-0 border-b border-ink/6 px-4 py-2.5">
                    <CategoryImagePicker
                      selectedCategory={selectedCategory}
                      onSelectCategory={onCategorySelect}
                      variant="header"
                    />
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 py-3">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                    Tap to stage · tap again to remove
                  </p>
                  <div className="columns-2 gap-2.5">
                    {catalogProducts.map(({ product, sceneImage }, index) => {
                      const isActive = activeProduct?.id === product.id;
                      const isStaged = stagedIds.has(product.id);
                      const heightClass =
                        CATALOG_ASPECT_RATIOS[index % CATALOG_ASPECT_RATIOS.length];
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleCatalogProductTap(product)}
                          className="group relative mb-2.5 flex w-full break-inside-avoid flex-col text-left transition-all active:scale-[0.98]"
                        >
                          <div
                            className={cn(
                              'relative w-full overflow-hidden rounded-2xl bg-parchment/60',
                              heightClass,
                              isStaged && 'ring-2 ring-bronze',
                              isActive && isStaged && 'ring-offset-2 ring-offset-cream'
                            )}
                          >
                            <img
                              src={sceneImage}
                              alt={product.name}
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-ink/0 transition-colors group-active:bg-ink/10" />
                            <span
                              className={cn(
                                'absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full shadow-sm backdrop-blur-sm',
                                isStaged
                                  ? 'bg-bronze text-cream'
                                  : 'bg-cream/90 text-bronze'
                              )}
                            >
                              {isStaged ? (
                                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                              ) : (
                                <Home className="h-3.5 w-3.5" strokeWidth={1.75} />
                              )}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-1 px-0.5">
                            <p className="line-clamp-1 text-[11px] font-medium text-ink">
                              {product.name}
                            </p>
                            <span className="shrink-0 font-display text-[10px] italic text-bronze">
                              {product.price}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <footer
                  className="shrink-0 border-t border-ink/8 bg-cream/95 px-4 py-3 backdrop-blur-md"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                >
                  {!hasProducts ? (
                    <p className="mb-2 text-center text-[11px] text-ink-muted">
                      Tap a product to stage it in your room
                    </p>
                  ) : (
                    <p className="mb-2 text-center text-[11px] text-ink-muted">
                      {products.length > 1 ? (
                        <>
                          <span className="font-semibold text-ink">Preview all</span>
                          {' '}
                          stages {products.length} pieces in your room
                        </>
                      ) : (
                        <>
                          Details for each piece in the{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('details')}
                            className="font-semibold text-bronze"
                          >
                            Details
                          </button>
                          {' '}
                          tab
                        </>
                      )}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handlePreview}
                      disabled={step === 'generating' || (!canPreview && step !== 'result')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all active:scale-[0.99]',
                        step === 'result'
                          ? 'border border-ink/12 bg-parchment text-ink'
                          : canPreview
                            ? 'bg-bronze text-cream shadow-[0_4px_18px_rgba(184,114,58,0.28)]'
                            : 'cursor-not-allowed bg-parchment text-ink/30'
                      )}
                    >
                      {step === 'result' ? (
                        <>
                          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                          Regenerate
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" strokeWidth={2} />
                          {products.length > 1 ? 'Preview all' : 'Preview room'}
                        </>
                      )}
                    </button>
                    {activeProduct && stagedIds.has(activeProduct.id) && (
                      <button
                        type="button"
                        onClick={() => onAddToCart?.(activeProduct)}
                        className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-ink text-cream transition-all active:scale-[0.99]"
                        aria-label="Add to cart"
                      >
                        <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </footer>
              </motion.div>
            ) : (
              /* Details tab */
              <motion.div
                key="tab-details"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 pt-3"
                  style={{ paddingBottom: '0.5rem' }}
                >
                {!activeProduct ? (
                  <div className="flex flex-1 items-center justify-center py-8 text-center">
                    <p className="text-sm text-ink-muted">Select a product to see details</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="relative overflow-hidden rounded-2xl bg-parchment/60">
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bronze-soft/25 via-transparent to-transparent"
                        aria-hidden
                      />
                      <motion.img
                        key={activeProductImage}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        src={activeProductImage}
                        alt={activeProduct.name}
                        className="relative aspect-[4/3] w-full object-contain p-4 mix-blend-multiply"
                      />
                    </div>

                    {/* Name + price */}
                    <div className="flex items-start justify-between gap-3 border-b border-ink/8 pb-4">
                      <div className="min-w-0">
                        <h3 className="font-display text-[1.7rem] font-medium leading-[1.15] tracking-tight text-ink">
                          {activeProduct.name}
                        </h3>
                        {activeVariant && (
                          <p className="mt-1 font-display text-sm italic text-bronze">
                            {activeVariant.name}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 font-display text-xl font-medium italic text-bronze">
                        {activeProduct.price}
                      </span>
                    </div>

                    {/* Color variants — full pill style */}
                    {activeProduct.variants && activeProduct.variants.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint">
                            Finish
                          </p>
                          {activeVariant && (
                            <p className="text-xs font-medium text-bronze">{activeVariant.name}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeProduct.variants.map((v) => {
                            const isSelected =
                              v.id === (activeVariant?.id ?? activeProduct.variants?.[0]?.id);
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => onColorSelect(activeProduct.id, v.id)}
                                className={cn(
                                  'flex items-center gap-2 rounded-full border px-2 py-1.5 transition-all active:scale-[0.98]',
                                  isSelected
                                    ? 'border-ink/30 bg-parchment shadow-[0_2px_8px_rgba(28,26,23,0.08)]'
                                    : 'border-ink/10 bg-cream/60'
                                )}
                                aria-pressed={isSelected}
                              >
                                <span
                                  className={cn(
                                    'h-5 w-5 shrink-0 rounded-full border-2',
                                    isSelected
                                      ? 'border-ink/30 ring-2 ring-ink/10 ring-offset-1'
                                      : 'border-ink/10'
                                  )}
                                  style={{ backgroundColor: v.swatch }}
                                />
                                <span
                                  className={cn(
                                    'pr-0.5 text-xs font-medium',
                                    isSelected ? 'text-ink' : 'text-ink-muted'
                                  )}
                                >
                                  {v.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-[13px] leading-[1.65] text-ink-muted">
                      {activeProduct.description}
                    </p>

                    {onOpenAI && (
                      <button
                        type="button"
                        onClick={() => onOpenAI(activeProduct)}
                        className="flex w-full items-center gap-3 rounded-xl border border-ink/8 bg-parchment/50 p-3.5 text-left transition-all active:scale-[0.99] hover:border-ink/14"
                      >
                        <Sparkles className="h-4 w-4 shrink-0 text-bronze" strokeWidth={1.75} />
                        <span className="flex-1 text-sm font-medium text-ink">
                          Ask AI about this piece
                        </span>
                      </button>
                    )}

                    {/* Add to cart */}
                    {stagedIds.has(activeProduct.id) && (
                      <button
                        type="button"
                        onClick={() => onRemoveProduct(activeProduct.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-ink/12 py-2.5 text-xs font-medium text-ink-muted transition-all active:scale-[0.99]"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                        Remove from room
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onAddToCart?.(activeProduct)}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-sm font-semibold text-cream transition-all active:scale-[0.99]"
                    >
                      <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                      Add to cart
                    </button>
                  </div>
                )}
                </div>

                {activeProduct && stagedIds.has(activeProduct.id) && (
                  <footer
                    className="shrink-0 border-t border-ink/8 bg-cream/95 px-4 py-3 backdrop-blur-md"
                    style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                  >
                    <button
                      type="button"
                      onClick={handlePreview}
                      disabled={step === 'generating' || (!canPreview && step !== 'result')}
                      className={cn(
                        'flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all active:scale-[0.99]',
                        step === 'result'
                          ? 'border border-ink/12 bg-parchment text-ink'
                          : canPreview
                            ? 'bg-bronze text-cream shadow-[0_4px_18px_rgba(184,114,58,0.28)]'
                            : 'cursor-not-allowed bg-parchment text-ink/30'
                      )}
                    >
                      {step === 'result' ? (
                        <>
                          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                          Regenerate
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" strokeWidth={2} />
                          {products.length > 1 ? 'Preview all' : 'Preview room'}
                        </>
                      )}
                    </button>
                  </footer>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ─── DESKTOP LAYOUT (unchanged) ────────────────────────────────────────────
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
        {roomImageContent}

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
