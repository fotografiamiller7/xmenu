import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import PaymentLightbox from '../components/PaymentLightbox';
import CartDrawer from '../components/CartDrawer';
import OrderSearchLightbox from '../components/OrderSearchLightbox';
import { Store, Search, ShoppingBag, Package, Sparkles, AlertTriangle, Crown, Star, TrendingUp, Phone, MapPin, Instagram, Filter, SortAsc, DollarSign, Calendar, Tags, MessageCircle, Send, Check } from 'lucide-react';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

export default function Checkout() {
  const { storeName } = useParams<{ storeName: string }>();
  const navigate = useNavigate();
  const [themeColor, setThemeColor] = useState('#0061FF');
  const { items, total, removeFromCart, updateQuantity, clearCart } = useCart();
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    address: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentLightbox, setShowPaymentLightbox] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderSearchOpen, setIsOrderSearchOpen] = useState(false);
  const [allowCart, setAllowCart] = useState(false);

  const isFormValid = 
    formData.name.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.phone.trim() !== '' &&
    formData.cpf.trim() !== '' &&
    formData.address.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setPaymentError(null);
    setIsSubmitting(true);
    
    try {
      // Get store's API key
      if (!storeProfile.apikey) {
        throw new Error('Chave da API não configurada para esta loja');
      }

      // Prepare payment data
      const paymentData = {
        amount: total,
        customerData: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          cpf: formData.cpf.trim()
        },
        storeApiKey: storeProfile.apikey,
        description: `Pedido ${storeProfile.store_name}`
      };

      console.log('Sending payment request:', paymentData);

      // Make request to payment function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar pagamento');
      }

      const data = await response.json();
      
      // Add store API key to payment data for status checks
      data.store_api_key = storeProfile.apikey;
      data.store_id = storeProfile.id;
      data.customer_data = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        cpf: formData.cpf,
        address: formData.address
      };

      setPaymentData(data);
      setShowPaymentLightbox(true);
    } catch (error) {
      console.error('Error processing payment:', error);
      setPaymentError(error instanceof Error ? error.message : 'Erro ao processar pagamento');
      setShowPaymentLightbox(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        if (!storeName) {
          throw new Error('Nome da loja não fornecido');
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('store_name', storeName)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData) {
          throw new Error('Loja não encontrada');
        }

        setStoreProfile(profileData);
        setThemeColor(profileData.theme || '#0061FF');
        setThemeColor(profileData.theme || '#0061FF');

        // Get store's plan features
        const { data: planFeatures, error: planError } = await supabase
          .from('plan_features')
          .select('*')
          .eq('plan_id', profileData.plano)
          .maybeSingle();

        if (!planError && planFeatures) {
          setAllowCart(planFeatures.allow_cart);
        }
      } catch (error) {
        console.error('Error fetching store data:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar dados da loja');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreData();
  }, [storeName]);

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
            onClick={() => navigate(`/store/${storeName}`)}
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: themeColor }}
          >
            <Store className="w-5 h-5" />
            Voltar à loja
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

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Carrinho vazio
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Seu carrinho está vazio. Adicione alguns produtos antes de finalizar a compra.
          </p>
          <button
            onClick={() => navigate(`/store/${storeName}`)}
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: themeColor }}
          >
            <Store className="w-5 h-5" />
            Voltar à loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/store/${storeName}`)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Store className="w-5 h-5" />
                Voltar à loja
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Finalizar Compra
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Preencha seus dados para concluir o pedido
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Informações do Estabelecimento
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-white">
                    {storeProfile.store_name}
                  </span>
                </div>

                {storeProfile.endereco && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {storeProfile.endereco}
                    </span>
                  </div>
                )}

                {storeProfile.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {storeProfile.telefone}
                    </span>
                  </div>
                )}

                {storeProfile.instagram && (
                  <div className="flex items-center gap-2">
                    <Instagram className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <a
                      href={`https://instagram.com/${storeProfile.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {storeProfile.instagram}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Seus Dados
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Endereço completo
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
                    placeholder="Rua, número, complemento, bairro, cidade e estado"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': `${themeColor}33` } as React.CSSProperties}
                    placeholder="Instruções especiais, preferências, etc."
                  />
                </div>

                {paymentError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>{paymentError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting || showSuccess}
                  className={`w-full mt-6 px-6 py-3 text-white font-medium rounded-lg transition-colors ${
                    !isFormValid ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{ 
                    backgroundColor: themeColor,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div className={`flex items-center justify-center gap-2 transition-transform duration-200 ${showSuccess ? 'translate-y-full' : ''}`}>
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <span>Confirmar Pedido</span>
                    )}
                  </div>
                  <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-200 ${showSuccess ? '' : '-translate-y-full'}`}>
                    <Check className="w-5 h-5" />
                    <span>Pedido Confirmado!</span>
                  </div>
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Resumo do Pedido
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {items.map(item => (
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
                      
                      <div className="mt-1 flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          x {formatPrice(item.price)}
                        </span>
                        <span 
                          className="text-sm font-medium ml-auto"
                          style={{ color: themeColor }}
                        >
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="mt-2 flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-lg font-medium">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span style={{ color: themeColor }}>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PaymentLightbox
        isOpen={showPaymentLightbox}
        onClose={() => setShowPaymentLightbox(false)}
        paymentData={paymentData}
        themeColor={themeColor}
        formData={formData}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        themeColor={themeColor}
      />

      <OrderSearchLightbox
        isOpen={isOrderSearchOpen}
        onClose={() => setIsOrderSearchOpen(false)}
        themeColor={themeColor}
      />
    </div>
  );
}