import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  themeColor?: string;
  onRetry?: () => void;
}

export default function ErrorModal({ 
  isOpen, 
  onClose, 
  message, 
  themeColor = '#0061FF',
  onRetry 
}: ErrorModalProps) {
  if (!isOpen) return null;

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
        />

        <div
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden"
          onClick={handleModalClick}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                CPF Inválido
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-wrap">
                {message}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Fechar
                </button>
                {onRetry && (
                  <button
                    onClick={() => {
                      onClose();
                      onRetry();
                    }}
                    className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
                    style={{ backgroundColor: themeColor }}
                  >
                    Tentar Novamente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}