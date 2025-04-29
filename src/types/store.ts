// Store Types
export interface StoreProfile {
  id: string;
  store_name: string;
  logo_url?: string;
  background_url?: string;
  endereco?: string;
  telefone?: string;
  instagram?: string;
  theme: string;
  plano?: string;
}

export interface ProductTag {
  id: string;
  label: string;
  color: string;
  icon: React.ReactNode;
}

export interface FilterState {
  categories: string[];
  tags: string[];
  priceRange: [number, number];
  searchTerm: string;
}

export interface SortConfig {
  field: 'name' | 'price' | 'created_at';
  direction: 'asc' | 'desc';
}

export interface StoreState {
  isLoading: boolean;
  error: string | null;
  storeProfile: StoreProfile | null;
  products: Product[];
  featuredProducts: Product[];
  categories: string[];
  priceRangeLimits: [number, number];
  allowCart: boolean;
  showFeatured: boolean;
  planName: string;
}

// components/ProductComparison.tsx
import React from 'react';
import type { Product } from '../types/store';

interface ProductComparisonProps {
  products: Product[];
  onClose: () => void;
}

const ProductComparison: React.FC<ProductComparisonProps> = ({ products, onClose }) => {
  if (products.length < 2) {
    return <p>Selecione pelo menos 2 produtos para comparar.</p>;
  }

  const allSpecs = Array.from(
    new Set(products.flatMap(product => Object.keys(product.specifications)))
  );

  return (
    <div className="comparison-modal">
      <button onClick={onClose}>Fechar</button>
      <table>
        <thead>
          <tr>
            <th>Especificação</th>
            {products.map(product => (
              <th key={product.id}>{product.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allSpecs.map(spec => (
            <tr key={spec}>
              <td>{spec}</td>
              {products.map(product => (
                <td key={product.id}>
                  {product.specifications[spec] || 'N/A'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductComparison;