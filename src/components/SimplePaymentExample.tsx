import React, { useState } from 'react';
import SimplePaymentStatus from './SimplePaymentStatus';

export default function SimplePaymentExample() {
  const [paymentId, setPaymentId] = useState('');
  const [storeApiKey, setStoreApiKey] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
  };
  
  const handlePaymentApproved = () => {
    alert('Pagamento aprovado com sucesso!');
  };
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Verificar Status de Pagamento
      </h2>
      
      {!isChecking ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID do Pagamento
            </label>
            <input
              type="text"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Chave da API
            </label>
            <input
              type="password"
              value={storeApiKey}
              onChange={(e) => setStoreApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Verificar Status
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <SimplePaymentStatus 
            paymentId={paymentId}
            storeApiKey={storeApiKey}
            onPaymentApproved={handlePaymentApproved}
          />
          
          <button
            onClick={() => setIsChecking(false)}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}