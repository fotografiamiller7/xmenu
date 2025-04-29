import { useState, useMemo, useEffect } from 'react';
import type { Product, FilterState, SortConfig } from '../types/store';

export const useStoreFilters = (products: Product[]) => {
  // Initialize filters with null price range
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: [0, 0], // Will be updated when products change
    searchTerm: ''
  });

  // Update price range when products change
  useEffect(() => {
    if (products.length > 0) {
      const prices = products.map(p => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      // Only update if the current range is [0,0] or outside the new limits
      if (filters.priceRange[0] === 0 && filters.priceRange[1] === 0 ||
          filters.priceRange[0] < minPrice || filters.priceRange[1] > maxPrice) {
        setFilters(prev => ({
          ...prev,
          priceRange: [minPrice, maxPrice]
        }));
      }
    }
  }, [products]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'created_at',
    direction: 'desc'
  });

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Apply search filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(product => 
        product.category && filters.categories.includes(product.category)
      );
    }
    
    // Apply tag filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(product => 
        product.tags?.some(tag => filters.tags.includes(tag))
      );
    }
    
    // Apply price range filter
    filtered = filtered.filter(product => 
      product.price >= filters.priceRange[0] && 
      product.price <= filters.priceRange[1]
    );
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.field) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'price':
          return multiplier * (a.price - b.price);
        case 'created_at':
          return multiplier * (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, filters, sortConfig]);

  return {
    filters,
    setFilters,
    sortConfig,
    setSortConfig,
    filteredProducts
  };
};