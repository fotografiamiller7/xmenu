import React from 'react';
import { Search, Filter, Text, DollarSign, Calendar, LayoutGrid, List, Plus } from 'lucide-react';
import type { FilterBarProps } from '../../types/dashboard';

export function FilterBar({
  searchTerm,
  onSearchChange,
  sortField,
  sortDirection,
  onSortChange,
  onSortDirectionChange,
  viewMode,
  onViewModeChange,
  onCreateProduct,
  showFilters,
  setShowFilters
}: FilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-2 w-full flex-nowrap">
      
      {/* Container para o campo de busca e o botão de filtro */}
      <div className="flex items-center gap-2 flex-1">
        {/* Campo de busca com ícone de lupa dentro */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar produtos..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Botão de Filtro */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="Filtrar produtos"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>
      
      {/* Botões de ordenação, visualização e novo produto */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onSortChange('name')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
            sortField === 'name'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title={`Ordenar por nome ${sortField === 'name' && sortDirection === 'asc' ? '(A→Z)' : '(Z→A)'}`}
        >
          <Text className="w-5 h-5" />
          <span className="hidden sm:inline">Nome</span>
        </button>

        <button
          onClick={() => onSortChange('price')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
            sortField === 'price'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title={`Ordenar por preço ${sortField === 'price' && sortDirection === 'asc' ? '(menor→maior)' : '(maior→menor)'}`}
        >
          <DollarSign className="w-5 h-5" />
          <span className="hidden sm:inline">Preço</span>
        </button>

        <button
          onClick={() => onSortChange('created_at')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
            sortField === 'created_at'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title={`Ordenar por data ${sortField === 'created_at' && sortDirection === 'desc' ? '(mais recente)' : '(mais antigo)'}`}
        >
          <Calendar className="w-5 h-5" />
          <span className="hidden sm:inline">Data</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            title="Visualização em grade"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="hidden sm:inline">Grade</span>
          </button>
          
          <button
            onClick={() => onViewModeChange('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            title="Visualização em lista"
          >
            <List className="w-5 h-5" />
            <span className="hidden sm:inline">Lista</span>
          </button>
        </div>

        <button
          onClick={onCreateProduct}
          className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-w-[40px] min-h-[40px]"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Novo Produto</span>
        </button>
      </div>
    </div>
  );
}

export default FilterBar;
