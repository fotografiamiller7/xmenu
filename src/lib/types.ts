// Database types
export interface Product {
  id: string;
  user_id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  tags: string[];
  quantity: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductTag = 'novidade' | 'em-falta' | 'premium' | 'exclusivo' | 'mais-pedido';

export interface ProductFormData {
  name: string;
  price: string;
  description: string;
  category: string;
  tags: ProductTag[];
  quantity: number;
  image: File | null;
}

export type ModalType = 'create' | 'edit' | 'delete' | null;

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ProductFormData) => Promise<void>;
  initialData?: Product;
  type: ModalType;
}

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  productName: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
}