import { useState } from 'react';
import { createProduct, updateProduct, deleteProduct } from '../lib/products';
import type { Product, ProductFormData } from '../types/products';

export function useProductActions(onProductsChange: (products: Product[]) => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateProduct = async (formData: ProductFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const newProduct = await createProduct(formData);
      if (newProduct) {
        onProductsChange(prev => [newProduct, ...prev]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error creating product');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async (formData: ProductFormData, productId?: string, currentImageUrl?: string | null) => {
    if (!productId) {
      setError('Product ID is required for editing');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const updatedProduct = await updateProduct(
        productId,
        formData,
        currentImageUrl
      );
      if (updatedProduct) {
        onProductsChange(prev => 
          prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
        );
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error updating product');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteProduct(productId);
      onProductsChange(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error deleting product');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    handleCreateProduct,
    handleEditProduct,
    handleDeleteProduct
  };
}