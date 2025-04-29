import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Store, 
  ArrowLeft, 
  MapPin, 
  ChevronDown,
  Phone, 
  Mail,
  User,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  Receipt,
  Truck,
  Box,
  MessageCircle,
  Send
} from 'lucide-react';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'aprovado':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'rejeitado':
    case 'cancelado':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'finalizado':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
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

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pendente':
      return <Clock className="w-5 h-5" />;
    case 'aprovado':
      return <CheckCircle className="w-5 h-5" />;
    case 'rejeitado':
    case 'cancelado':
      return <AlertTriangle className="w-5 h-5" />;
    case 'finalizado':
      return <Truck className="w-5 h-5" />;
    default:
      return null;
  }
};

const getDeliveryStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'entrega_pendente':
      return <Clock className="w-5 h-5" />;
    case 'em_preparacao':
      return <Box className="w-5 h-5" />;
    case 'em_transito':
      return <Truck className="w-5 h-5" />;
    case 'entregue':
      return <CheckCircle className="w-5 h-5" />;
    case 'cancelado':
      return <AlertTriangle className="w-5 h-5" />;
    default:
      return null;
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

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [establishment, setEstablishment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState('#0061FF');
  const [expandedSections, setExpandedSections] = useState({
    establishment: false,
    customer: false,
    payment: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        if (!orderId) {
          throw new Error('ID do pedido não fornecido');
        }

        const { data: orderData, error: orderError } = await supabase
          .from('pedidosxmenu')
          .select(`
            *,
            establishment:establishment_id (
              id,
              name,
              store_name,
              email,
              telefone,
              endereco,
              theme
            )
          `)
          .eq('id', orderId)
          .single();

        if (orderError) {
          console.error('Error fetching order:', orderError);
          throw new Error('Erro ao carregar detalhes do pedido');
        }

        if (!orderData) {
          throw new Error('Pedido não encontrado');
        }

        setOrder(orderData);
        setEstablishment(orderData.establishment);
        setThemeColor(orderData.establishment?.theme || '#0061FF');

        // Update page title and meta tags
        const title = `Pedido #${orderData.payment_id} - ${orderData.establishment.store_name}`;
        document.title = title;

        const metaTags = {
          'og:title': title,
          'og:description': `Acompanhe seu pedido em ${orderData.establishment.store_name}`,
          'og:image': orderData.establishment.logo_url || 'https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/store-3d.png',
          'og:url': window.location.href
        };

        Object.entries(metaTags).forEach(([property, content]) => {
          let meta = document.querySelector(`meta[property="${property}"]`);
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', content);
        });

      } catch (error) {
        console.error('Error fetching order details:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar detalhes do pedido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

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
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: themeColor }}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: themeColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Detalhes do Pedido
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${getDeliveryStatusColor(order.delivery_status)}`}>
              {getDeliveryStatusIcon(order.delivery_status)}
              <span className="font-medium">{formatDeliveryStatus(order.delivery_status)}</span>
            </div>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              <span className="font-medium capitalize">{order.status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Items - Now at the top */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Itens do Pedido
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {order.produtos.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
                      
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {item.quantity}x {formatPrice(item.price)}
                        </span>
                        <span 
                          className="text-sm font-medium"
                          style={{ color: themeColor }}
                        >
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-lg font-medium">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span style={{ color: themeColor }}>
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Establishment Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <button
                onClick={() => toggleSection('establishment')}
                className="w-full flex items-center justify-between text-lg font-medium text-gray-900 dark:text-white"
              >
                <span>Informações do Estabelecimento</span>
                <ChevronDown 
                  className={`w-5 h-5 transition-transform ${
                    expandedSections.establishment ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              <div className={`space-y-3 overflow-hidden transition-all ${
                expandedSections.establishment ? 'mt-4' : 'h-0'
              }`}>
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-white">
                    {establishment.store_name}
                  </span>
                </div>

                {establishment.endereco && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {establishment.endereco}
                    </span>
                  </div>
                )}

                {establishment.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {establishment.telefone}
                    </span>
                  </div>
                )}

                {establishment.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {establishment.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <button
                onClick={() => toggleSection('customer')}
                className="w-full flex items-center justify-between text-lg font-medium text-gray-900 dark:text-white"
              >
                <span>Informações do Cliente</span>
                <ChevronDown 
                  className={`w-5 h-5 transition-transform ${
                    expandedSections.customer ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              <div className={`space-y-3 overflow-hidden transition-all ${
                expandedSections.customer ? 'mt-4' : 'h-0'
              }`}>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-white">
                    {order.customer_name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {order.customer_email}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {order.customer_phone}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    CPF: {order.customer_cpf}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {order.customer_address}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Notes */}
            {order.customer_notes && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" style={{ borderLeft: `4px solid ${themeColor}` }}>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Observações do Cliente
                </h2>
                
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: themeColor }} />
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {order.customer_notes}
                  </p>
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <button
                onClick={() => toggleSection('payment')}
                className="w-full flex items-center justify-between text-lg font-medium text-gray-900 dark:text-white"
              >
                <span>Informações do Pagamento</span>
                <ChevronDown 
                  className={`w-5 h-5 transition-transform ${
                    expandedSections.payment ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              <div className={`space-y-3 overflow-hidden transition-all ${
                expandedSections.payment ? 'mt-4' : 'h-0'
              }`}>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    ID do Pagamento: {order.payment_id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    Método: PIX
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    Data: {formatDate(order.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-white font-medium">
                    Total: {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Support Footer */}
      <div className="fixed bottom-0 inset-x-0 py-4 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: themeColor }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-white">
            <span>Precisa de ajuda com seu pedido?</span>
          </div>
          
          <div className="flex items-center gap-4">
            {establishment.telefone && (
              <a
                href={`https://wa.me/${establishment.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${establishment.store_name} tudo bem? preciso de ajuda com o pedido: ${order.payment_id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-opacity-90 text-green-600 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Suporte via WhatsApp</span>
              </a>
            )}
            
            {establishment.email && (
              <a
                href={`mailto:${establishment.email}?subject=Suporte%20Pedido%20${order.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-opacity-90 text-blue-600 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
                <span>Suporte via Email</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}