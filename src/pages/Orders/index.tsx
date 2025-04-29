import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Package, Users, LayoutDashboard } from 'lucide-react';
import { useOrdersData } from './hooks/useOrdersData';
import { StatisticsCards } from './components/StatisticsCards';
import { OrdersTab } from './components/OrdersTab';
import { CustomersTab } from './components/CustomersTab';
import StatusUpdateModal from '../../components/StatusUpdateModal';
import type { Order } from '../../lib/types';

export default function Orders() {
  const { storeName } = useParams<{ storeName: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'customers'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const { 
    profile,
    orders,
    customers,
    orderStats,
    isLoading,
    error,
    refreshOrders
  } = useOrdersData(storeName);

  const handleOrderClick = (order: Order) => {
    setShowStatusModal(true);
    setSelectedOrder(order);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ops!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Voltar
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gerenciamento
              </h1>
            </div>
          </div>
        </div>
        
        {activeTab === 'orders' && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Gerencie os pedidos da sua loja
          </p>
        )}
        
        {activeTab === 'customers' && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Gerencie os clientes da sua loja
          </p>
        )}
        
        <div className="statistics-container">
          <StatisticsCards orderStats={orderStats} />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Package className="w-5 h-5" />
                Pedidos
              </button>
              
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm ${
                  activeTab === 'customers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-5 h-5" />
                Clientes
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'orders' ? (
          <OrdersTab 
            orders={orders} 
            onOrderClick={handleOrderClick} 
          />
        ) : (
          <CustomersTab 
            customers={customers} 
          />
        )}
      </div>
      
      {selectedOrder && showStatusModal && (
        <StatusUpdateModal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onUpdate={refreshOrders}
        />
      )}
    </div>
  );
}