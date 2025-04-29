import React from 'react';
import { Package, Users, LayoutDashboard } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';

interface TabNavigationProps {
  activeTab: 'orders' | 'customers';
  setActiveTab: (tab: 'orders' | 'customers') => void;
  navigate: NavigateFunction;
}

export function TabNavigation({ activeTab, setActiveTab, navigate }: TabNavigationProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-8">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          <button
            onClick={() => {
              setActiveTab('orders');
            }}
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
            onClick={() => {
              setActiveTab('customers');
            }}
            className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm ${
              activeTab === 'customers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-5 h-5" />
            Clientes
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="py-4 px-6 inline-flex items-center gap-2 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
        </nav>
      </div>
    </div>
  );
}