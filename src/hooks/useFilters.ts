import { useState, useMemo, useEffect } from 'react';
import type { Product, ProductTag } from '../types/products';
import type { ViewMode, SortField, SortDirection } from '../types/dashboard';

export function useFilters(products: Product[]) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<ProductTag[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);

  // Update price range when products change
  useEffect(() => {
    if (products.length > 0) {
      const prices = products.map(p => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      setPriceRange([minPrice, maxPrice]);
    }
  }, [products]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    products.forEach(product => {
      if (product.category) {
        uniqueCategories.add(product.category);
      }
    });
    return Array.from(uniqueCategories);
  }, [products]);

  const priceRangeLimits = useMemo(() => {
    if (products.length === 0) return [0, 0];
    const prices = products.map(p => p.price);
    return [Math.min(...prices), Math.max(...prices)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => 
        product.category && selectedCategories.includes(product.category)
      );
    }
    
    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(product => 
        product.tags?.some(tag => selectedTags.includes(tag))
      );
    }
    
    // Apply price range filter only if it's different from the limits
    if (priceRange[0] !== priceRangeLimits[0] || priceRange[1] !== priceRangeLimits[1]) {
      filtered = filtered.filter(product => 
        product.price >= priceRange[0] && product.price <= priceRange[1]
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortField === 'price') {
        return sortDirection === 'asc'
          ? a.price - b.price
          : b.price - a.price;
      }
      // created_at
      return sortDirection === 'desc'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return filtered;
  }, [products, searchTerm, selectedCategories, selectedTags, priceRange, priceRangeLimits, sortField, sortDirection]);

  return {
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
  };
}