import { Product, ProductFormData, ProductTag } from './products';
import { Profile } from './profile';

export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'price' | 'created_at';
export type SortDirection = 'asc' | 'desc';
export type ModalType = 'create' | 'edit' | 'delete' | null;

export interface DashboardState {
  viewMode: ViewMode;
  filters: {
    search: string;
    sort: {
      field: SortField;
      direction: SortDirection;
    };
    categories: string[];
    tags: ProductTag[];
    priceRange: [number, number];
  };
  modals: {
    product: {
      type: ModalType;
      data: Product | null;
    };
    profile: boolean;
    customization: boolean;
    plan: boolean;
  };
}

export interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  onSortDirectionChange: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateProduct: () => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
}

export interface ProductListProps {
  products: Product[];
  viewMode: ViewMode;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  renderProductTags: (product: Product) => React.ReactNode;
}

export interface DashboardHeaderProps {
  profile: Profile;
  onViewStore: () => void;
  onViewOrders: () => void;
  onCustomize: () => void;
  onPlanSelect: () => void;
  onLogout: () => void;
}

export interface DashboardStatsProps {
  products: Product[];
  profile: Profile;
}