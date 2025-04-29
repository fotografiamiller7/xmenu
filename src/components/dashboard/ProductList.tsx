import React, { memo } from 'react';
import { Package, Tag, Pencil, Trash2 } from 'lucide-react';
import type { ProductListProps } from '../../types/dashboard';
import type { Product } from '../../types/products';

interface ExtendedProductListProps extends ProductListProps {
  selectedProductIds: string[];
  onToggleSelect: (product: Product) => void;
}

export const ProductList = memo(function ProductList({
  products,
  viewMode,
  onEdit,
  onDelete,
  renderProductTags,
  selectedProductIds,
  onToggleSelect,
}: ExtendedProductListProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhum produto encontrado
        </h3>
      </div>
    );
  }

  return viewMode === 'grid' ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      {products.map((product) => (
        <div
          key={product.id}
        onClick={() => onToggleSelect(product)}
        className={`bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
          selectedProductIds.includes(product.id)
            ? 'border-4 border-blue-500'
            : 'border border-gray-200'
        }`}
        >
          <div className="aspect-square bg-gray-100">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
              <span className="text-lg font-bold text-blue-600">
                {formatPrice(product.price)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600">Estoque:</span>
              <span className={`text-sm font-medium ${
                product.quantity === 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {product.quantity} unidades
              </span>
            </div>

            {renderProductTags(product)}

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(product);
                }}
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </button>
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(product);
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-4 mt-6">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => onToggleSelect(product)}
          className={`bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex items-center cursor-pointer ${
            selectedProductIds.includes(product.id)
              ? 'border-4 border-blue-500'
              : 'border border-gray-200'
          }`}
        >
          <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">Estoque:</span>
                <span className={`text-sm font-medium ${
                  product.quantity === 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {product.quantity} unidades
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-lg font-bold text-blue-600">
                {formatPrice(product.price)}
              </span>

              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 px-3 py-1.5 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(product);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  className="flex items-center gap-1 px-3 py-1.5 text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(product);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Excluir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});