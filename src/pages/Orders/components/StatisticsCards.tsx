import React from 'react';
import { Clock, Check, Package, DollarSign } from 'lucide-react';
import { formatPrice } from '../../../utils/format';

interface OrderStats {
  pendingOrders: number;
  deliveredOrders: number;
  totalOrders: number;
  totalRevenue: number;
}

interface StatisticsCardsProps {
  orderStats: OrderStats;
}

export function StatisticsCards({ orderStats }: StatisticsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8" style={{ display: 'grid' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pedidos Pendentes
          </h3>
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
          {orderStats.pendingOrders}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          aguardando entrega
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pedidos Entregues
          </h3>
          <div className="p-2 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg">
            <Check className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
          {orderStats.deliveredOrders}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          pedidos entregues
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total de Pedidos
          </h3>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
          {orderStats.totalOrders}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          pedidos realizados
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Faturamento Total
          </h3>
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
          {formatPrice(orderStats.totalRevenue)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          em vendas
        </p>
      </div>
    </div>
  );
}