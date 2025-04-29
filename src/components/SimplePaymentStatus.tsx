import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Loader } from 'lucide-react';

interface SimplePaymentStatusProps {
  paymentId: string;
  storeApiKey: string;
  onPaymentApproved?: () => void;
}

export default function SimplePaymentStatus({ 
  paymentId, 
  storeApiKey,
  onPaymentApproved
}: SimplePaymentStatusProps) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'error'>('pending');
  const [message, setMessage] = useState('Aguardando pagamento...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-status-simple`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId,
            storeApiKey
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao verificar status');
        }

        const data = await response.json();
        setStatus(data.status);

        switch (data.status) {
          case 'approved':
            setMessage('Pagamento aprovado!');
            if (onPaymentApproved) {
              onPaymentApproved();
            }
            break;
          case 'rejected':
            setMessage('Pagamento rejeitado.');
            break;
          default:
            setMessage('Aguardando pagamento...');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Erro ao verificar status do pagamento');
      } finally {
        setIsLoading(false);
      }
    };

    // Check immediately
    checkStatus();

    // Then check every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [paymentId, storeApiKey, onPaymentApproved]);

  return (
    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Loader className="w-5 h-5 animate-spin text-blue-500" />
        ) : status === 'approved' ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : status === 'rejected' || status === 'error' ? (
          <AlertTriangle className="w-5 h-5 text-red-500" />
        ) : (
          <Loader className="w-5 h-5 animate-spin text-blue-500" />
        )}
        
        <span className={`font-medium ${
          status === 'approved' ? 'text-green-600' :
          status === 'rejected' || status === 'error' ? 'text-red-600' :
          'text-blue-600'
        }`}>
          {message}
        </span>
      </div>
    </div>
  );
}