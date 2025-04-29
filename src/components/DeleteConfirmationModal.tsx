import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { DeleteConfirmationModalProps } from '../lib/types';

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  productName 
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (!isOpen) return null;
  
  const handleConfirmClick = async () => {
    setIsDeleting(true);
    
    try {
      await onConfirm();
    } catch (error) {
      console.error("Error deleting product:", error);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Confirmar exclusão
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mt-3">
            <p className="text-sm text-gray-500">
              Tem certeza que deseja excluir o produto <strong>"{productName}"</strong>? 
              Esta ação não pode ser desfeita.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isDeleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isDeleting}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir Produto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}