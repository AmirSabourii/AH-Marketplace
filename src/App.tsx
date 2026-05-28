import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hero from './components/Hero';
import ProductMasonryGrid from './components/ProductMasonryGrid';
import ProductSheet from './components/ProductSheet';
import AppHeader from './components/AppHeader';
import VisualizerHeader from './components/VisualizerHeader';
import AIAssistantShell from './components/AIAssistantShell';
import TryInMyRoomView from './components/TryInMyRoomView';
import { useMediaQuery } from './hooks/useMediaQuery';
import type { AIContext, AIVisualizerStep } from './types/ai';

import UploadFlow from './components/UploadFlow';
import { cn } from './lib/cn';
import { type CategoryId } from './data/categories';
import { type Product } from './data/scenes';
import { useCatalogProducts } from './hooks/useCatalogProducts';
import { findProductInCatalog } from './lib/medusa/products';
import type { DetectedRoomElement } from './lib/roomAnalysis/types';
import { parseDeepLink } from './lib/share';
import { hasSavedRoom as checkHasSavedRoom } from './lib/savedRoom';
import {
  defaultVisualizerChrome,
  type ShareFeedback,
  type VisualizerChromeState,
} from './components/visualizerChrome';
import CartDrawer from './components/CartDrawer';
import UserModal, { type UserProfile } from './components/UserModal';
import {
  addToCartItems,
  cartItemKey,
  getCartCount,
  removeCartItem,
  updateCartItemQuantity,
  type CartItem,
} from './lib/cart';

function App() {
  const firstCategory = 'all';
  const deepLink = parseDeepLink();
  const { items: catalog, loading: catalogLoading, error: catalogError, refresh: refreshCatalog } =
    useCatalogProducts();

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [colorSelections, setColorSelections] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(
    deepLink.categoryId ?? firstCategory
  );
  const [tryInRoomOpen, setTryInRoomOpen] = useState(false);
  // Tracks viewport so we only ever mount ONE TryInMyRoomView (desktop OR
  // mobile). Rendering both at the same time gave them separate internal
  // state (preview, generatedImage, roomFileRef…) while both fought to
  // register handlers on the shared App refs — the second-registered
  // (mobile, hidden via CSS on desktop) won, which broke compare /
  // rearrange / change-photo when the desktop user clicked them in the
  // top toolbar.
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktopViewport(e.matches);
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  const [stagedProducts, setStagedProducts] = useState<Product[]>([]);
  const [placedProducts, setPlacedProducts] = useState<Product[]>([]);
  const [activeStagedProductId, setActiveStagedProductId] = useState<string | null>(null);
  const [hasSavedRoom, setHasSavedRoom] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [visualizerSidebarAi, setVisualizerSidebarAi] = useState(false);
  const [aiInitialQuery, setAiInitialQuery] = useState('');
  const [aiContextProduct, setAiContextProduct] = useState<Product | null>(null);
  const [visualizerRoomImageUrl, setVisualizerRoomImageUrl] = useState<string | null>(
    null
  );
  const [visualizerStep, setVisualizerStep] = useState<AIVisualizerStep>('pick');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartPulseKey, setCartPulseKey] = useState(0);
  const [lastAddedCartItemId, setLastAddedCartItemId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [heroChatActive, setHeroChatActive] = useState(false);
  const deepLinkHandled = useRef(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [visualizerChromeMeta, setVisualizerChromeMeta] = useState({
    canShare: false,
    shareFeedback: 'idle' as ShareFeedback,
    showCompare: false,
    isComparing: false,
    showChangePhoto: false,
    showAiRoomStudio: false,
    aiRoomDisabled: true,
    aiRoomBusy: false,
    aiBusyAction: null as VisualizerChromeState['aiBusyAction'],
    canRearrange: false,
    canCurate: false,
  });
  const visualizerChromeHandlers = useRef({
    onShare: defaultVisualizerChrome.onShare,
    onToggleCompare: defaultVisualizerChrome.onToggleCompare,
    onRearrange: defaultVisualizerChrome.onRearrange!,
    onCurate: defaultVisualizerChrome.onCurate!,
  });
  const roomPhotoPickerRef = useRef<(() => void) | null>(null);
  const removePlacedFromRoomRef = useRef<((productId: string) => void) | null>(null);

  const registerRoomPhotoPicker = useCallback((picker: (() => void) | null) => {
    roomPhotoPickerRef.current = picker;
  }, []);

  const registerRemovePlacedFromRoom = useCallback(
    (handler: ((productId: string) => void) | null) => {
      removePlacedFromRoomRef.current = handler;
    },
    []
  );

  const handleVisualizerChromeChange = useCallback((chrome: VisualizerChromeState) => {
    visualizerChromeHandlers.current = {
      onShare: chrome.onShare,
      onToggleCompare: chrome.onToggleCompare,
      onRearrange: chrome.onRearrange ?? (() => {}),
      onCurate: chrome.onCurate ?? (() => {}),
    };
    setVisualizerChromeMeta((prev) => {
      if (
        prev.canShare === chrome.canShare &&
        prev.shareFeedback === chrome.shareFeedback &&
        prev.showCompare === chrome.showCompare &&
        prev.isComparing === chrome.isComparing &&
        prev.showChangePhoto === chrome.showChangePhoto &&
        prev.showAiRoomStudio === chrome.showAiRoomStudio &&
        prev.aiRoomDisabled === chrome.aiRoomDisabled &&
        prev.aiRoomBusy === chrome.aiRoomBusy &&
        prev.aiBusyAction === chrome.aiBusyAction &&
        prev.canRearrange === chrome.canRearrange &&
        prev.canCurate === chrome.canCurate
      ) {
        return prev;
      }
      return {
        canShare: chrome.canShare,
        shareFeedback: chrome.shareFeedback,
        showCompare: chrome.showCompare,
        isComparing: chrome.isComparing,
        showChangePhoto: chrome.showChangePhoto,
        showAiRoomStudio: chrome.showAiRoomStudio ?? false,
        aiRoomDisabled: chrome.aiRoomDisabled ?? true,
        aiRoomBusy: chrome.aiRoomBusy ?? false,
        aiBusyAction: chrome.aiBusyAction ?? null,
        canRearrange: chrome.canRearrange ?? false,
        canCurate: chrome.canCurate ?? false,
      };
    });
  }, []);

  const visualizerChrome: VisualizerChromeState = {
    ...visualizerChromeMeta,
    onShare: () => visualizerChromeHandlers.current.onShare(),
    onToggleCompare: () => visualizerChromeHandlers.current.onToggleCompare(),
    onChangeRoomPhoto: () => roomPhotoPickerRef.current?.(),
    onRearrange: () => visualizerChromeHandlers.current.onRearrange(),
    onCurate: () => visualizerChromeHandlers.current.onCurate(),
  };

  const refreshSavedRoomFlag = useCallback(() => {
    void checkHasSavedRoom().then(setHasSavedRoom);
  }, []);

  useEffect(() => {
    refreshSavedRoomFlag();
  }, [refreshSavedRoomFlag]);

  useEffect(() => {
    if (!tryInRoomOpen || window.matchMedia('(min-width: 1024px)').matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [tryInRoomOpen]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-20% 0px 0px 0px' }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const closeSheet = useCallback(() => {
    setActiveProduct(null);
  }, []);

  const scrollToGrid = useCallback(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const openVisualizer = useCallback(
    (product?: Product) => {
      if (product) {
        setStagedProducts((prev) => {
          if (prev.some((p) => p.id === product.id)) return prev;
          return [...prev, product];
        });
        setActiveStagedProductId(product.id);
      }
      setTryInRoomOpen(true);
      closeSheet();
      setCartOpen(false);
      scrollToGrid();
    },
    [closeSheet, scrollToGrid]
  );

  const handleVisualizerContextChange = useCallback(
    (ctx: { step: AIVisualizerStep; roomImageUrl: string | null }) => {
      setVisualizerStep(ctx.step);
      setVisualizerRoomImageUrl(ctx.roomImageUrl);
    },
    []
  );

  const closeVisualizer = useCallback(() => {
    roomPhotoPickerRef.current = null;
    setTryInRoomOpen(false);
    setVisualizerSidebarAi(false);
    setStagedProducts([]);
    setPlacedProducts([]);
    setActiveStagedProductId(null);
    setVisualizerRoomImageUrl(null);
    setVisualizerStep('pick');
    setVisualizerChromeMeta({
      canShare: false,
      shareFeedback: 'idle',
      showCompare: false,
      isComparing: false,
      showChangePhoto: false,
      showAiRoomStudio: false,
      aiRoomDisabled: true,
      aiRoomBusy: false,
      aiBusyAction: null,
      canRearrange: false,
      canCurate: false,
    });
  }, []);

  const openProduct = useCallback(
    (product: Product) => {
      if (tryInRoomOpen) {
        setActiveStagedProductId(product.id);
        setStagedProducts((prev) => {
          if (prev.some((p) => p.id === product.id)) return prev;
          return [...prev, product];
        });
        return;
      }
      setAiOpen(false);
      setActiveProduct(product);
    },
    [tryInRoomOpen]
  );

  const handleRemoveStagedProduct = useCallback((productId: string) => {
    setStagedProducts((prev) => prev.filter((p) => p.id !== productId));
    setActiveStagedProductId((activeId) => {
      if (activeId !== productId) return activeId;
      return null;
    });
  }, []);

  useEffect(() => {
    if (!tryInRoomOpen) return;
    if (!activeStagedProductId) return;
    const stillSelected =
      placedProducts.some((p) => p.id === activeStagedProductId) ||
      stagedProducts.some((p) => p.id === activeStagedProductId);
    if (stillSelected) return;
    const fallback =
      placedProducts[0]?.id ?? stagedProducts[0]?.id ?? null;
    setActiveStagedProductId(fallback);
  }, [
    tryInRoomOpen,
    placedProducts,
    stagedProducts,
    activeStagedProductId,
  ]);

  const handleRemovePlacedProduct = useCallback((productId: string) => {
    setPlacedProducts((prev) => {
      const nextPlaced = prev.filter((p) => p.id !== productId);
      setStagedProducts((staged) => {
        const nextStaged = staged.filter((p) => p.id !== productId);
        setActiveStagedProductId((activeId) => {
          if (activeId !== productId) return activeId;
          return nextPlaced[0]?.id ?? nextStaged[0]?.id ?? null;
        });
        return nextStaged;
      });
      return nextPlaced;
    });
  }, []);

  const handlePlacedProductsChange = useCallback((products: Product[]) => {
    setPlacedProducts(products);
    setStagedProducts([]);
  }, []);

  const handleSyncRoomProducts = useCallback((products: Product[]) => {
    setStagedProducts(products);
    setPlacedProducts(products);
    setActiveStagedProductId(products[0]?.id ?? null);
  }, []);

  const handleSidebarProductTap = useCallback(
    (product: Product) => {
      if (!tryInRoomOpen) {
        openProduct(product);
        return;
      }

      const isPlaced = placedProducts.some((p) => p.id === product.id);
      const isStaged = stagedProducts.some((p) => p.id === product.id);
      const isSelected = isPlaced || isStaged;

      if (isSelected) {
        if (isPlaced) {
          removePlacedFromRoomRef.current?.(product.id) ??
            handleRemovePlacedProduct(product.id);
        } else {
          handleRemoveStagedProduct(product.id);
        }
        return;
      }

      setStagedProducts((prev) => {
        if (prev.some((p) => p.id === product.id)) return prev;
        return [...prev, product];
      });
      setActiveStagedProductId(product.id);
    },
    [
      tryInRoomOpen,
      openProduct,
      stagedProducts,
      placedProducts,
      activeStagedProductId,
      handleRemoveStagedProduct,
      handleRemovePlacedProduct,
    ]
  );

  const openCart = useCallback(() => {
    setAiOpen(false);
    setCartOpen(true);
  }, []);

  const selectProductColor = useCallback((productId: string, variantId: string) => {
    setColorSelections((prev) => ({ ...prev, [productId]: variantId }));
  }, []);

  const handleTryInRoom = useCallback(
    (product: Product) => {
      openVisualizer(product);
    },
    [openVisualizer]
  );

  const handleStageProduct = useCallback((product: Product) => {
    setStagedProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
    setActiveStagedProductId(product.id);
  }, []);

  const handleElementPersonalize = useCallback(
    (element: DetectedRoomElement, suggestedProduct: Product | null) => {
      const categoryId = element.suggestedCategoryIds.find((c) => c !== 'all');
      if (categoryId) {
        setSelectedCategory(categoryId);
      }

      if (suggestedProduct) {
        setStagedProducts((prev) => {
          if (prev.some((p) => p.id === suggestedProduct.id)) return prev;
          return [...prev, suggestedProduct];
        });
        setActiveStagedProductId(suggestedProduct.id);
      }

      if (!tryInRoomOpen) return;
      document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
    },
    [tryInRoomOpen]
  );

  const handleVisualizeCart = useCallback(() => {
    const uniqueProducts = cartItems.reduce<Product[]>((acc, item) => {
      if (!acc.some((p) => p.id === item.product.id)) {
        acc.push(item.product);
      }
      return acc;
    }, []);

    if (uniqueProducts.length === 0) return;

    setStagedProducts(uniqueProducts);
    setActiveStagedProductId(uniqueProducts[0].id);
    setTryInRoomOpen(true);
    setCartOpen(false);
    closeSheet();
    scrollToGrid();
  }, [cartItems, closeSheet, scrollToGrid]);

  const handleCategorySelect = useCallback(
    (id: CategoryId) => {
      setSelectedCategory(id);
      closeSheet();
      if (id !== 'all') {
        scrollToGrid();
      }
    },
    [closeSheet, scrollToGrid]
  );

  useEffect(() => {
    if (deepLinkHandled.current || catalogLoading) return;

    const { categoryId, productId, openRoom } = parseDeepLink();
    if (!categoryId && !openRoom && !productId) {
      deepLinkHandled.current = true;
      return;
    }

    deepLinkHandled.current = true;

    window.setTimeout(() => {
      if (productId) {
        const found = findProductInCatalog(catalog, productId);
        if (found) {
          setSelectedCategory(found.categoryId);
          if (openRoom) {
            setStagedProducts([found.product]);
            setActiveStagedProductId(found.product.id);
            setTryInRoomOpen(true);
            scrollToGrid();
          } else {
            setActiveProduct(found.product);
          }
        }
      } else if (openRoom) {
        setTryInRoomOpen(true);
        scrollToGrid();
      }
    }, 150);
  }, [scrollToGrid, catalog, catalogLoading]);

  const handleAddToCart = useCallback(
    (product?: Product | null) => {
      const target =
        product ??
        activeProduct ??
        placedProducts.find((p) => p.id === activeStagedProductId) ??
        stagedProducts.find((p) => p.id === activeStagedProductId) ??
        placedProducts[0] ??
        stagedProducts[0];
      if (!target) return;

      const variantId = colorSelections[target.id];
      const itemId = cartItemKey(target.id, variantId);
      setCartItems((items) => addToCartItems(items, target, variantId));
      setCartPulseKey((k) => k + 1);
      setLastAddedCartItemId(itemId);
      if (!tryInRoomOpen) {
        setActiveProduct(null);
      }
    },
    [
      activeProduct,
      stagedProducts,
      placedProducts,
      activeStagedProductId,
      colorSelections,
      tryInRoomOpen,
    ]
  );

  const handleUpdateCartQuantity = useCallback((itemId: string, quantity: number) => {
    setCartItems((items) => updateCartItemQuantity(items, itemId, quantity));
  }, []);

  const handleRemoveCartItem = useCallback((itemId: string) => {
    setCartItems((items) => removeCartItem(items, itemId));
  }, []);

  const cartCount = getCartCount(cartItems);
  const stagedCount = placedProducts.length || stagedProducts.length;

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const aiContext = useMemo((): AIContext => {
    const stagedActive =
      placedProducts.find((p) => p.id === activeStagedProductId) ??
      stagedProducts.find((p) => p.id === activeStagedProductId);
    const product = aiContextProduct ?? activeProduct ?? stagedActive ?? null;
    const roomProducts =
      placedProducts.length > 0 ? placedProducts : stagedProducts;

    let surface: AIContext['surface'] = 'home';
    if (tryInRoomOpen) surface = 'visualizer';
    else if (product && (aiContextProduct || activeProduct)) surface = 'product';

    return {
      surface,
      product,
      categoryId: selectedCategory,
      stagedProducts: tryInRoomOpen ? roomProducts : undefined,
      visualizerStep: tryInRoomOpen ? visualizerStep : undefined,
      roomImageUrl: tryInRoomOpen ? visualizerRoomImageUrl : undefined,
      catalog,
    };
  }, [
    aiContextProduct,
    activeProduct,
    activeStagedProductId,
    stagedProducts,
    placedProducts,
    selectedCategory,
    tryInRoomOpen,
    visualizerStep,
    visualizerRoomImageUrl,
    catalog,
  ]);

  const showAiCollapsed =
    !tryInRoomOpen &&
    !aiOpen &&
    !cartOpen &&
    !userModalOpen &&
    !(activeProduct && !isDesktop) &&
    (!isHeroVisible || heroChatActive);

  const handleOpenAI = useCallback(
    (opts?: { product?: Product | null; query?: string }) => {
      setAiContextProduct(opts?.product ?? null);
      setAiInitialQuery(opts?.query?.trim() ?? '');
      setActiveProduct(null);
      setCartOpen(false);
      if (tryInRoomOpen) {
        setVisualizerSidebarAi(true);
        return;
      }
      setAiOpen(true);
    },
    [tryInRoomOpen]
  );

  const handleCloseVisualizerSidebarAi = useCallback(() => {
    setVisualizerSidebarAi(false);
  }, []);

  const handleBackToShop = useCallback(() => {
    closeVisualizer();
  }, [closeVisualizer]);

  return (
    <>
      <div className={cn(tryInRoomOpen && 'max-lg:hidden')}>
        <AppHeader
          cartCount={cartCount}
          cartPulseKey={cartPulseKey}
          onCartClick={openCart}
          onUserClick={() => setUserModalOpen(true)}
          onMyRoomClick={() => openVisualizer()}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          showCategories={!isHeroVisible && !tryInRoomOpen}
          tryInRoomActive={tryInRoomOpen}
          hasSavedRoom={hasSavedRoom}
          stagedCount={stagedCount}
          onLogoClick={() => {
            closeSheet();
            closeVisualizer();
            setCartOpen(false);
            setAiOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>

      <div
        className={cn(
          'flex min-h-screen w-full overflow-hidden bg-cream',
          tryInRoomOpen && 'max-lg:hidden'
        )}
      >
        <motion.main
          className={cn(
            'relative flex h-screen flex-col overflow-y-auto no-scrollbar transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
            tryInRoomOpen ? 'w-full border-r border-ink/10 lg:w-[35%] xl:w-[30%]' : 'w-full'
          )}
        >
          <div
            ref={heroRef}
            className={cn('transition-opacity duration-500', tryInRoomOpen && 'hidden')}
          >
            <Hero
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              onPromptSubmit={(query) => handleOpenAI({ query })}
              onUpload={() => setUploadOpen(true)}
              chatActive={heroChatActive && aiOpen && !tryInRoomOpen}
            />
          </div>

          <ProductMasonryGrid
            catalog={catalog}
            catalogLoading={catalogLoading}
            catalogError={catalogError}
            onRetryCatalog={refreshCatalog}
            selectedCategory={selectedCategory}
            onProductClick={tryInRoomOpen ? handleSidebarProductTap : openProduct}
            onTryInRoom={handleTryInRoom}
            onCategorySelect={handleCategorySelect}
            onOpenAI={() => handleOpenAI()}
            onOpenVisualizer={() => openVisualizer()}
            isSidebar={tryInRoomOpen}
            hasSavedRoom={hasSavedRoom}
            stagedProducts={tryInRoomOpen ? stagedProducts : undefined}
            placedProducts={tryInRoomOpen ? placedProducts : undefined}
            activeStagedProductId={tryInRoomOpen ? activeStagedProductId : undefined}
            sidebarAiOpen={tryInRoomOpen && visualizerSidebarAi}
            aiContext={tryInRoomOpen ? aiContext : undefined}
            aiInitialQuery={aiInitialQuery}
            onClearAiInitialQuery={() => setAiInitialQuery('')}
            onOpenSidebarAI={() => handleOpenAI()}
            onCloseSidebarAI={handleCloseVisualizerSidebarAi}
            onAddToCart={(product) => handleAddToCart(product)}
            onProductClickFromAi={(product) => {
              handleCloseVisualizerSidebarAi();
              handleSidebarProductTap(product);
            }}
          />
        </motion.main>

        <AnimatePresence>
          {tryInRoomOpen && isDesktopViewport && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
              className="relative h-screen min-h-0 flex-1 overflow-hidden bg-ink"
            >
              <VisualizerHeader
                cartCount={cartCount}
                cartPulseKey={cartPulseKey}
                stagedCount={stagedCount}
                onBackToShop={handleBackToShop}
                onCartClick={openCart}
                chrome={visualizerChrome}
              />
              <TryInMyRoomView
                variant="desktop"
                catalog={catalog}
                products={stagedProducts}
                placedProducts={placedProducts}
                activeProductId={activeStagedProductId}
                colorSelections={colorSelections}
                onColorSelect={selectProductColor}
                onActiveProductChange={setActiveStagedProductId}
                onRemoveProduct={handleRemoveStagedProduct}
                onRemovePlacedProduct={handleRemovePlacedProduct}
                onPlacedProductsChange={handlePlacedProductsChange}
                onSyncRoomProducts={handleSyncRoomProducts}
                registerRemovePlacedFromRoom={registerRemovePlacedFromRoom}
                onClose={closeVisualizer}
                onRoomSaved={refreshSavedRoomFlag}
                onChromeChange={handleVisualizerChromeChange}
                registerRoomPhotoPicker={registerRoomPhotoPicker}
                onAddToCart={(product) => handleAddToCart(product)}
                onElementPersonalize={handleElementPersonalize}
                onOpenAI={(product) => handleOpenAI({ product: product ?? null })}
                onVisualizerContextChange={handleVisualizerContextChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AIAssistantShell
        open={aiOpen && !tryInRoomOpen}
        onOpenChange={setAiOpen}
        context={aiContext}
        initialQuery={aiInitialQuery}
        onClearInitialQuery={() => setAiInitialQuery('')}
        showCollapsed={showAiCollapsed}
        placement={tryInRoomOpen ? 'visualizer' : 'shop'}
        onChatActiveChange={setHeroChatActive}
        onTryInRoom={handleTryInRoom}
        onAddToCart={(product) => handleAddToCart(product)}
        onProductClick={(product) => {
          setAiOpen(false);
          openProduct(product);
        }}
      />

      <ProductSheet
        product={activeProduct}
        colorSelections={colorSelections}
        onColorSelect={selectProductColor}
        onTryInRoom={handleTryInRoom}
        onOpenAI={() => handleOpenAI({ product: activeProduct })}
        onClose={closeSheet}
        onAddToCart={() => handleAddToCart(activeProduct)}
      />

      <CartDrawer
        open={cartOpen}
        items={cartItems}
        colorSelections={colorSelections}
        highlightItemId={lastAddedCartItemId}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onVisualizeInRoom={handleVisualizeCart}
        onCheckout={() => {
          setCartOpen(false);
        }}
      />

      <UploadFlow open={uploadOpen} onClose={() => setUploadOpen(false)} />

      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        user={user}
        onLogin={(u) => {
          setUser(u);
          setUserModalOpen(false);
        }}
        onLogout={() => setUser(null)}
      />

      {tryInRoomOpen && !isDesktopViewport && (
        <div className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-ink">
          <TryInMyRoomView
            variant="mobile"
            catalog={catalog}
            products={stagedProducts}
              placedProducts={placedProducts}
              activeProductId={activeStagedProductId}
              colorSelections={colorSelections}
              onColorSelect={selectProductColor}
              onActiveProductChange={setActiveStagedProductId}
              onRemoveProduct={handleRemoveStagedProduct}
              onRemovePlacedProduct={handleRemovePlacedProduct}
              onPlacedProductsChange={handlePlacedProductsChange}
              onSyncRoomProducts={handleSyncRoomProducts}
              registerRemovePlacedFromRoom={registerRemovePlacedFromRoom}
              onClose={closeVisualizer}
              onRoomSaved={refreshSavedRoomFlag}
              onChromeChange={handleVisualizerChromeChange}
              registerRoomPhotoPicker={registerRoomPhotoPicker}
              onAddToCart={(product) => handleAddToCart(product)}
              onElementPersonalize={handleElementPersonalize}
              onCartClick={openCart}
              cartCount={cartCount}
              cartPulseKey={cartPulseKey}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              onStageProduct={handleStageProduct}
              onOpenAI={(product) => handleOpenAI({ product: product ?? null })}
              sidebarAiOpen={visualizerSidebarAi}
              aiContext={aiContext}
              aiInitialQuery={aiInitialQuery}
              onClearAiInitialQuery={() => setAiInitialQuery('')}
              onOpenSidebarAI={() => handleOpenAI()}
              onCloseSidebarAI={handleCloseVisualizerSidebarAi}
              onVisualizerContextChange={handleVisualizerContextChange}
          />
        </div>
      )}
    </>
  );
}

export default App;
