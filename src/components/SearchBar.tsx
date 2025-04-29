// components/SearchBar.tsx
import React, { useState, useEffect, useMemo } from 'react';
import type { Product } from '../types/store';

interface SearchBarProps {
  products: Product[];
  onResults: (results: Product[]) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ products, onResults }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  // Função de debounce para melhorar performance
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim() === '') {
        setSuggestions([]);
        onResults(products);
      } else {
        const filtered = products.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSuggestions(filtered);
        onResults(filtered);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, products, onResults]);

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Buscar produtos..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        aria-label="Buscar produtos"
      />
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map(product => (
            <li key={product.id}>
              {product.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
