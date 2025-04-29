import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Copy, Receipt, User, CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import ErrorModal from './ErrorModal';
import { supabase } from '../lib/supabase';

interface PlanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    id: string;
    name: string;
    price: number;
  };
  isAnnual: boolean;
  themeColor: string;
}

type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'error';

interface ValidationError extends Error {
  code: string;
  details?: any;
}

export default function PlanPaymentModal({ isOpen, onClose, plan, isAnnual, themeColor }: PlanPaymentModalProps) {
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [statusMessage, setStatusMessage] = useState('Aguardando pagamento...');
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [error, setError] = useState<ValidationError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const navigate = useNavigate();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGeneratingPayment(false);
  }, []);

  const checkPaymentStatus = useCallback(async (paymentId: string, apiKey: string, userId: string) => {
    if (!isOpen || !isMountedRef.current) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId,
          storeApiKey: apiKey,
          storeId: plan.id
        }),
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao verificar status');
      }

      const data = await response.json();
      if (!isMountedRef.current) return;

      setPaymentStatus(data.status);

      switch (data.status) {
        case 'approved':
          setStatusMessage('Pagamento aprovado!');
          cleanup();
          
          try {
            // Update payment status in database
            const { error: paymentUpdateError } = await supabase
              .from('subscription_payments')
              .update({ status: 'approved' })
              .eq('payment_id', paymentId);

            if (paymentUpdateError) throw paymentUpdateError;

            // Call RPC function to manage subscription transition
            const { error: transitionError } = await supabase
              .rpc('manage_subscription_transition', {
                p_user_id: userId,
                p_plan_id: plan.id,
                p_payment_id: paymentId,
                p_period_type: isAnnual ? 'annual' : 'monthly'
              });

            if (transitionError) throw transitionError;

            // Send WhatsApp notification
            try {
              await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-notification`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: userId,
                  planName: plan.name,
                  period: isAnnual ? 'annual' : 'monthly'
                })
              });
            } catch (notificationError) {
              console.error('Error sending WhatsApp notification:', notificationError);
              // Don't throw error here to avoid interrupting the plan activation
            }

            // Close modal and redirect after successful transition
            setTimeout(() => {
              if (isMountedRef.current) {
                onClose();
                window.location.href = '/dashboard';
              }
            }, 2000);
          } catch (error) {
            console.error('Error updating subscription:', error);
            setError(error as ValidationError);
            return;
          }
          break;

        case 'rejected':
          setStatusMessage('Pagamento rejeitado.');
          cleanup();
          break;

        case 'error':
          setStatusMessage('Erro ao processar pagamento.');
          cleanup();
          break;

        default:
          setStatusMessage('Aguardando pagamento...');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Status check aborted');
        return;
      }
      if (!isMountedRef.current) return;
      
      console.error('Error checking payment status:', error);
      setPaymentStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Erro ao verificar status do pagamento');
      cleanup();
    }
  }, [isOpen, plan.id, plan.name, isAnnual, onClose, cleanup]);

  const startPaymentCheck = useCallback((paymentId: string, apiKey: string, userId: string) => {
    if (!paymentId || statusCheckIntervalRef.current || !isMountedRef.current) return;

    // Check immediately
    checkPaymentStatus(paymentId, apiKey, userId);

    // Then check every 5 seconds
    statusCheckIntervalRef.current = setInterval(() => {
      checkPaymentStatus(paymentId, apiKey, userId);
    }, 5000);
  }, [checkPaymentStatus]);

  // Effect for component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Effect for modal state changes
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setHasError(false);
      if (isMountedRef.current) {
        setPaymentData(null);
        setPaymentStatus('pending');
        setStatusMessage('Aguardando pagamento...');
        setError(null);
      }
    }
  }, [isOpen, cleanup]);

  const generatePayment = useCallback(async () => {
    if (!isOpen || !plan || !isMountedRef.current) return;
    
    cleanup();
    setIsGeneratingPayment(true);
    setError(null);
    
    abortControllerRef.current = new AbortController();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }

      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('apikey')
        .eq('email', 'admin@admin.com')
        .single();

      if (adminError) {
        throw new Error('Erro ao obter dados do administrador');
      }

      if (!adminData?.apikey) {
        throw new Error('Chave da API não configurada');
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('name, email, cpf')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const amount = isAnnual ? calculateAnnualPrice(plan.price) : plan.price;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plan-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          customerData: {
            name: userData.name,
            email: userData.email,
            cpf: userData.cpf.replace(/\D/g, '') // Remove non-numeric characters
          },
          storeApiKey: adminData.apikey,
          description: `Assinatura ${plan.name} - ${isAnnual ? 'Anual' : 'Mensal'}`,
          period_type: isAnnual ? 'annual' : 'monthly'
        }),
        signal: abortControllerRef.current.signal
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao gerar pagamento');
      }

      // Add store API key and plan info to payment data
      responseData.store_api_key = adminData.apikey;
      responseData.store_id = plan.id;
      responseData.user_id = user.id;
      responseData.period_type = isAnnual ? 'annual' : 'monthly';

      if (!isMountedRef.current) return;

      // Save payment record
      const { error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          amount,
          period_type: isAnnual ? 'annual' : 'monthly',
          status: 'pending',
          payment_id: responseData.id
        });

      if (paymentError) throw paymentError;

      setPaymentData(responseData);
      
      if (isMountedRef.current && isOpen) {
        startPaymentCheck(responseData.id, adminData.apikey, user.id);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      if (!isMountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar pagamento';
      setHasError(true);
      const errorResponse = error instanceof Error && 'code' in error ? error : null;
      if (errorResponse?.code === 'INVALID_CPF' || errorMessage.includes('CPF')) {
        setPaymentData(null);
        setShowErrorModal(true);
        setIsGeneratingPayment(false);
        return;
      }

      setError(error as ValidationError);
      setPaymentStatus('error');
    } finally {
      if (isMountedRef.current) {
        setIsGeneratingPayment(false);
      }
    }
  }, [isOpen, plan, isAnnual, startPaymentCheck, cleanup]);

  // Effect for payment generation
  useEffect(() => {
    if (isOpen && plan && !isGeneratingPayment && !paymentData && !hasError) {
      console.log('Generating payment for plan:', {
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        isAnnual
      });
      generatePayment();
    }
  }, [isOpen, plan, isGeneratingPayment, paymentData, hasError, generatePayment]);

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <>
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
                  {isGeneratingPayment ? 'Gerando Pagamento...' : 'Pagamento via PIX'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Plano {plan.name} - {isAnnual ? 'Anual' : 'Mensal'}
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
                  {formatPrice(isAnnual ? calculateAnnualPrice(plan.price) : plan.price)}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <CreditCard className="w-4 h-4" />
                  <span>Período</span>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">
                  {isAnnual ? 'Anual' : 'Mensal'}
                </p>
              </div>
            </div>

            {error ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Erro ao gerar pagamento
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-wrap">
                  {error.message}
                </p>
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: themeColor }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : !paymentData ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-transparent" style={{ borderTopColor: themeColor }}>
                    <span className="sr-only">Gerando pagamento...</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  Gerando pagamento, aguarde...
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  <div className="aspect-square w-64 mx-auto bg-white p-4 rounded-lg">
                    <img
                      src={`data:image/png;base64,${paymentData.point_of_interaction.transaction_data.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="w-full h-full"
                    />
                  </div>

                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{
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
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
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
              </>
            )}
          </div>
          </div>
        </div>
        {showErrorModal && (
          <ErrorModal
            isOpen={showErrorModal}
            onClose={() => setShowErrorModal(false)}
            message="CPF inválido. Por favor, verifique os dados informados e tente novamente."
            themeColor={themeColor}
            onRetry={generatePayment}
          />
        )}
      </div>
    </>
  );
}

function calculateAnnualPrice(monthlyPrice: number): number {
  const annualPrice = monthlyPrice * 12;
  const discount = annualPrice * 0.2; // 20% discount
  return annualPrice - discount;
}