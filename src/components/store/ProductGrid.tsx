import React from 'react';
import { Package, Scale } from 'lucide-react';
import type { Product } from '../../types/store';
import { formatPrice } from '../../utils/format';

interface ProductGridProps {
  products: Product[];
  isGridView: boolean;
  themeColor: string;
  renderProductTags: (product: Product) => React.ReactNode;
  onSelectProduct: (product: Product) => void;
  onToggleComparison: (product: Product) => void;
  selectedComparisonIds: string[]; // Para saber quais produtos já foram selecionados
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isGridView,
  themeColor,
  renderProductTags,
  onSelectProduct,
  onToggleComparison,
  selectedComparisonIds
}) => {
  const renderProductImage = (product: Product) => {
    if (product.image_url) {
      return (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center">
        <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" />
      </div>
    );
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Nenhum produto encontrado
        </h3>
      </div>
    );
  }

  // Retorna o botão de comparação (balança) posicionado de forma absoluta
  const renderComparisonButton = (product: Product) => {
    const isSelected = selectedComparisonIds.includes(product.id);

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComparison(product);
        }}
        aria-label={isSelected ? 'Produto selecionado para comparação' : 'Comparar produto'}
        className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
          isSelected ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
        } text-white shadow`}
      >
        <Scale size={20} />
      </button>
    );
  };

  return isGridView ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onSelectProduct(product)}
        >
          {/* Torna este contêiner position: relative para poder posicionar o botão */}
          <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
            {renderProductImage(product)}
            {renderComparisonButton(product)}
          </div>
          
          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {product.name}
              </h3>
              <span className="text-lg font-bold" style={{ color: themeColor }}>
                {formatPrice(product.price)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Estoque:
              </span>
              <span
                className={`text-sm font-medium ${
                  product.quantity === 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {product.quantity} unidades
              </span>
            </div>

            {renderProductTags(product)}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow flex cursor-pointer"
          onClick={() => onSelectProduct(product)}
        >
          {/* Também torna este contêiner position: relative */}
          <div className="relative w-32 sm:w-48 bg-gray-100 dark:bg-gray-900">
            {renderProductImage(product)}
            {renderComparisonButton(product)}
          </div>
          
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {product.name}
                </h3>
                <span className="text-lg font-bold" style={{ color: themeColor }}>
                  {formatPrice(product.price)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Estoque:
                </span>
                <span
                  className={`text-sm font-medium ${
                    product.quantity === 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {product.quantity} unidades
                </span>
              </div>

              {renderProductTags(product)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
