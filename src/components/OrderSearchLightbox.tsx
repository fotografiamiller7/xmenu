import React, { useState } from 'react';
import { X, Search, AlertTriangle, Package, Clock, ArrowUpDown, Calendar, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

type SortField = 'created_at' | 'total_amount';
type SortDirection = 'asc' | 'desc';

interface OrderSearchLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
}

interface OrderResult {
  id: string;
  created_at: string;
  total_amount: number;
  produtos: any[];
  delivery_status: string;
  status: string;
}

const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

const getDeliveryStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'entrega_pendente':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'em_preparacao':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'em_transito':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'entregue':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'cancelado':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const formatDeliveryStatus = (status: string) => {
  switch (status.toLowerCase()) {
    case 'entrega_pendente':
      return 'Entrega Pendente';
    case 'em_preparacao':
      return 'Em Preparação';
    case 'em_transito':
      return 'Em Trânsito';
    case 'entregue':
      return 'Entregue';
    case 'cancelado':
      return 'Cancelado';
    default:
      return status;
  }
};

export default function OrderSearchLightbox({ isOpen, onClose, themeColor }: OrderSearchLightboxProps) {
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const ITEMS_PER_PAGE = 3;

  const sortOrders = (orders: OrderResult[]): OrderResult[] => {
    return [...orders].sort((a, b) => {
      if (sortField === 'created_at') {
        return sortDirection === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      // total_amount
      return sortDirection === 'desc'
        ? b.total_amount - a.total_amount
        : a.total_amount - b.total_amount;
    });
  };

  const filterOrders = (orders: OrderResult[]): OrderResult[] => {
    if (!searchTerm.trim()) return orders;
    
    const term = searchTerm.toLowerCase().trim();
    return orders.filter(order => 
      order.produtos.some(produto => 
        produto.name.toLowerCase().includes(term)
      )
    );
  };

  const paginatedOrders = (orders: OrderResult[]): OrderResult[] => {
    const filteredOrders = filterOrders(orders);
    const sortedOrders = sortOrders(filteredOrders);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const totalPages = Math.ceil(filterOrders(orders).length / ITEMS_PER_PAGE);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateCPF = (cpf: string) => {
    return cpf.length === 14;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Remove formatting from CPF before querying
    const unformattedCPF = cpf.replace(/\D/g, '');

    if (!validateEmail(email)) {
      setError('Email inválido');
      return;
    }

    if (!validateCPF(cpf)) {
      setError('CPF inválido');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: queryError } = await supabase
        .from('pedidosxmenu')
        .select()
        .eq('customer_email', email)
        .eq('customer_cpf', unformattedCPF)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      console.log('Query results:', data); // For debugging

      setOrders(data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Erro ao buscar pedidos. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSearch = () => {
    setShowResults(false);
    setOrders([]);
    setEmail('');
    setCpf('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
        />

        <div
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-auto overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {showResults ? 'Meus Pedidos' : 'Buscar Pedidos'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {!showResults ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={handleCPFChange}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: themeColor }}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Buscar Pedidos</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhum pedido encontrado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Não encontramos pedidos com os dados informados.
                    </p>
                    <button
                      onClick={resetSearch}
                      className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Search className="w-5 h-5" />
                      Nova Busca
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setCurrentPage(1);
                            }}
                            placeholder="Buscar produtos..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent text-sm"
                            style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSortField('created_at');
                            setSortDirection(prev => 
                              sortField === 'created_at' && prev === 'desc' ? 'asc' : 'desc'
                            );
                          }}
                          className={`p-2 rounded-lg border transition-colors ${
                            sortField === 'created_at'
                              ? 'border-transparent'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                          style={{
                            backgroundColor: sortField === 'created_at' ? `${themeColor}20` : '',
                            color: sortField === 'created_at' ? themeColor : ''
                          }}
                          title="Ordenar por data"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setSortField('total_amount');
                            setSortDirection(prev => 
                              sortField === 'total_amount' && prev === 'desc' ? 'asc' : 'desc'
                            );
                          }}
                          className={`p-2 rounded-lg border transition-colors ${
                            sortField === 'total_amount'
                              ? 'border-transparent'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                          style={{
                            backgroundColor: sortField === 'total_amount' ? `${themeColor}20` : '',
                            color: sortField === 'total_amount' ? themeColor : ''
                          }}
                          title="Ordenar por valor"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                          title={sortDirection === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
                        >
                          <ArrowUpDown 
                            className={`w-4 h-4 transition-transform ${
                              sortDirection === 'asc' ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {paginatedOrders(orders).map(order => (
                        <div
                          key={order.id}
                          className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(order.created_at)}</span>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm ${getDeliveryStatusColor(order.delivery_status)}`}>
                              {formatDeliveryStatus(order.delivery_status)}
                            </div>
                          </div>

                          <div className="space-y-2 mb-3">
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
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {produto.quantity}x
                                  </span>
                                  <span className="font-medium" style={{ color: themeColor }}>
                                    {formatPrice(produto.price * produto.quantity)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-600">
                            <div className="text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Total</span>
                            </div>
                            <div className="text-lg font-bold" style={{ color: themeColor }}>
                              {formatPrice(order.total_amount)}
                            </div>
                          </div>

                          <button
                            onClick={() => window.location.href = `/checkout/pedidos/${order.id}`}
                            className="w-full mt-3 text-center px-3 py-2 text-sm rounded-lg transition-colors"
                            style={{ 
                              backgroundColor: `${themeColor}10`,
                              color: themeColor
                            }}
                          >
                            Ver Detalhes
                          </button>
                        </div>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Página {currentPage} de {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={resetSearch}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Search className="w-5 h-5" />
                      Nova Busca
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}