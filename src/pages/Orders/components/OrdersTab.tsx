import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, DollarSign, ArrowUpDown, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrice, formatDate } from '../../../utils/format';
import { getStatusColor, getDeliveryStatusColor, formatDeliveryStatus } from '../utils/statusHelpers';
import type { Order } from '../../../lib/types';

interface OrdersTabProps {
  orders: {
    data: Order[];
    filteredData: Order[];
    paginatedData: Order[];
    totalPages: number;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    sortField: 'created_at' | 'total_amount';
    setSortField: (field: 'created_at' | 'total_amount') => void;
    sortDirection: 'asc' | 'desc';
    setSortDirection: (direction: 'asc' | 'desc') => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
  };
  onOrderClick: (order: Order) => void;
}

export function OrdersTab({ orders, onOrderClick }: OrdersTabProps) {
  const navigate = useNavigate();
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={orders.searchTerm}
                onChange={(e) => {
                  orders.setSearchTerm(e.target.value);
                  orders.setCurrentPage(1);
                }}
                placeholder="Buscar por cliente, email ou produtos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                orders.setSortField('created_at');
                orders.setSortDirection(prev => 
                  orders.sortField === 'created_at' && prev === 'desc' ? 'asc' : 'desc'
                );
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                orders.sortField === 'created_at'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-200'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Data</span>
            </button>
            
            <button
              onClick={() => {
                orders.setSortField('total_amount');
                orders.setSortDirection(prev => 
                  orders.sortField === 'total_amount' && prev === 'desc' ? 'asc' : 'desc'
                );
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                orders.sortField === 'total_amount'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-200'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Valor</span>
            </button>
            
            <button
              onClick={() => orders.setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={orders.sortDirection === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
            >
              <ArrowUpDown 
                className={`w-4 h-4 transition-transform ${
                  orders.sortDirection === 'asc' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {orders.data.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum pedido encontrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {orders.searchTerm
              ? `Não encontramos pedidos com o termo "${orders.searchTerm}"`
              : 'Sua loja ainda não recebeu nenhum pedido'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Entrega
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.paginatedData.map((order) => (
                  <tr 
                    key={order.id}
                    onClick={() => onOrderClick(order)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.customer_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.customer_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDeliveryStatusColor(order.delivery_status)}`}>
                        {formatDeliveryStatus(order.delivery_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/checkout/pedidos/${order.id}`);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando{' '}
                  <span className="font-medium">{((orders.currentPage - 1) * 10) + 1}</span>
                  {' '}a{' '}
                  <span className="font-medium">
                    {Math.min(orders.currentPage * 10, orders.filteredData.length)}
                  </span>
                  {' '}de{' '}
                  <span className="font-medium">{orders.filteredData.length}</span>
                  {' '}resultados
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => orders.setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={orders.currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => orders.setCurrentPage(prev => Math.min(orders.totalPages, prev + 1))}
                  disabled={orders.currentPage === orders.totalPages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}