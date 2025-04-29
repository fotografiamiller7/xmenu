import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Copy, Receipt, User, CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface PaymentLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: any;
  themeColor: string;
  formData: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: string;
    notes?: string;
  };
}

type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'error';

export default function PaymentLightbox({ isOpen, onClose, paymentData, themeColor, formData }: PaymentLightboxProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [statusMessage, setStatusMessage] = useState('Aguardando pagamento...');
  const { items, clearCart } = useCart();
  const navigate = useNavigate();
  let interval: NodeJS.Timeout;

  useEffect(() => {
    if (!isOpen || !paymentData) return;

    const checkPaymentStatus = async () => {
      try {
        // Validate required customer data before making the request
        if (!formData.email?.trim()) {
          setPaymentStatus('error');
          setStatusMessage('Email do cliente é obrigatório');
          clearInterval(interval);
          return;
        }

        if (!formData.name?.trim()) {
          setPaymentStatus('error');
          setStatusMessage('Nome do cliente é obrigatório');
          clearInterval(interval);
          return;
        }

        if (!formData.phone?.trim()) {
          setPaymentStatus('error');
          setStatusMessage('Telefone do cliente é obrigatório');
          clearInterval(interval);
          return;
        }

        if (!formData.cpf?.trim()) {
          setPaymentStatus('error');
          setStatusMessage('CPF do cliente é obrigatório');
          clearInterval(interval);
          return;
        }

        if (!formData.address?.trim()) {
          setPaymentStatus('error');
          setStatusMessage('Endereço do cliente é obrigatório');
          clearInterval(interval);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId: paymentData.id,
            storeApiKey: paymentData?.store_api_key,
            storeId: paymentData?.store_id,
            orderData: {
              customerName: formData.name.trim(),
              customerEmail: formData.email.trim(),
              customerPhone: formData.phone.trim(),
              customerCpf: formData.cpf.trim(),
              customerAddress: formData.address.trim(),
              customerNotes: formData.notes?.trim(),
              products: items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image_url: item.image_url
              })),
              totalAmount: paymentData.transaction_amount
            }
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao verificar status');
        }

        const data = await response.json();
        setPaymentStatus(data.status);

        switch (data.status) {
          case 'approved':
            setStatusMessage('Pagamento aprovado!');
            clearCart();
            clearInterval(interval);
            // Redirect to order details page
            if (data.orderId) {
              // Send order notifications
              try {
                await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/order-notification`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    orderId: data.orderId,
                    storeId: paymentData.store_id
                  })
                });
              } catch (notificationError) {
                console.error('Error sending order notification:', notificationError);
                // Don't throw error here to avoid interrupting the order flow
              }

              setTimeout(() => {
                navigate(`/checkout/pedidos/${data.orderId}`);
              }, 2000);
            }
            break;
          case 'rejected':
            setStatusMessage('Pagamento rejeitado.');
            clearInterval(interval);
            break;
          default:
            setStatusMessage('Aguardando pagamento...');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setPaymentStatus('error');
        setStatusMessage('Erro ao verificar status do pagamento');
        clearInterval(interval);
      }
    };

    // Check immediately
    checkPaymentStatus();

    // Then check every 5 seconds
    interval = setInterval(checkPaymentStatus, 5000);

    return () => clearInterval(interval);
  }, [isOpen, paymentData, formData, navigate]);

  if (!isOpen) return null;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

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
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Pagamento via PIX
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pedido #{paymentData.id}
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Receipt className="w-4 h-4" />
                  <span>Valor Total</span>
                </div>
                <p 
                  className="text-lg font-bold"
                  style={{ color: themeColor }}
                >
                  {formatPrice(paymentData.transaction_amount)}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <User className="w-4 h-4" />
                  <span>Titular</span>
                </div>
                <p className="text-gray-900 dark:text-white font-medium truncate">
                  {paymentData.point_of_interaction.transaction_data.bank_info.collector.account_holder_name}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <CreditCard className="w-4 h-4" />
                <span>Descrição</span>
              </div>
              <p className="text-gray-900 dark:text-white">
                {paymentData.description}
              </p>
              
              <div className="mt-4 space-y-2">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between text-sm py-2 border-t border-gray-100 dark:border-gray-700 first:border-t-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-300">
                        {item.quantity}x
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-medium" style={{ color: themeColor }}>
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="aspect-square w-64 mx-auto bg-white p-4 rounded-lg">
                <img
                  src={`data:image/png;base64,${paymentData.point_of_interaction.transaction_data.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-full h-full"
                />
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm" style={{
                  backgroundColor: paymentStatus === 'approved' ? '#dcfce7' : 
                                 paymentStatus === 'rejected' ? '#fee2e2' :
                                 paymentStatus === 'error' ? '#fee2e2' : '#f3f4f6',
                  color: paymentStatus === 'approved' ? '#15803d' :
                         paymentStatus === 'rejected' ? '#b91c1c' :
                         paymentStatus === 'error' ? '#b91c1c' : '#4b5563'
                }}>
                  {paymentStatus === 'pending' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {paymentStatus === 'approved' && <Check className="w-4 h-4" />}
                  {(paymentStatus === 'rejected' || paymentStatus === 'error') && <AlertTriangle className="w-4 h-4" />}
                  <span>{statusMessage}</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Copie o código PIX abaixo:
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={paymentData.point_of_interaction.transaction_data.qr_code}
                    readOnly
                    className="w-full pl-3 pr-20 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        paymentData.point_of_interaction.transaction_data.qr_code
                      );
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5"
                    style={{ 
                      backgroundColor: `${themeColor}20`,
                      color: themeColor
                    }}
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <p>Após o pagamento, você receberá a confirmação por email.</p>
                <p>O pagamento é processado em até 30 segundos.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}