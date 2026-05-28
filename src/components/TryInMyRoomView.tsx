import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  AlertCircle,
  Scan,
  RotateCcw,
  ArrowLeft,
  Check,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  type Product,
  getProductDisplayImage,
  getProductVariant,
  findSceneForProduct,
} from '../data/scenes';
import type { CatalogItem } from '../lib/medusa/products';
import { useFilteredCatalog } from '../hooks/useCatalogProducts';
import { useMobileRoomImageBounds } from '../hooks/useMobileRoomImageBounds';
import type { CategoryId } from '../data/categories';
import CategoryImagePicker from './CategoryImagePicker';
import { buildShareUrl, sharePageLink } from '../lib/share';
import { fileToDataUri } from '../lib/medusa/fileToDataUri';
import { streamRoomAnalyze, streamRoomStage } from '../lib/medusa/roomVisualizerSse';
import { resolveRoomFileForAi } from '../lib/gemini/roomImageSource';
import { setCurateBriefForNextStage } from '../lib/gemini/curateStageContext';
import {
  EMPTY_CURATE_INTENT,
  formatCurateIntentLabel,
  isCurateIntentEmpty,
  type CurateIntent,
} from '../lib/gemini/curateIntent';
import { selectProductsForCurate } from '../lib/gemini/selectProductsForRoom';
import CurateIntentSheet from './CurateIntentSheet';
import { buildRoomStageRequest } from '../lib/roomVisualizer/stageRequest';
import type { RoomStageMode } from '../lib/roomVisualizer/stageRequest';
import type { VisualizerAiAction } from './VisualizerAiActions';
import {
  hashRoomFile,
  loadCachedRoomAnalysis,
  pickBestProductForElement,
  saveCachedRoomAnalysis,
  type DetectedRoomElement,
  type RoomSceneAnalysis,
} from '../lib/roomAnalysis';
import { loadRoomPhoto, saveRoomPhoto } from '../lib/savedRoom';
import VisualizerSidebarAI from './VisualizerSidebarAI';
import VisualizerMobileMenu from './VisualizerMobileMenu';
import SidebarAiButton from './SidebarAiButton';
import type { AIContext } from '../types/ai';
import { cn } from '../lib/cn';
import VisualizerLoading3D from './VisualizerLoading3D';
import CompareSlider from './CompareSlider';
import VisualizerProductBar from './VisualizerProductBar';
import { countPendingPreview, getPreviewAction } from '../lib/visualizer/selectionState';
import AddToCartButton from './AddToCartButton';
import CartIconButton from './CartIconButton';
import RoomSceneFrame from './RoomSceneFrame';
import type { VisualizerChromeState } from './visualizerChrome';
import type { AIVisualizerStep } from '../types/ai';

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
  catalog: CatalogItem[];
  /** Catalog selection — not yet in the room image */
  products: Product[];
  /** Products composited in the staged room image */
  placedProducts: Product[];
  activeProductId: string | null;
  colorSelections: Record<string, string>;
  onColorSelect: (productId: string, variantId: string) => void;
  onActiveProductChange: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onRemovePlacedProduct: (productId: string) => void;
  onPlacedProductsChange: (products: Product[]) => void;
  /** Replace staged + placed lists (e.g. after AI curation) */
  onSyncRoomProducts?: (products: Product[]) => void;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  onRoomSaved?: () => void;
  onChromeChange?: (chrome: VisualizerChromeState) => void;
  /** Direct ref so the top header can open the file picker synchronously on click */
  registerRoomPhotoPicker?: (picker: (() => void) | null) => void;
  /** Sidebar / parent — remove from room image + silent regen */
  registerRemovePlacedFromRoom?: (handler: ((productId: string) => void) | null) => void;
  /** User tapped a detected room element — parent can filter shop + stage product */
  onElementPersonalize?: (
    element: DetectedRoomElement,
    suggestedProduct: Product | null
  ) => void;
  /** Mobile-only: open the cart drawer */
  onCartClick?: () => void;
  /** Open AI designer assistant (optional product context) */
  onOpenAI?: (product?: Product) => void;
  sidebarAiOpen?: boolean;
  aiContext?: AIContext;
  aiInitialQuery?: string;
  onClearAiInitialQuery?: () => void;
  onOpenSidebarAI?: () => void;
  onCloseSidebarAI?: () => void;
  /** Mobile-only: current cart item count */
  cartCount?: number;
  cartPulseKey?: number;
  /** Mobile-only: shop category filter for catalog in Products tab */
  selectedCategory?: CategoryId;
  onCategorySelect?: (id: CategoryId) => void;
  /** Mobile-only: add product to staged list */
  onStageProduct?: (product: Product) => void;
  /** Layout mode — set explicitly from App (do not rely on viewport detection) */
  variant?: 'mobile' | 'desktop';
  /** Latest room / staged image for AI assistant attachment */
  onVisualizerContextChange?: (ctx: {
    step: AIVisualizerStep;
    roomImageUrl: string | null;
  }) => void;
}

export default function TryInMyRoomView({
  catalog,
  products,
  placedProducts,
  activeProductId,
  colorSelections,
  onColorSelect,
  onActiveProductChange,
  onRemoveProduct,
  onRemovePlacedProduct,
  onPlacedProductsChange,
  onSyncRoomProducts,
  onClose,
  onAddToCart,
  onRoomSaved,
  onChromeChange,
  registerRoomPhotoPicker,
  registerRemovePlacedFromRoom,
  onElementPersonalize,
  onCartClick,
  onOpenAI,
  sidebarAiOpen = false,
  aiContext,
  aiInitialQuery,
  onClearAiInitialQuery,
  onOpenSidebarAI,
  onCloseSidebarAI,
  cartCount = 0,
  cartPulseKey = 0,
  selectedCategory = 'all',
  onCategorySelect,
  onStageProduct,
  variant = 'desktop',
  onVisualizerContextChange,
}: TryInMyRoomViewProps) {
  const [step, setStep] = useState<Step>('pick');
  const [preview, setPreview] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  /** Bumps when a new Gemini frame is applied so the <img> remounts reliably */
  const [resultRevision, setResultRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [isComparing, setIsComparing] = useState(false);
  const [roomLoaded, setRoomLoaded] = useState(false);
  const [roomAnalysis, setRoomAnalysis] = useState<RoomSceneAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string | null>(null);
  const [stageProgress, setStageProgress] = useState<string | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MobileTab>('products');
  const [isSilentUpdating, setIsSilentUpdating] = useState(false);
  const [aiBusyAction, setAiBusyAction] = useState<VisualizerAiAction | null>(null);
  const [curateIntentOpen, setCurateIntentOpen] = useState(false);
  const [curateIntentLabel, setCurateIntentLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const roomFileRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stageRequestRef = useRef(0);
  const silentAbortRef = useRef<AbortController | null>(null);
  const silentRequestRef = useRef(0);
  const placedRef = useRef(placedProducts);
  placedRef.current = placedProducts;
  const analysisAbortRef = useRef<AbortController | null>(null);
  const roomHashRef = useRef<string | null>(null);

  const activeProduct =
    placedProducts.find((p) => p.id === activeProductId) ??
    products.find((p) => p.id === activeProductId) ??
    placedProducts[0] ??
    products[0] ??
    null;
  const activeVariant = activeProduct
    ? getProductVariant(activeProduct, colorSelections[activeProduct.id])
    : undefined;
  const activeProductImage = activeProduct
    ? getProductDisplayImage(activeProduct, colorSelections)
    : '';
  const stagedIds = useMemo(() => new Set(products.map((p) => p.id)), [products]);
  const placedIds = useMemo(
    () => new Set(placedProducts.map((p) => p.id)),
    [placedProducts]
  );

  const productsForPreview = useMemo(() => {
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const p of [...placedProducts, ...products]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [placedProducts, products]);
  const pickCount = productsForPreview.length;
  const pendingCount = useMemo(
    () => countPendingPreview(products, placedIds),
    [products, placedIds]
  );
  const hasLivePreview = Boolean(generatedImage && step === 'result');
  const previewAction = getPreviewAction({ pickCount, pendingCount, hasLivePreview });
  const filteredCatalog = useFilteredCatalog(catalog, selectedCategory);
  const catalogProducts = useMemo(
    () =>
      filteredCatalog.map((item) => ({
        product: item.product,
        sceneImage: item.displayImage,
      })),
    [filteredCatalog]
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
    setAnalysisProgress('Reading room photo…');
    setRoomAnalysis(null);
    setActiveElementId(null);

    try {
      const hash = await hashRoomFile(file);
      roomHashRef.current = hash;

      const cached = await loadCachedRoomAnalysis(hash);
      if (cached && !controller.signal.aborted) {
        setRoomAnalysis(cached);
        setAnalysisStatus('ready');
        setAnalysisProgress(null);
        return;
      }

      const roomDataUri = await fileToDataUri(file);
      const analysis = await streamRoomAnalyze(roomDataUri, {
        signal: controller.signal,
        onProgress: (p) => {
          if (p.message) setAnalysisProgress(p.message);
        },
      });

      if (controller.signal.aborted) return;

      await saveCachedRoomAnalysis(hash, analysis);
      setRoomAnalysis(analysis);
      setAnalysisStatus('ready');
      setAnalysisProgress(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : 'Room scan failed. Please try again.';
      setAnalysisError(message);
      setAnalysisStatus('error');
      setAnalysisProgress(null);
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
      setResultRevision(0);
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
      const suggested = pickBestProductForElement(element, stagedIds, catalog);
      onElementPersonalize?.(element, suggested);
      if (suggested) {
        onActiveProductChange(suggested.id);
      }
    },
    [products, catalog, onElementPersonalize, onActiveProductChange]
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      silentAbortRef.current?.abort();
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

  const runSilentVisualization = useCallback(
    async (items: Product[], expectedIds: string[]) => {
      const roomFile = roomFileRef.current;
      if (!roomFile || items.length === 0) return;

      const requestId = ++silentRequestRef.current;
      silentAbortRef.current?.abort();
      const controller = new AbortController();
      silentAbortRef.current = controller;

      setIsSilentUpdating(true);
      setError(null);

      try {
        const roomDataUri = await fileToDataUri(roomFile);
        const staged = await streamRoomStage(
          buildRoomStageRequest({
            roomDataUri,
            mode: 'compose',
            products: items,
            colorSelections,
          }),
          { signal: controller.signal }
        );

        if (controller.signal.aborted || requestId !== silentRequestRef.current) return;

        const currentKey = [...placedRef.current.map((p) => p.id)].sort().join(',');
        const expectedKey = [...expectedIds].sort().join(',');
        if (currentKey !== expectedKey) return;

        setGeneratedImage(staged.imageUrl);
        setResultRevision((r) => r + 1);
        setStep('result');
        setActiveElementId(null);
      } catch (err) {
        if (controller.signal.aborted || requestId !== silentRequestRef.current) return;
        const message =
          err instanceof Error ? err.message : 'Could not update your room.';
        setError(message);
      } finally {
        if (requestId === silentRequestRef.current) {
          setIsSilentUpdating(false);
        }
      }
    },
    [colorSelections]
  );

  const applyGeneratedResult = useCallback((imageUrl: string) => {
    setGeneratedImage(imageUrl);
    setResultRevision((r) => r + 1);
    setStep('result');
    setIsComparing(false);
    setActiveElementId(null);
  }, []);

  const handleRemovePlaced = useCallback(
    (productId: string) => {
      const nextPlaced = placedProducts.filter((p) => p.id !== productId);
      const nextIds = nextPlaced.map((p) => p.id);
      onRemovePlacedProduct(productId);

      if (step === 'result' && generatedImage) {
        if (nextPlaced.length === 0) {
          silentRequestRef.current += 1;
          silentAbortRef.current?.abort();
          setIsSilentUpdating(false);
          setGeneratedImage(null);
          setResultRevision(0);
          setStep('ready');
        } else {
          void runSilentVisualization(nextPlaced, nextIds);
        }
      }
    },
    [placedProducts, onRemovePlacedProduct, step, generatedImage, runSilentVisualization]
  );

  const runRoomStageJob = useCallback(
    async (options: {
      mode: RoomStageMode;
      products: Product[];
      preferGeneratedFrame?: boolean;
      initialProgress: string;
      aiAction?: VisualizerAiAction | null;
      defaultErrorMessage?: string;
    }) => {
      if (!preview && !generatedImage && !roomFileRef.current) return;

      // Cancel any in-flight stage + silent updates, then claim a fresh slot.
      abortRef.current?.abort();
      silentAbortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++stageRequestRef.current;

      const stepBeforeRun: Step = generatedImage ? 'result' : 'ready';
      const isStillCurrent = () =>
        requestId === stageRequestRef.current && !controller.signal.aborted;

      setError(null);
      if (options.aiAction) setAiBusyAction(options.aiAction);
      setStageProgress(options.initialProgress);
      setStep('generating');

      try {
        const roomFile = await resolveRoomFileForAi({
          preview,
          generatedImage,
          preferGenerated: options.preferGeneratedFrame ?? false,
          roomFile: roomFileRef.current,
        });
        if (!isStillCurrent()) return;

        const roomDataUri = await fileToDataUri(roomFile);
        if (!isStillCurrent()) return;

        const staged = await streamRoomStage(
          buildRoomStageRequest({
            roomDataUri,
            mode: options.mode,
            products: options.products,
            colorSelections,
          }),
          {
            signal: controller.signal,
            onProgress: (p) => {
              if (!isStillCurrent()) return;
              if (p.message) setStageProgress(p.message);
            },
          }
        );

        if (!isStillCurrent()) return;

        if (!staged?.imageUrl || typeof staged.imageUrl !== 'string') {
          throw new Error('Gemini returned an empty image. Please try again.');
        }

        setStageProgress(null);
        applyGeneratedResult(staged.imageUrl);
        if (options.products.length > 0) {
          onPlacedProductsChange(options.products);
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          requestId !== stageRequestRef.current ||
          (err instanceof DOMException && err.name === 'AbortError')
        ) {
          return;
        }
        setStageProgress(null);
        const message =
          err instanceof Error
            ? err.message
            : options.defaultErrorMessage ?? 'Visualization failed. Please try again.';
        setError(message);
        setStep(stepBeforeRun);
      } finally {
        if (
          requestId === stageRequestRef.current &&
          options.aiAction
        ) {
          setAiBusyAction(null);
        }
      }
    },
    [
      preview,
      generatedImage,
      colorSelections,
      onPlacedProductsChange,
      applyGeneratedResult,
    ]
  );

  const runRearrange = useCallback(async () => {
    if (!roomFileRef.current && !preview && !generatedImage) return;

    // Rearrange uses the EXACT same pipeline as preview/compose. The Gemini
    // request shape is identical (text + room image + reference image), only
    // the prompt differs. Single-image input — no catalog products are sent.
    // No button spinner: the 3D-cube overlay (triggered by step==='generating')
    // is the only loading indicator on the room image itself.
    await runRoomStageJob({
      mode: 'rearrange',
      products: [],
      preferGeneratedFrame: Boolean(generatedImage),
      initialProgress: 'Rearranging your room…',
      defaultErrorMessage: 'Could not rearrange your room.',
    });
  }, [preview, generatedImage, runRoomStageJob]);

  const openCurateIntent = useCallback(() => {
    if (!roomFileRef.current || catalog.length === 0) return;
    if (step === 'generating') return;
    setCurateIntentOpen(true);
  }, [catalog.length, step]);

  const runCurate = useCallback(async (intent: CurateIntent = EMPTY_CURATE_INTENT) => {
    const roomFile = roomFileRef.current;
    if (!roomFile || catalog.length === 0) return;

    abortRef.current?.abort();
    silentAbortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setCurateIntentOpen(false);
    setCurateIntentLabel(formatCurateIntentLabel(intent));
    setAiBusyAction('curate');
    setStageProgress('Understanding your room…');
    setStep('generating');

    const userIntent = isCurateIntentEmpty(intent) ? undefined : intent;

    try {
      const { products: selected, brief } = await selectProductsForCurate(
        roomFile,
        catalog,
        {
          signal: controller.signal,
          maxPick: 5,
          userIntent,
        }
      );

      if (controller.signal.aborted) return;
      if (selected.length === 0) {
        throw new Error('AI could not pick products for this room. Try again.');
      }

      onSyncRoomProducts?.(selected);
      if (selected[0]) onActiveProductChange(selected[0].id);

      setCurateBriefForNextStage(brief);

      // Hand off to the unified staging job so curate uses the same proven path
      // as preview/rearrange. We clear our own controller — runRoomStageJob
      // installs its own.
      abortRef.current = null;
      await runRoomStageJob({
        mode: 'curate',
        products: selected,
        preferGeneratedFrame: false,
        initialProgress: 'Staging your curated room…',
        defaultErrorMessage: 'Could not curate your room.',
      });
    } catch (err) {
      if (
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return;
      }
      setStageProgress(null);
      const message =
        err instanceof Error ? err.message : 'Could not curate your room.';
      setError(message);
      setStep(generatedImage ? 'result' : 'ready');
    } finally {
      setAiBusyAction(null);
      setCurateIntentLabel(null);
    }
  }, [
    catalog,
    generatedImage,
    onSyncRoomProducts,
    onActiveProductChange,
    runRoomStageJob,
  ]);

  const handleCurateIntentConfirm = useCallback(
    (intent: CurateIntent) => {
      void runCurate(intent);
    },
    [runCurate]
  );

  const runVisualization = useCallback(async () => {
    const roomFile = roomFileRef.current;
    if (!roomFile || productsForPreview.length === 0) return;

    await runRoomStageJob({
      mode: 'compose',
      products: productsForPreview,
      preferGeneratedFrame: false,
      initialProgress: 'Preparing images…',
      defaultErrorMessage: 'Visualization failed. Please try again.',
    });
  }, [productsForPreview, runRoomStageJob]);

  const handleCatalogProductTap = useCallback(
    (product: Product) => {
      const isPlaced = placedIds.has(product.id);
      const isStaged = stagedIds.has(product.id);
      const isSelected = isPlaced || isStaged;

      if (isSelected) {
        if (isPlaced) {
          handleRemovePlaced(product.id);
        } else {
          onRemoveProduct(product.id);
        }
        return;
      }

      onStageProduct?.(product);
      onActiveProductChange(product.id);
    },
    [
      placedIds,
      stagedIds,
      onRemoveProduct,
      onStageProduct,
      onActiveProductChange,
      handleRemovePlaced,
    ]
  );

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
    registerRemovePlacedFromRoom?.(handleRemovePlaced);
    return () => registerRemovePlacedFromRoom?.(null);
  }, [handleRemovePlaced, registerRemovePlacedFromRoom]);

  useEffect(() => {
    const roomImageUrl = generatedImage ?? preview ?? null;
    onVisualizerContextChange?.({ step, roomImageUrl });
  }, [step, generatedImage, preview, onVisualizerContextChange]);

  const canAiRearrange = Boolean(
    step === 'result' && generatedImage ? generatedImage : preview
  );
  const canAiCurate = Boolean(roomFileRef.current) && catalog.length > 0;

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
      showAiRoomStudio: step !== 'pick',
      aiRoomDisabled: step === 'generating',
      aiRoomBusy: Boolean(aiBusyAction),
      aiBusyAction,
      canRearrange: canAiRearrange,
      canCurate: canAiCurate,
      onRearrange: () => void runRearrange(),
      onCurate: openCurateIntent,
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
    aiBusyAction,
    canAiRearrange,
    canAiCurate,
    runRearrange,
    openCurateIntent,
  ]);

  const showStagedResult = step === 'result' && Boolean(generatedImage);
  const displayImage = showStagedResult ? generatedImage! : preview;
  const showOriginalWithHotspots =
    step === 'ready' && !generatedImage && Boolean(preview) && !isComparing;
  const showHotspots =
    showOriginalWithHotspots &&
    !isComparing &&
    analysisStatus === 'ready' &&
    Boolean(roomAnalysis?.elements.length);

  const hasRoomImage =
    Boolean(preview && displayImage) &&
    (step === 'ready' || step === 'generating' || step === 'result');

  const canRunPreview =
    step !== 'generating' &&
    step !== 'pick' &&
    productsForPreview.length > 0 &&
    (pendingCount > 0 || !generatedImage || previewAction === 'regenerate');
  const showCompare = step === 'result' && Boolean(preview && generatedImage);
  const layoutVariant = variant ?? 'desktop';
  const mobileRoomBounds = useMobileRoomImageBounds(
    displayImage,
    layoutVariant === 'mobile' && step !== 'pick' && Boolean(displayImage)
  );
  const mobileImageMaxHeight =
    'calc(100dvh - 44dvh - 2.75rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))';
  const curateIntentSheet = (
    <CurateIntentSheet
      open={curateIntentOpen}
      variant={layoutVariant}
      busy={Boolean(aiBusyAction)}
      onClose={() => setCurateIntentOpen(false)}
      onConfirm={handleCurateIntentConfirm}
    />
  );

  // ─── SHARED: room image content ────────────────────────────────────────────
  const roomImageContent = (
    <>
      {/* Cream "studio" backdrop. Fills the letterbox areas around the
          object-contain photo so the room is framed by a soft cream wash
          (matching the desktop sidebar) instead of black bars.
          When a photo is present we extend it as a heavily-blurred fill
          beneath the cream tint — same visual trick as cinema-mode video
          players use for vertical phone clips. */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-cream" aria-hidden />
      {displayImage && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
            style={{
              backgroundImage: `url("${displayImage}")`,
              filter: 'blur(48px) saturate(1.15)',
              transform: 'scale(1.18)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-cream/55"
          />
        </>
      )}

      <AnimatePresence>
        {hasRoomImage && (
          <motion.div
            key="room-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            // Safe insets so the FULL room photo is visible inside the
            // chrome — i.e. not hidden behind the top toolbar or the
            // bottom product capsule.
            //   Mobile: fixed 60% viewport + safe-area; product bar lives in bottom 40%.
            //   Desktop: ~96 px top toolbar; ~120 px bottom product capsule.
            className={cn(
              'absolute inset-x-0 z-0',
              layoutVariant === 'mobile'
                ? 'top-[max(2.5rem,calc(env(safe-area-inset-top)+2.25rem))] bottom-2'
                : 'top-[max(3rem,calc(env(safe-area-inset-top)+2.75rem))] bottom-0 lg:top-24 lg:bottom-28'
            )}
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
                key={
                  showStagedResult
                    ? `staged-${resultRevision}-${(generatedImage ?? '').length}`
                    : `room-preview-${(preview ?? '').length}`
                }
                src={displayImage!}
                alt={showStagedResult ? 'AI staged room' : 'Your room'}
                className="h-full w-full object-contain"
                draggable={false}
              />
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {step === 'generating' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm pointer-events-auto">
          <VisualizerLoading3D
            overlay
            label={
              aiBusyAction === 'rearrange'
                ? 'Rearranging your room'
                : aiBusyAction === 'curate'
                  ? 'Curating your room'
                  : 'Creating your staged room'
            }
            sublabel={
              aiBusyAction === 'curate' && curateIntentLabel
                ? `${stageProgress ?? 'Working…'} · ${curateIntentLabel}`
                : stageProgress ?? 'Working with Gemini…'
            }
          />
        </div>
      )}
    </>
  );

  // ─── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (variant === 'mobile') {
    const mobileAiOpen =
      sidebarAiOpen && Boolean(aiContext) && Boolean(onCloseSidebarAI);
    const mobileChromeGlass = step !== 'pick' ? 'glass-dark text-cream/90' : 'glass text-ink';

    const mobileDetailsPanel = !activeProduct ? (
      <div className="flex items-center justify-center py-10 text-center">
        <p className="text-sm text-ink-muted">Pick a product to see details</p>
      </div>
    ) : (
      <div className="flex flex-col gap-4 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-parchment/60">
          <motion.img
            key={activeProductImage}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            src={activeProductImage}
            alt={activeProduct.name}
            className="aspect-[4/3] w-full object-contain p-4 mix-blend-multiply"
          />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-ink/8 pb-3">
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink">
              {activeProduct.name}
            </h3>
            {activeVariant && (
              <p className="mt-1 text-sm font-medium text-bronze">{activeVariant.name}</p>
            )}
          </div>
          <span className="shrink-0 font-display text-lg font-medium text-bronze">
            {activeProduct.price}
          </span>
        </div>

        {activeProduct.variants && activeProduct.variants.length > 0 && (
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
                    'flex items-center gap-2 rounded-full border px-2.5 py-1.5 transition-all active:scale-[0.98]',
                    isSelected
                      ? 'border-ink/25 bg-parchment'
                      : 'border-ink/10 bg-cream/80'
                  )}
                  aria-pressed={isSelected}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-full border border-ink/15"
                    style={{ backgroundColor: v.swatch }}
                  />
                  <span className="text-xs font-medium text-ink">{v.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-sm leading-relaxed text-ink-muted">{activeProduct.description}</p>

        {onOpenAI && (
          <button
            type="button"
            onClick={() => onOpenAI(activeProduct)}
            className="flex w-full items-center gap-2 rounded-xl border border-ink/8 px-3 py-2.5 text-left text-sm font-medium text-ink active:scale-[0.99]"
          >
            <Sparkles className="h-4 w-4 text-bronze" strokeWidth={1.75} />
            Ask AI about this piece
          </button>
        )}

        {placedIds.has(activeProduct.id) && (
          <button
            type="button"
            onClick={() => handleRemovePlaced(activeProduct.id)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-ink/12 py-2.5 text-xs font-medium text-ink-muted active:scale-[0.99]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
            Remove from room
          </button>
        )}

        <AddToCartButton
          variant="full"
          onClick={() => onAddToCart?.(activeProduct)}
        />
      </div>
    );

    return (
      <>
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-ink">
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

        {/* Room — height follows image aspect ratio; catalog fills the rest */}
        <div
          className={cn(
            'relative w-full shrink-0 overflow-hidden bg-cream',
            step === 'pick' && 'min-h-[34dvh]'
          )}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <AnimatePresence mode="wait">
            {step === 'pick' ? (
              <motion.button
                key="pick-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex min-h-[calc(34dvh-env(safe-area-inset-top))] w-full flex-col items-center justify-center gap-4 bg-ink px-6 active:bg-ink/90"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bronze shadow-[0_4px_20px_rgba(184,114,58,0.40)]">
                  <Upload className="h-6 w-6 text-cream" strokeWidth={1.75} />
                </span>
                <div className="text-center">
                  <p className="text-lg font-medium text-cream">Upload your room</p>
                  <p className="mt-1 text-sm text-cream/55">JPG · PNG · HEIC</p>
                  {pickCount > 0 && (
                    <p className="mt-2 text-xs font-semibold text-bronze">
                      {pickCount} selected
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
                className="relative w-full pt-10"
              >
                <div
                  className="relative mx-auto w-full"
                  style={
                    mobileRoomBounds
                      ? {
                          aspectRatio: `${mobileRoomBounds.naturalWidth} / ${mobileRoomBounds.naturalHeight}`,
                          maxHeight: mobileImageMaxHeight,
                        }
                      : { maxHeight: mobileImageMaxHeight }
                  }
                >
                  {isComparing && preview && generatedImage ? (
                    <CompareSlider
                      originalImage={preview}
                      generatedImage={generatedImage}
                      className="h-full w-full min-h-[120px]"
                    />
                  ) : showOriginalWithHotspots && preview ? (
                    <RoomSceneFrame
                      imageSrc={preview}
                      alt="Your room"
                      analysis={roomAnalysis}
                      activeElementId={activeElementId}
                      showHotspots={showHotspots}
                      onElementSelect={handleElementSelect}
                      className="relative h-full min-h-[120px] w-full"
                    />
                  ) : (
                    displayImage && (
                      <img
                        key={
                          showStagedResult
                            ? `staged-m-${resultRevision}`
                            : `room-m-${(preview ?? '').length}`
                        }
                        src={displayImage}
                        alt={showStagedResult ? 'AI staged room' : 'Your room'}
                        className="block h-auto w-full max-h-[inherit] object-contain"
                        draggable={false}
                      />
                    )
                  )}
                </div>

                {step === 'generating' && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/45 backdrop-blur-[2px]">
                    <VisualizerLoading3D
                      overlay
                      label={
                        aiBusyAction === 'rearrange'
                          ? 'Rearranging your room'
                          : aiBusyAction === 'curate'
                            ? 'Curating your room'
                            : 'Creating your staged room'
                      }
                      sublabel={
                        aiBusyAction === 'curate' && curateIntentLabel
                          ? `${stageProgress ?? 'Working…'} · ${curateIntentLabel}`
                          : stageProgress ?? 'Working with Gemini…'
                      }
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {preview && step === 'ready' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
              <AnimatePresence mode="wait">
                {analysisStatus === 'loading' && (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="glass-dark flex items-center gap-2 rounded-full px-4 py-2"
                  >
                    <Scan className="h-3.5 w-3.5 animate-pulse text-bronze" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-cream/85">
                      {analysisProgress ?? 'Scanning room…'}
                    </span>
                  </motion.div>
                )}
                {showHotspots && (
                  <motion.div
                    key="hint"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="glass-dark rounded-full px-4 py-2"
                  >
                    <span className="text-xs font-medium text-cream/80">
                      Tap a dot to swap furniture
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {analysisStatus === 'error' && preview && step === 'ready' && (
            <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-20">
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

          {error && step !== 'pick' && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[55]">
              <div className="glass-dark flex items-start gap-2 rounded-2xl px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
                <p className="text-sm text-cream/80">{error}</p>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95',
                mobileChromeGlass
              )}
              aria-label="Back to shop"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>

            <div className="pointer-events-auto flex items-center gap-2">
              {step !== 'pick' && (
                <VisualizerMobileMenu
                  disabled={step === 'generating'}
                  canShare={Boolean(activeProduct)}
                  shareCopied={shareFeedback === 'copied'}
                  showCompare={showCompare}
                  isComparing={isComparing}
                  showChangePhoto={step !== 'generating'}
                  canRearrange={canAiRearrange}
                  canCurate={canAiCurate}
                  aiBusy={Boolean(aiBusyAction)}
                  aiBusyAction={aiBusyAction}
                  onShare={() => void handleShare()}
                  onToggleCompare={() => setIsComparing((v) => !v)}
                  onChangePhoto={openRoomPhotoPicker}
                  onRearrange={() => void runRearrange()}
                  onCurate={openCurateIntent}
                  onAskAi={onOpenSidebarAI}
                />
              )}

              <CartIconButton
                cartCount={cartCount}
                pulseKey={cartPulseKey}
                onClick={onCartClick}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95',
                  mobileChromeGlass
                )}
                iconClassName="h-4 w-4"
                badgeClassName="text-[9px] min-w-4 h-4"
              />
            </div>
          </div>
        </div>

        {/* Bottom panel — fills space below the image (min ~44% viewport) */}
        <div className="flex min-h-[44dvh] min-w-0 flex-1 flex-col overflow-hidden rounded-t-[1.25rem] bg-cream shadow-[0_-8px_28px_rgba(0,0,0,0.22)]">
          {mobileAiOpen && aiContext && onCloseSidebarAI ? (
            <VisualizerSidebarAI
              className="min-h-0 flex-1"
              context={aiContext}
              active={sidebarAiOpen}
              initialQuery={aiInitialQuery}
              onClearInitialQuery={onClearAiInitialQuery}
              onBack={onCloseSidebarAI}
              onTryInRoom={onStageProduct}
              onAddToCart={onAddToCart}
              onProductClick={(p) => {
                onCloseSidebarAI();
                onActiveProductChange(p.id);
                setActiveTab('details');
              }}
            />
          ) : (
            <>
              <div className="shrink-0 px-4 pt-2.5 pb-2">
                <div className="flex rounded-full bg-parchment p-0.5">
                  {(['products', 'details'] as MobileTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-semibold transition-all active:scale-[0.98]',
                        activeTab === tab ? 'bg-ink text-cream' : 'text-ink-muted'
                      )}
                    >
                      {tab === 'products' ? 'Catalog' : 'Details'}
                      {tab === 'products' && pickCount > 0 && (
                        <span
                          className={cn(
                            'flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold tabular-nums',
                            activeTab === 'products'
                              ? 'bg-cream/20 text-cream'
                              : 'bg-bronze/20 text-bronze'
                          )}
                        >
                          {pickCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTab === 'products' ? (
                    <motion.div
                      key="tab-products"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                      {onCategorySelect && (
                        <div className="shrink-0 border-b border-ink/6 px-4 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <CategoryImagePicker
                              selectedCategory={selectedCategory}
                              onSelectCategory={onCategorySelect}
                              variant="header"
                              className="min-w-0 flex-1"
                            />
                            {onOpenSidebarAI && (
                              <SidebarAiButton onClick={onOpenSidebarAI} />
                            )}
                          </div>
                        </div>
                      )}

                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 py-2">
                        <div className="columns-2 gap-2.5">
                          {catalogProducts.map(({ product, sceneImage }, index) => {
                            const isActive = activeProduct?.id === product.id;
                            const isSelected =
                              placedIds.has(product.id) || stagedIds.has(product.id);
                            const heightClass =
                              CATALOG_ASPECT_RATIOS[index % CATALOG_ASPECT_RATIOS.length];
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleCatalogProductTap(product)}
                                className="group relative mb-2.5 flex w-full break-inside-avoid flex-col text-left active:scale-[0.98]"
                              >
                                <div
                                  className={cn(
                                    'relative w-full overflow-hidden rounded-xl bg-parchment/60',
                                    heightClass,
                                    isSelected && 'ring-2 ring-bronze/40',
                                    isActive && isSelected && 'ring-ink/25'
                                  )}
                                >
                                  <img
                                    src={sceneImage}
                                    alt={product.name}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                  <span
                                    className={cn(
                                      'absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full',
                                      isSelected
                                        ? 'bg-bronze text-cream'
                                        : 'bg-cream/95 text-ink ring-1 ring-ink/10'
                                    )}
                                    aria-hidden
                                  >
                                    {isSelected ? (
                                      <Check className="h-4 w-4" strokeWidth={2.5} />
                                    ) : (
                                      <Plus className="h-4 w-4" strokeWidth={2} />
                                    )}
                                  </span>
                                </div>
                                <p className="mt-1.5 line-clamp-1 text-xs font-medium text-ink">
                                  {product.name}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="tab-details"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 py-2"
                    >
                      {mobileDetailsPanel}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {step !== 'pick' && (
                <div className="shrink-0 border-t border-ink/6 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <VisualizerProductBar
                    layout="dock"
                    catalog={catalog}
                    stagedProducts={products}
                    placedProducts={placedProducts}
                    activeProduct={activeProduct}
                    activeProductId={activeProductId}
                    colorSelections={colorSelections}
                    step={step}
                    hasRoomPhoto
                    hasLivePreview={hasLivePreview}
                    pendingCount={pendingCount}
                    pickCount={pickCount}
                    canRunPreview={canRunPreview}
                    isSilentUpdating={isSilentUpdating}
                    onColorSelect={onColorSelect}
                    onActiveProductChange={onActiveProductChange}
                    onRemoveProduct={onRemoveProduct}
                    onRemovePlacedProduct={handleRemovePlaced}
                    onPreview={handlePreview}
                    onAddToCart={onAddToCart}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {curateIntentSheet}
      </>
    );
  }

  // ─── DESKTOP LAYOUT (unchanged) ────────────────────────────────────────────
  return (
    <>
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
                  {pickCount > 0 && (
                    <p className="mt-3 text-xs font-medium text-bronze">
                      {pickCount} selected
                    </p>
                  )}
                </motion.div>
              </motion.button>
            )}

          </AnimatePresence>
        </motion.div>

        {error && preview && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none absolute bottom-4 left-1/2 z-[55] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 lg:bottom-6"
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
        catalog={catalog}
        stagedProducts={products}
        placedProducts={placedProducts}
        activeProduct={activeProduct}
        activeProductId={activeProductId}
        colorSelections={colorSelections}
        step={step}
        hasRoomPhoto={step !== 'pick'}
        hasLivePreview={hasLivePreview}
        pendingCount={pendingCount}
        pickCount={pickCount}
        canRunPreview={canRunPreview}
        isSilentUpdating={isSilentUpdating}
        onColorSelect={onColorSelect}
        onActiveProductChange={onActiveProductChange}
        onRemoveProduct={onRemoveProduct}
        onRemovePlacedProduct={handleRemovePlaced}
        onPreview={handlePreview}
        onAddToCart={onAddToCart}
      />
    </motion.div>
    {curateIntentSheet}
    </>
  );
}
