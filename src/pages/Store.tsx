import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../hooks/useStore';
import { useStoreFilters } from '../hooks/useStoreFilters';
import { StoreHeader } from '../components/store/StoreHeader';
import { ProductGrid } from '../components/store/ProductGrid';
import { FiltersAndControls } from '../components/store/FiltersAndControls';
import { FeaturedProducts } from '../components/store/FeaturedProducts';
import { StoreFooter } from '../components/store/StoreFooter';
import ProductLightbox from '../components/ProductLightbox';
import CartDrawer from '../components/CartDrawer';
import OrderSearchLightbox from '../components/OrderSearchLightbox';
import { PRODUCT_TAGS } from '../constants/productTags';
import type { Product } from '../types/store';
import { AlertTriangle } from 'lucide-react';
import ProductComparison from '../components/ProductComparison';
import SocialShareButtons from '../components/SocialShareButtons';

const StorePage: React.FC = () => {
  const { storeName } = useParams<{ storeName: string }>();
  const { itemCount } = useCart();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isOrderSearchOpen, setIsOrderSearchOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
  const [isGridView, setIsGridView] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Estado para gerenciar os produtos selecionados para comparação
  const [comparisonList, setComparisonList] = useState<Product[]>([]);

  // Obtenção dos dados da loja
  const {
    isLoading,
    error,
    storeProfile,
    products,
    featuredProducts,
    categories,
    priceRangeLimits,
    allowCart,
    showFeatured,
    planName
  } = useStore(storeName);

  // Obtenção dos filtros e ordenação (o hook agora espera também a lista de produtos para busca avançada)
  const { filters, setFilters, sortConfig, setSortConfig, filteredProducts } = useStoreFilters(products);

  const themeColor: string = useMemo(() => storeProfile?.theme || '#0061FF', [storeProfile]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleShare = async (): Promise<void> => {
    try {
      if (navigator.share && window.isSecureContext) {
        await navigator.share({
          title: `${storeProfile?.store_name} - Catálogo Digital`,
          text: `Confira o catálogo digital de ${storeProfile?.store_name}!`,
          url: window.location.href
        });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    } catch (err: unknown) {
      console.error('Error sharing:', err);
      alert('Não foi possível compartilhar o link. Por favor, tente novamente.');
    }
  };

  const renderProductTags = useCallback(
    (product: Product): JSX.Element | null => {
      if (!product.tags || product.tags.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1">
          {product.tags.map((tag) => {
            const tagConfig = PRODUCT_TAGS.find(t => t.id === tag);
            return tagConfig ? (
              <span
                key={tag}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tagConfig.color}`}
              >
                {tagConfig.icon}
                <span className="ml-1">{tagConfig.label}</span>
              </span>
            ) : null;
          })}
        </div>
      );
    },
    []
  );

  const toggleComparison = (product: Product): void => {
    setComparisonList(prev => {
      if (prev.some(p => p.id === product.id)) {
        return prev.filter(p => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-300" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ops!</h2>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: themeColor }}
          aria-label="Carregando"
        ></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StoreHeader
        profile={storeProfile!}
        themeColor={themeColor}
        itemCount={itemCount}
        allowCart={allowCart}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrderSearch={() => setIsOrderSearchOpen(true)}
        onShare={handleShare}
      />

      {/* Componente de compartilhamento com ícones atualizados */}
      <div className="flex justify-center m-2 py-3">
        <SocialShareButtons
          url={window.location.href}
          title={`${storeProfile?.store_name} - Catálogo Digital`}
          text={`Confira o catálogo digital de ${storeProfile?.store_name}!`}
        />
      </div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
          {/* Integração do campo de busca avançada e demais filtros no FiltersAndControls */}
          <FiltersAndControls
            filters={filters}
            setFilters={setFilters}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            categories={categories}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            isGridView={isGridView}
            setIsGridView={setIsGridView}
            priceRangeLimits={priceRangeLimits}
            themeColor={themeColor}
            products={products} // Utilizado para gerar sugestões de autocomplete
          />
          
          {/* Exibição dos produtos em destaque */}
          {showFeatured && !showFilters && featuredProducts.length > 0 && (
            <FeaturedProducts
              products={featuredProducts}
              themeColor={themeColor}
              onSelectProduct={setSelectedProduct}
              onToggleComparison={toggleComparison}
              renderProductTags={renderProductTags}
            />
          )}
          
          {/* Exibição da grade de produtos */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Produtos Disponíveis ({filteredProducts.length})
            </h2>
            <ProductGrid
              products={filteredProducts}
              isGridView={isGridView}
              themeColor={themeColor}
              renderProductTags={renderProductTags}
              onSelectProduct={setSelectedProduct}
              onToggleComparison={toggleComparison}
              selectedComparisonIds={comparisonList.map(p => p.id)} // Passa os IDs dos produtos selecionados
            />

          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductLightbox
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          storeProfile={storeProfile!}
          themeColor={themeColor}
          renderProductTags={renderProductTags}
          aria-modal="true"
          role="dialog"
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        themeColor={themeColor}
        aria-label="Carrinho de Compras"
      />

      <OrderSearchLightbox
        isOpen={isOrderSearchOpen}
        onClose={() => setIsOrderSearchOpen(false)}
        themeColor={themeColor}
        aria-modal="true"
        role="dialog"
      />

      <StoreFooter
        storeProfile={storeProfile!}
        planName={planName}
        themeColor={themeColor}
      />

      {comparisonList.length >= 2 && (
        <ProductComparison
          products={comparisonList}
          onClose={() => setComparisonList([])}
        />
      )}
    </div>
  );
};

export default StorePage;