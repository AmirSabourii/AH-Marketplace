import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hero from './components/Hero';
import ProductMasonryGrid from './components/ProductMasonryGrid';
import ProductSheet from './components/ProductSheet';
import AppHeader from './components/AppHeader';
import VisualizerHeader from './components/VisualizerHeader';
import FloatingAIAssistant from './components/FloatingAIAssistant';
import TryInMyRoomView from './components/TryInMyRoomView';
import MobileNavBar from './components/MobileNavBar';
import UploadFlow from './components/UploadFlow';
import { cn } from './lib/cn';
import { type CategoryId } from './data/categories';
import { findProductInScene, type Product } from './data/scenes';
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
  getCartCount,
  removeCartItem,
  updateCartItemQuantity,
  type CartItem,
} from './lib/cart';

function App() {
  const firstCategory = 'all';
  const deepLink = parseDeepLink();

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [colorSelections, setColorSelections] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(
    deepLink.categoryId ?? firstCategory
  );
  const [tryInRoomOpen, setTryInRoomOpen] = useState(false);
  const [stagedProducts, setStagedProducts] = useState<Product[]>([]);
  const [activeStagedProductId, setActiveStagedProductId] = useState<string | null>(null);
  const [hasSavedRoom, setHasSavedRoom] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInitialQuery, setAiInitialQuery] = useState('');
  const [aiContextProduct, setAiContextProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
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
  });
  const visualizerChromeHandlers = useRef({
    onShare: defaultVisualizerChrome.onShare,
    onToggleCompare: defaultVisualizerChrome.onToggleCompare,
  });
  const roomPhotoPickerRef = useRef<(() => void) | null>(null);

  const registerRoomPhotoPicker = useCallback((picker: (() => void) | null) => {
    roomPhotoPickerRef.current = picker;
  }, []);

  const handleVisualizerChromeChange = useCallback((chrome: VisualizerChromeState) => {
    visualizerChromeHandlers.current = {
      onShare: chrome.onShare,
      onToggleCompare: chrome.onToggleCompare,
    };
    setVisualizerChromeMeta((prev) => {
      if (
        prev.canShare === chrome.canShare &&
        prev.shareFeedback === chrome.shareFeedback &&
        prev.showCompare === chrome.showCompare &&
        prev.isComparing === chrome.isComparing &&
        prev.showChangePhoto === chrome.showChangePhoto
      ) {
        return prev;
      }
      return {
        canShare: chrome.canShare,
        shareFeedback: chrome.shareFeedback,
        showCompare: chrome.showCompare,
        isComparing: chrome.isComparing,
        showChangePhoto: chrome.showChangePhoto,
      };
    });
  }, []);

  const visualizerChrome: VisualizerChromeState = {
    ...visualizerChromeMeta,
    onShare: () => visualizerChromeHandlers.current.onShare(),
    onToggleCompare: () => visualizerChromeHandlers.current.onToggleCompare(),
    onChangeRoomPhoto: () => roomPhotoPickerRef.current?.(),
  };

  const refreshSavedRoomFlag = useCallback(() => {
    void checkHasSavedRoom().then(setHasSavedRoom);
  }, []);

  useEffect(() => {
    refreshSavedRoomFlag();
  }, [refreshSavedRoomFlag]);

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

  const closeVisualizer = useCallback(() => {
    roomPhotoPickerRef.current = null;
    setTryInRoomOpen(false);
    setStagedProducts([]);
    setActiveStagedProductId(null);
    setVisualizerChromeMeta({
      canShare: false,
      shareFeedback: 'idle',
      showCompare: false,
      isComparing: false,
      showChangePhoto: false,
    });
  }, []);

  const openProduct = useCallback(
    (product: Product) => {
      if (tryInRoomOpen) {
        setStagedProducts((prev) => {
          if (prev.some((p) => p.id === product.id)) return prev;
          return [...prev, product];
        });
        setActiveStagedProductId(product.id);
        return;
      }
      setActiveProduct(product);
    },
    [tryInRoomOpen]
  );

  const selectProductColor = useCallback((productId: string, variantId: string) => {
    setColorSelections((prev) => ({ ...prev, [productId]: variantId }));
  }, []);

  const handleTryInRoom = useCallback(
    (product: Product) => {
      openVisualizer(product);
    },
    [openVisualizer]
  );

  const handleRemoveStagedProduct = useCallback((productId: string) => {
    setStagedProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      setActiveStagedProductId((activeId) => {
        if (next.length === 0) return null;
        return activeId === productId ? next[0].id : activeId;
      });
      return next;
    });
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
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;

    const { categoryId, productId, openRoom } = parseDeepLink();
    if (!categoryId && !openRoom) return;

    window.setTimeout(() => {
      if (productId) {
        const found = findProductInScene(productId);
        if (found) {
          setSelectedCategory(found.scene.categoryId);
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
  }, [scrollToGrid]);

  const handleAddToCart = useCallback(
    (product?: Product | null) => {
      const target =
        product ??
        activeProduct ??
        stagedProducts.find((p) => p.id === activeStagedProductId) ??
        stagedProducts[0];
      if (!target) return;

      const variantId = colorSelections[target.id];
      setCartItems((items) => addToCartItems(items, target, variantId));
      if (!tryInRoomOpen) {
        setActiveProduct(null);
      }
    },
    [activeProduct, stagedProducts, activeStagedProductId, colorSelections, tryInRoomOpen]
  );

  const handleUpdateCartQuantity = useCallback((itemId: string, quantity: number) => {
    setCartItems((items) => updateCartItemQuantity(items, itemId, quantity));
  }, []);

  const handleRemoveCartItem = useCallback((itemId: string) => {
    setCartItems((items) => removeCartItem(items, itemId));
  }, []);

  const cartCount = getCartCount(cartItems);
  const stagedCount = stagedProducts.length;

  const handleOpenAI = (product?: Product | null, query?: string) => {
    setAiContextProduct(product || null);
    if (query) setAiInitialQuery(query);
    setAiOpen(true);
  };

  const handleBackToShop = useCallback(() => {
    closeVisualizer();
  }, [closeVisualizer]);

  return (
    <>
      <AppHeader
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
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
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <div className="flex min-h-screen w-full overflow-hidden bg-cream">
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
              onPromptSubmit={(query) => handleOpenAI(null, query)}
              onUpload={() => setUploadOpen(true)}
              chatActive={heroChatActive}
            />
          </div>

          <ProductMasonryGrid
            selectedCategory={selectedCategory}
            onProductClick={openProduct}
            onTryInRoom={handleTryInRoom}
            onCategorySelect={handleCategorySelect}
            onOpenAI={() => handleOpenAI(null)}
            onOpenVisualizer={() => openVisualizer()}
            isSidebar={tryInRoomOpen}
            hasSavedRoom={hasSavedRoom}
          />
        </motion.main>

        <AnimatePresence>
          {tryInRoomOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
              className="relative hidden h-screen min-h-0 flex-1 overflow-hidden bg-ink lg:block"
            >
              <VisualizerHeader
                cartCount={cartCount}
                stagedCount={stagedCount}
                onBackToShop={handleBackToShop}
                onCartClick={() => setCartOpen(true)}
                chrome={visualizerChrome}
              />
              <TryInMyRoomView
                products={stagedProducts}
                activeProductId={activeStagedProductId}
                colorSelections={colorSelections}
                onColorSelect={selectProductColor}
                onActiveProductChange={setActiveStagedProductId}
                onRemoveProduct={handleRemoveStagedProduct}
                onClose={closeVisualizer}
                onRoomSaved={refreshSavedRoomFlag}
                onChromeChange={handleVisualizerChromeChange}
                registerRoomPhotoPicker={registerRoomPhotoPicker}
                onAddToCart={(product) => handleAddToCart(product)}
                onElementPersonalize={handleElementPersonalize}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!tryInRoomOpen && (
        <FloatingAIAssistant
          visible={!isHeroVisible || aiOpen}
          isExpanded={aiOpen}
          onExpandedChange={setAiOpen}
          contextProduct={aiContextProduct}
          initialQuery={aiInitialQuery}
          onClearInitialQuery={() => setAiInitialQuery('')}
          onChatActiveChange={setHeroChatActive}
        />
      )}

      {!tryInRoomOpen && (
        <MobileNavBar
          cartCount={cartCount}
          tryInRoomActive={false}
          hasSavedRoom={hasSavedRoom}
          stagedCount={stagedCount}
          onShopClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          onMyRoomClick={() => openVisualizer()}
          onCartClick={() => setCartOpen(true)}
        />
      )}

      <ProductSheet
        product={activeProduct}
        colorSelections={colorSelections}
        onColorSelect={selectProductColor}
        onTryInRoom={handleTryInRoom}
        onOpenAI={() => handleOpenAI(activeProduct)}
        onClose={closeSheet}
        onAddToCart={() => handleAddToCart(activeProduct)}
      />

      <CartDrawer
        open={cartOpen}
        items={cartItems}
        colorSelections={colorSelections}
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

      <AnimatePresence>
        {tryInRoomOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative fixed inset-0 z-50 h-[100dvh] w-full bg-ink lg:hidden"
          >
            <VisualizerHeader
              cartCount={cartCount}
              stagedCount={stagedCount}
              onBackToShop={handleBackToShop}
              onCartClick={() => setCartOpen(true)}
              chrome={visualizerChrome}
            />
            <TryInMyRoomView
              products={stagedProducts}
              activeProductId={activeStagedProductId}
              colorSelections={colorSelections}
              onColorSelect={selectProductColor}
              onActiveProductChange={setActiveStagedProductId}
              onRemoveProduct={handleRemoveStagedProduct}
              onClose={closeVisualizer}
              onRoomSaved={refreshSavedRoomFlag}
              onChromeChange={handleVisualizerChromeChange}
              registerRoomPhotoPicker={registerRoomPhotoPicker}
              onAddToCart={(product) => handleAddToCart(product)}
              onElementPersonalize={handleElementPersonalize}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
