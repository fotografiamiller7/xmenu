import React from 'react';
import { Search, User, ChevronLeft, ChevronRight, Phone, ArrowUpDown, Mail, ShoppingBag } from 'lucide-react';
import type { Customer } from '../types';

interface CustomersTabProps {
  customers: {
    data: Customer[];
    filteredData: Customer[];
    sortedData: Customer[];
    paginatedData: Customer[];
    totalPages: number;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    sortField: 'name' | 'email' | 'phone' | 'orders_count';
    setSortField: (field: 'name' | 'email' | 'phone' | 'orders_count') => void;
    sortDirection: 'asc' | 'desc';
    setSortDirection: (direction: 'asc' | 'desc') => void;
  };
}

export function CustomersTab({ customers }: CustomersTabProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={customers.searchTerm}
                onChange={(e) => {
                  customers.setSearchTerm(e.target.value);
                  customers.setCurrentPage(1);
                }}
                placeholder="Buscar por nome, email ou telefone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {customers.data.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum cliente encontrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {customers.searchTerm
              ? `Não encontramos clientes com o termo "${customers.searchTerm}"`
              : 'Sua loja ainda não tem clientes registrados'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        if (customers.sortField === 'name') {
                          customers.setSortDirection(customers.sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          customers.setSortField('name');
                          customers.setSortDirection('asc');
                        }
                      }}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Nome
                      {customers.sortField === 'name' && (
                        <ArrowUpDown className={`w-4 h-4 transition-transform ${
                          customers.sortDirection === 'desc' ? 'rotate-180' : ''
                        }`} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        if (customers.sortField === 'email') {
                          customers.setSortDirection(customers.sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          customers.setSortField('email');
                          customers.setSortDirection('asc');
                        }
                      }}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Email
                      {customers.sortField === 'email' && (
                        <ArrowUpDown className={`w-4 h-4 transition-transform ${
                          customers.sortDirection === 'desc' ? 'rotate-180' : ''
                        }`} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        if (customers.sortField === 'phone') {
                          customers.setSortDirection(customers.sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          customers.setSortField('phone');
                          customers.setSortDirection('asc');
                        }
                      }}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Telefone
                      {customers.sortField === 'phone' && (
                        <ArrowUpDown className={`w-4 h-4 transition-transform ${
                          customers.sortDirection === 'desc' ? 'rotate-180' : ''
                        }`} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        if (customers.sortField === 'orders_count') {
                          customers.setSortDirection(customers.sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          customers.setSortField('orders_count');
                          customers.setSortDirection('desc');
                        }
                      }}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Pedidos
                      {customers.sortField === 'orders_count' && (
                        <ArrowUpDown className={`w-4 h-4 transition-transform ${
                          customers.sortDirection === 'desc' ? 'rotate-180' : ''
                        }`} />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {customers.paginatedData.map((customer, index) => (
                  <tr 
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {customer.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {customer.phone || 'Não informado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4 text-blue-500" />
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {customer.orders_count} {customer.orders_count === 1 ? 'pedido' : 'pedidos'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {customers.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando{' '}
                  <span className="font-medium">{((customers.currentPage - 1) * 10) + 1}</span>
                  {' '}a{' '}
                  <span className="font-medium">
                    {Math.min(customers.currentPage * 10, customers.filteredData.length)}
                  </span>
                  {' '}de{' '}
                  <span className="font-medium">{customers.filteredData.length}</span>
                  {' '}resultados
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => customers.setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={customers.currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => customers.setCurrentPage(prev => Math.min(customers.totalPages, prev + 1))}
                  disabled={customers.currentPage === customers.totalPages}
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