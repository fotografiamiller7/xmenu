import React, { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Order } from '../lib/types';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onUpdate: () => void;
}

const DELIVERY_STATUSES = [
  { value: 'entrega_pendente', label: 'Entrega Pendente' },
  { value: 'em_preparacao', label: 'Em Preparação' },
  { value: 'em_transito', label: 'Em Trânsito' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' }
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

export default function StatusUpdateModal({
  isOpen,
  onClose,
  order,
  onUpdate
}: StatusUpdateModalProps) {
  const [deliveryStatus, setDeliveryStatus] = useState(order.delivery_status);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // First update the order status
      const { error: updateError } = await supabase.rpc('update_order_status', {
        p_order_id: order.id,
        p_new_status: order.status,
        p_new_delivery_status: deliveryStatus,
        p_reason: null
      });

      if (updateError) throw updateError;

      // Then send notification
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/status-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: order.id,
            oldDeliveryStatus: order.delivery_status,
            newDeliveryStatus: deliveryStatus
          })
        });
      } catch (notificationError) {
        console.error('Error sending status notification:', notificationError);
        // Don't throw error here to avoid interrupting the status update flow
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar status');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Atualizar Status da Entrega
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Order Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Detalhes do Pedido
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Cliente:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{order.customer_name}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Produtos
              </h3>
              
              <div className="space-y-2">
                {order.produtos.map((produto: any, index: number) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between text-sm py-2 border-b border-gray-200 dark:border-gray-600 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {produto.image_url ? (
                        <img 
                          src={produto.image_url} 
                          alt={produto.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      <span className="text-gray-900 dark:text-white">
                        {produto.name}
                      </span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">
                      {produto.quantity}x
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status da Entrega
              </label>
              <select
                value={deliveryStatus}
                onChange={(e) => setDeliveryStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {DELIVERY_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Atualizando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Atualizar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}