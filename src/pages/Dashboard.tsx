import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  UserCog,
  LogOut,
  Store,
  Settings,
  ShoppingBag,
  Palette,
  CreditCard
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useProductActions } from '../hooks/useProductActions';
import { useFilters } from '../hooks/useFilters';
import { FilterBar } from '../components/dashboard/FilterBar';
import { FiltersAndControls } from '../components/store/FiltersAndControls';
import { ProductList } from '../components/dashboard/ProductList';
import ProductModal from '../components/ProductModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ProfileModal from '../components/ProfileModal';
import CustomizationModal from '../components/CustomizationModal';
import PlanSelectionModal from '../components/PlanSelectionModal';
import { PRODUCT_TAGS } from '../constants/productTags';
import type { Product } from '../types/products';
import type { ModalType } from '../types/dashboard';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  // Core dashboard state and actions
  const {
    profile,
    products,
    isLoading,
    error,
    handleLogout,
    handleViewStore,
    handleViewOrders,
    handleProfileUpdate,
    setProducts
  } = useDashboard();

  // Product actions
  const {
    isSubmitting,
    error: productError,
    handleCreateProduct,
    handleEditProduct,
    handleDeleteProduct
  } = useProductActions(setProducts);

  // Estados de filtros e ordenação (usando o hook useFilters)
  const {
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    selectedCategories,
    setSelectedCategories,
    selectedTags,
    setSelectedTags,
    priceRange,
    setPriceRange,
    categories,
    priceRangeLimits,
    filteredProducts
  } = useFilters(products);

  // Cria um objeto unificado para os filtros
  const filters = useMemo(() => ({
    searchTerm,
    categories: selectedCategories,
    tags: selectedTags,
    priceRange
  }), [searchTerm, selectedCategories, selectedTags, priceRange]);

  // Função para atualizar os filtros unificados
  const setFilters = (updater: any) => {
    if (typeof updater === 'function') {
      updater = updater(filters);
    }
    if (updater.searchTerm !== undefined) {
      setSearchTerm(updater.searchTerm);
    }
    if (updater.categories !== undefined) {
      setSelectedCategories(updater.categories);
    }
    if (updater.tags !== undefined) {
      setSelectedTags(updater.tags);
    }
    if (updater.priceRange !== undefined) {
      setPriceRange(updater.priceRange);
    }
  };

  // Modal states
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [showPlanSelectionModal, setShowPlanSelectionModal] = useState(false);
  const [planFeatures, setPlanFeatures] = useState<any>(null);

  // Estado para armazenar os IDs dos produtos selecionados
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  // Estado para controlar a exibição da aba de filtros
  const [showFilters, setShowFilters] = useState(false);

  // Função para alternar a seleção individual de um produto
  const handleToggleSelect = (product: Product) => {
    setSelectedProductIds(prev => {
      if (prev.includes(product.id)) {
        return prev.filter(id => id !== product.id);
      } else {
        return [...prev, product.id];
      }
    });
  };

  // Selecionar todos os produtos filtrados
  const handleSelectAll = () => {
    const allIds = filteredProducts.map((p: Product) => p.id);
    setSelectedProductIds(allIds);
  };

  // Deselecionar todos os produtos
  const handleDeselectAll = () => {
    setSelectedProductIds([]);
  };

  // Abrir modal para exclusão em massa
  const handleDeleteSelected = () => {
    setModalType('deleteMultiple');
  };

  // Exclusão em massa
  const handleConfirmMultipleDelete = async () => {
    try {
      for (const id of selectedProductIds) {
        await handleDeleteProduct(id);
      }
      setSelectedProductIds([]);
    } catch (error) {
      console.error("Erro ao excluir produtos selecionados:", error);
    } finally {
      setModalType(null);
    }
  };

  // Exclusão e edição de um único produto
  const handleSubmitEdit = async (formData: any) => {
    if (!selectedProduct) return;
    try {
      await handleEditProduct(formData, selectedProduct.id, selectedProduct.image_url);
    } catch (error) {
      console.error("Error submitting edit:", error);
      throw error;
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;
    try {
      await handleDeleteProduct(selectedProduct.id);
      setModalType(null);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchPlanFeatures = async () => {
      try {
        if (!profile?.plano) return;
        const activeSubscription = profile.subscriptions?.find(
          (sub: any) => sub.status === 'active'
        );
        const planId = activeSubscription?.plan_id || profile.plano;
        const { data, error } = await supabase
          .from('plan_features')
          .select('*')
          .eq('plan_id', planId)
          .single();
        if (!error && data) {
          setPlanFeatures(data);
        }
      } catch (err) {
        console.error('Error fetching plan features:', err);
      }
    };
    if (profile) {
      fetchPlanFeatures();
    }
  }, [profile]);

  // Helper para renderizar as tags dos produtos
  const renderProductTags = (product: Product) => {
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
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button
              onClick={handleLogout}
              className="mt-4 px-4 py-2 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Log out and try again
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeSub = profile?.subscriptions?.find((sub: any) => sub.status === 'active');
  const planName = profile?.planosxmenu?.name || 'Básico';

  // Verifica o período do plano
  let periodo;
  if (activeSub.period_type === "monthly") {
    periodo = "Mensal";
  } else {
    periodo = "Anual";
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {profile && planFeatures && (
          <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="text-blue-700">
                <strong>Plano atual:</strong> {planName} {periodo}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <UserCog className="w-7 h-7 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Editar Perfil</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  <LogOut className="w-7 h-7 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 pb-6 border-b border-gray-200">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bem-vindo {profile?.store_name}!
            </h1>
            <p className="text-gray-600 text-lg">
              Olá {profile?.name?.split(' ')[0]}, aqui você gerencia seu catálogo, pedidos e configurações do sistema.
            </p>
            <div className="grid grid-cols-5 gap-2 mt-5 w-full">
              <button
                onClick={handleViewStore}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[30px]"
              >
                <Store className="w-7 h-7 sm:w-5 sm:h-5" />
                <span className="text-sm hidden sm:inline">Ver Loja</span>
              </button>
              {profile?.email === 'admin@admin.com' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[30px]"
                >
                  <Settings className="w-7 h-7 sm:w-5 sm:h-5" />
                  <span className="text-sm hidden sm:inline">Administração</span>
                </button>
              )}
              <button
                onClick={handleViewOrders}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[30px]"
              >
                <ShoppingBag className="w-7 h-7 sm:w-5 sm:h-5" />
                <span className="text-sm hidden sm:inline">Pedidos</span>
              </button>
              <button
                onClick={() => setIsCustomizationModalOpen(true)}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[30px]"
              >
                <Palette className="w-7 h-7 sm:w-5 sm:h-5" />
                <span className="text-sm hidden sm:inline">Personalização</span>
              </button>
              <button
                onClick={() => setShowPlanSelectionModal(true)}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[80px]"
              >
                <CreditCard className="w-7 h-7 sm:w-5 sm:h-5" />
                <span className="text-sm hidden sm:inline">Meu Plano</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-6 ">
          {/* Renderização do FilterBar com o botão de filtro posicionado à direita */}
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={setSortField}
            onSortDirectionChange={() =>
              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            }
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onCreateProduct={() => setModalType('create')}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />

          {/* Exibe a aba de filtros (FiltersAndControls) quando showFilters for true */}
          {showFilters && (
            <div className="mt-4 hidden sm:inline">
              <FiltersAndControls
                filters={filters}
                setFilters={setFilters}
                sortConfig={{ field: sortField, direction: sortDirection }}
                setSortConfig={(newConfig) => {
                  setSortField(newConfig.field);
                  setSortDirection(newConfig.direction);
                }}
                categories={categories}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                isGridView={viewMode === 'grid'}
                setIsGridView={(grid: boolean) => setViewMode(grid ? 'grid' : 'list')}
                priceRangeLimits={priceRangeLimits}
                themeColor={profile?.theme || '#0061FF'}
                products={products}
                hideAllControls={true}
              />
            </div>
          )}
          
          {/* Seção de produtos publicados e botões */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white ">
              Produtos publicados: ({filteredProducts.length}) de ({planFeatures?.max_products || 30})
            </h2>
            <div className="flex items-center gap-2">
              {selectedProductIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  Excluir Selecionados
                </button>
              )}
              {selectedProductIds.length === filteredProducts.length ? (
                <button
                  onClick={handleDeselectAll}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Deselecionar Todos
                </button>
              ) : (
                <button
                  onClick={handleSelectAll}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Selecionar Todos
                </button>
              )}
            </div>
          </div>

          <ProductList
            products={filteredProducts}
            viewMode={viewMode}
            onEdit={(product) => {
              setSelectedProduct(product);
              setModalType('edit');
            }}
            onDelete={(product) => {
              setSelectedProduct(product);
              setModalType('delete');
            }}
            renderProductTags={renderProductTags}
            selectedProductIds={selectedProductIds}
            onToggleSelect={handleToggleSelect}
          />
        </div>

        <ProductModal
          isOpen={modalType === 'create' || modalType === 'edit'}
          onClose={() => {
            setModalType(null);
            setSelectedProduct(null);
          }}
          onSubmit={modalType === 'create' ? handleCreateProduct : handleSubmitEdit}
          initialData={selectedProduct || undefined}
          type={modalType === 'create' ? 'create' : 'edit'}
        />

        <DeleteConfirmationModal
          isOpen={modalType === 'delete' || modalType === 'deleteMultiple'}
          onClose={() => {
            setModalType(null);
            setSelectedProduct(null);
          }}
          onConfirm={modalType === 'delete' ? handleConfirmDelete : handleConfirmMultipleDelete}
          productName={
            modalType === 'delete'
              ? selectedProduct?.name || ''
              : `${selectedProductIds.length} produtos selecionados`
          }
        />

        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={profile}
          onUpdate={handleProfileUpdate}
        />

        <CustomizationModal
          isOpen={isCustomizationModalOpen}
          onClose={() => setIsCustomizationModalOpen(false)}
          profile={profile}
          onUpdate={handleProfileUpdate}
        />

        <PlanSelectionModal
          isOpen={showPlanSelectionModal}
          onClose={() => setShowPlanSelectionModal(false)}
          themeColor={profile?.theme || '#0061FF'}
        />
      </div>
    </div>
  );
}
