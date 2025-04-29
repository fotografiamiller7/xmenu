import React, { useState, useEffect } from 'react';
import { Search, Filter, Text, DollarSign, Calendar, Tags } from 'lucide-react';
import type { FilterState, SortConfig } from '../../types/store';
import type { Product } from '../../types/store';

interface FiltersAndControlsProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  sortConfig: SortConfig;
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>;
  categories: string[];
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  isGridView: boolean;
  setIsGridView: (grid: boolean) => void;
  priceRangeLimits: [number, number];
  themeColor: string;
  products: Product[];
  /**
   * Se true, oculta todos os controles superiores (campo de busca, botão de filtro, botões de ordenação e visualização).
   */
  hideAllControls?: boolean;
}

export const FiltersAndControls: React.FC<FiltersAndControlsProps> = ({
  filters,
  setFilters,
  sortConfig,
  setSortConfig,
  categories,
  showFilters,
  setShowFilters,
  isGridView,
  setIsGridView,
  priceRangeLimits,
  themeColor,
  products,
  hideAllControls = false
}) => {
  // Estado local para busca e sugestões
  const [searchTerm, setSearchTerm] = useState<string>(filters.searchTerm || '');
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  // Efeito para autocomplete
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim() === '') {
        setSuggestions([]);
        setFilters(prev => ({ ...prev, searchTerm: '' }));
      } else {
        const termLower = searchTerm.toLowerCase();
        const matched = products.filter(product =>
          product.name.toLowerCase().includes(termLower) ||
          (product.description && product.description.toLowerCase().includes(termLower))
        );
        setSuggestions(matched.slice(0, 5));
        setFilters(prev => ({ ...prev, searchTerm }));
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, products, setFilters]);

  const handleSelectSuggestion = (product: Product) => {
    setSearchTerm(product.name);
    setSuggestions([]);
    setFilters(prev => ({ ...prev, searchTerm: product.name }));
  };

  const handleSort = (field: 'name' | 'price' | 'created_at') => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleCategory = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  return (
    <div>
      {/* Se hideAllControls for true, não renderiza a barra de busca e ordenação */}
      {!hideAllControls && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produtos por nome, descrição ou categoria..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
              />
              {suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 bg-white dark:bg-gray-700 shadow-md mt-1 rounded-md z-10">
                  {suggestions.map(product => (
                    <li
                      key={product.id}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                      onClick={() => handleSelectSuggestion(product)}
                    >
                      {product.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                showFilters
                  ? 'border-transparent text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              style={showFilters ? { backgroundColor: themeColor } : {}}
              title="Filtrar produtos"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>

            {/* Botões de ordenação */}
            <button
              onClick={() => handleSort('name')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                sortConfig.field === 'name'
                  ? 'border-transparent text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              style={sortConfig.field === 'name' ? { backgroundColor: themeColor } : {}}
              title={`Ordenar por nome ${sortConfig.field === 'name' && sortConfig.direction === 'asc' ? '(A→Z)' : '(Z→A)'}`}
            >
              <Text className="w-4 h-4" />
              <span className="hidden sm:inline">Nome</span>
            </button>

            <button
              onClick={() => handleSort('price')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                sortConfig.field === 'price'
                  ? 'border-transparent text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              style={sortConfig.field === 'price' ? { backgroundColor: themeColor } : {}}
              title={`Ordenar por preço ${sortConfig.field === 'price' && sortConfig.direction === 'asc' ? '(menor→maior)' : '(maior→menor)'}`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Preço</span>
            </button>

            <button
              onClick={() => handleSort('created_at')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                sortConfig.field === 'created_at'
                  ? 'border-transparent text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              style={sortConfig.field === 'created_at' ? { backgroundColor: themeColor } : {}}
              title={`Ordenar por data ${sortConfig.field === 'created_at' && sortConfig.direction === 'desc' ? '(mais recente)' : '(mais antigo)'}`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Data</span>
            </button>

            {/* Botões de modo de exibição (Grade/Lista) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGridView(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                  isGridView
                    ? 'border-transparent text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                style={isGridView ? { backgroundColor: themeColor } : {}}
                title="Visualização em grade"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden sm:inline">Grade</span>
              </button>
              
              <button
                onClick={() => setIsGridView(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                  !isGridView
                    ? 'border-transparent text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                style={!isGridView ? { backgroundColor: themeColor } : {}}
                title="Visualização em lista"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Tags className="w-4 h-4" />
                Categorias
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filters.categories.includes(category)
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    style={filters.categories.includes(category) ? { backgroundColor: themeColor } : {}}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {['novidade', 'em-falta', 'premium', 'exclusivo', 'mais-pedido'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filters.tags.includes(tag)
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    style={filters.tags.includes(tag) ? { backgroundColor: themeColor } : {}}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Faixa de Preço
              </h3>
              <div className="px-2">
                <div 
                  className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full"
                  role="slider"
                  aria-valuemin={priceRangeLimits[0]}
                  aria-valuemax={priceRangeLimits[1]}
                  aria-valuenow={filters.priceRange[1]}
                >
                  <div
                    className="absolute h-full rounded-full"
                    style={{
                      left: `${((filters.priceRange[0] - priceRangeLimits[0]) / (priceRangeLimits[1] - priceRangeLimits[0])) * 100}%`,
                      right: `${100 - ((filters.priceRange[1] - priceRangeLimits[0]) / (priceRangeLimits[1] - priceRangeLimits[0])) * 100}%`,
                      backgroundColor: themeColor
                    }}
                  />
                  
                  {/* "Knob" da faixa inicial */}
                  <div
                    className="absolute w-6 h-6 -mt-2.5 -ml-3 bg-white border-2 rounded-full cursor-pointer shadow-md hover:scale-110 transition-transform"
                    style={{ 
                      left: `${((filters.priceRange[0] - priceRangeLimits[0]) / (priceRangeLimits[1] - priceRangeLimits[0])) * 100}%`,
                      borderColor: themeColor
                    }}
                    onMouseDown={(e) => {
                      const slider = e.currentTarget.parentElement;
                      const startX = e.pageX;
                      const startValue = filters.priceRange[0];
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        if (!slider) return;
                        const delta = e.pageX - startX;
                        const range = priceRangeLimits[1] - priceRangeLimits[0];
                        const newValue = Math.max(
                          priceRangeLimits[0],
                          Math.min(
                            filters.priceRange[1],
                            startValue + (delta / slider.offsetWidth) * range
                          )
                        );
                        setFilters(prev => ({
                          ...prev,
                          priceRange: [newValue, prev.priceRange[1]]
                        }));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                  
                  {/* "Knob" da faixa final */}
                  <div
                    className="absolute w-6 h-6 -mt-2.5 -ml-3 bg-white border-2 rounded-full cursor-pointer shadow-md hover:scale-110 transition-transform"
                    style={{ 
                      left: `${((filters.priceRange[1] - priceRangeLimits[0]) / (priceRangeLimits[1] - priceRangeLimits[0])) * 100}%`,
                      borderColor: themeColor
                    }}
                    onMouseDown={(e) => {
                      const slider = e.currentTarget.parentElement;
                      const startX = e.pageX;
                      const startValue = filters.priceRange[1];
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        if (!slider) return;
                        const delta = e.pageX - startX;
                        const range = priceRangeLimits[1] - priceRangeLimits[0];
                        const newValue = Math.max(
                          filters.priceRange[0],
                          Math.min(
                            priceRangeLimits[1],
                            startValue + (delta / slider.offsetWidth) * range
                          )
                        );
                        setFilters(prev => ({
                          ...prev,
                          priceRange: [prev.priceRange[0], newValue]
                        }));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                </div>
                
                <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(filters.priceRange[0])}
                  </span>
                  <span>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(filters.priceRange[1])}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersAndControls;
