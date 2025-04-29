import React, { useState } from 'react';
import { X, Save, AlertTriangle, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    email: string;
    cpf: string;
    store_name: string;
    telefone?: string;
    endereco?: string;
    instagram?: string;
    planosxmenu?: {
      id: string;
      name: string;
      price: number;
    };
    subscriptions?: Array<{
      id: string;
      status: string;
      current_period_start: string;
      current_period_end: string;
    }>;
  };
  onUpdate: () => Promise<void>;
}

// Função auxiliar para gerar payment_id numérico de 11 dígitos
function generateNumericPaymentId() {
  const min = 10000000000; // 10^10
  const max = 99999999999; // 10^11 - 1
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export default function CustomerDetailsModal({ 
  isOpen, 
  onClose, 
  customer,
  onUpdate 
}: CustomerDetailsModalProps) {
  const [formData, setFormData] = useState({
    name: customer.name,
    email: customer.email,
    cpf: customer.cpf,
    store_name: customer.store_name,
    telefone: customer.telefone || '',
    endereco: customer.endereco || '',
    instagram: customer.instagram || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(customer.planosxmenu || null); 
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'canceled'>(
    customer.subscriptions?.[0]?.status === 'canceled' ? 'canceled' : 'active'
  );

  const STATUS_OPTIONS = [
    { value: 'active', label: 'Ativo' },
    { value: 'canceled', label: 'Cancelado' }
  ];

  React.useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('planosxmenu')
        .select('*')
        .order('price', { ascending: true });
      if (!error && data) {
        setPlans(data);
      }
    };

    fetchPlans();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Atualiza os dados do perfil do cliente
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim(),
          cpf: formData.cpf.trim(),
          store_name: formData.store_name.trim(),
          telefone: formData.telefone.trim(),
          endereco: formData.endereco.trim(),
          instagram: formData.instagram.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);
      if (updateError) throw updateError;

      // 2. Verifica se houve alteração no plano ou no status
      const isPlanChange = selectedPlan?.id !== customer.planosxmenu?.id;
      const isStatusChange = selectedStatus !== customer.subscriptions?.[0]?.status;
      const isActivatingPaidPlan =
        selectedPlan?.price > 0 &&
        selectedStatus === 'active' &&
        (isPlanChange || isStatusChange);

      // 3. Se houver mudança no status, atualiza a tabela subscriptions diretamente
      if (isStatusChange) {
        const subscriptionId = customer.subscriptions?.[0]?.id;
        if (subscriptionId) {
          const { error: subUpdateError } = await supabase
            .from('subscriptions')
            .update({ status: selectedStatus })
            .eq('id', subscriptionId);
          if (subUpdateError) {
            throw new Error('Erro ao atualizar status na tabela subscriptions');
          }
        }
      }

      // 4. Se houve mudança de plano ou status, trata da transição de assinatura
      if (isPlanChange || isStatusChange) {
        let rpcParams: any = {
          p_user_id: customer.id,
          p_plan_id: selectedPlan?.id || customer.planosxmenu?.id,
          p_status: selectedStatus,
          p_period_type: 'monthly'
        };

        if (isActivatingPaidPlan) {
          // Verifica se existe um pagamento aprovado recente para o usuário
          const { data: payments, error: paymentError } = await supabase
            .from('subscription_payments')
            .select('payment_id')
            .eq('user_id', customer.id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1);
          if (paymentError) {
            throw new Error('Erro ao verificar pagamentos do usuário');
          }

          if (!payments || payments.length === 0 || !payments[0].payment_id) {
            // Se não encontrar, gera um novo payment_id numérico e insere o registro
            const newPaymentId = generateNumericPaymentId();
            const { data: newPaymentData, error: insertError } = await supabase
              .from('subscription_payments')
              .insert({
                payment_id: newPaymentId,
                plan_id: selectedPlan?.id || customer.planosxmenu?.id,
                user_id: customer.id,
                status: 'approved',
                amount: selectedPlan?.price || 0,
                period_type: 'monthly',
                created_at: new Date().toISOString()
              })
              .select('payment_id')
              .single();
            if (insertError) {
              throw new Error('Erro ao criar novo registro de pagamento');
            }
            rpcParams.p_payment_id = newPaymentData.payment_id;
          } else {
            rpcParams.p_payment_id = payments[0].payment_id;
          }
        }

        // Chama a função RPC para gerenciar a transição da assinatura
        const { error: planError } = await supabase.rpc('manage_subscription_transition', rpcParams);
        if (planError) throw planError;
      }

      setShowSuccess(true);
      await onUpdate();

      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error updating customer:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    setSelectedPlan(plan || null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Detalhes do Cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {showSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-green-600" />
              <p className="text-green-700">Cliente atualizado com sucesso!</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do estabelecimento</label>
              <input
                type="text"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@seu.instagram"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Informações da Assinatura</h3>
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 space-y-2">
              <div className="">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Plano</label>
                  <select
                    value={selectedPlan?.id || ''}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Selecione um plano</option>
                    
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}/mês)
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedPlan?.id !== customer.planosxmenu?.id && (
                  <div className="col-span-2 bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Alteração de Plano</p>
                      <p>
                        Ao salvar, o plano será alterado de <strong>{customer.planosxmenu?.name || 'Sem plano'}</strong> para <strong>{selectedPlan?.name}</strong>
                      </p>
                      {selectedPlan?.price > 0 && (
                        <p className="mt-1 text-xs">
                          Nota: Para planos pagos, é necessário ter um pagamento aprovado recente.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-2 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status da Assinatura</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'canceled')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {customer.subscriptions?.[0] && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Início do Período</p>
                    <p className="font-medium text-gray-900">
                      {new Date(customer.subscriptions[0].current_period_start).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fim do Período</p>
                    <p className="font-medium text-gray-900">
                      {new Date(customer.subscriptions[0].current_period_end).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </>
            )}

            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || showSuccess}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
