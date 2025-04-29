import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Check, 
  Copy, 
  Receipt, 
  User, 
  CreditCard, 
  Loader2, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  CheckCircle 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PlanPaymentModal from './PlanPaymentModal';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
}

interface ValidationError extends Error {
  code: ErrorCode;
  details?: any;
}

type ErrorCode = 
  | 'INVALID_USER'
  | 'INVALID_PLAN'
  | 'SAME_PLAN'
  | 'DOWNGRADE_NOT_ALLOWED'
  | 'PAYMENT_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

interface ErrorDetails {
  message: string;
  action?: string;
  recoverable: boolean;
}

const ERROR_MESSAGES: Record<ErrorCode, ErrorDetails> = {
  INVALID_USER: {
    message: 'Usuário não autenticado ou sessão expirada',
    action: 'Por favor, faça login novamente',
    recoverable: true
  },
  INVALID_PLAN: {
    message: 'O plano selecionado é inválido ou não está mais disponível',
    action: 'Por favor, selecione outro plano',
    recoverable: true
  },
  SAME_PLAN: {
    message: 'Você já possui este plano',
    action: 'Escolha um plano diferente para fazer upgrade',
    recoverable: true
  },
  DOWNGRADE_NOT_ALLOWED: {
    message: 'Não é possível fazer downgrade durante um período ativo',
    action: 'Aguarde o fim do período atual para fazer downgrade',
    recoverable: false
  },
  PAYMENT_REQUIRED: {
    message: 'Erro ao processar o pagamento',
    action: 'Verifique os dados de pagamento e tente novamente',
    recoverable: true
  },
  PERMISSION_DENIED: {
    message: 'Você não tem permissão para realizar esta operação',
    action: 'Entre em contato com o suporte',
    recoverable: false
  },
  NETWORK_ERROR: {
    message: 'Erro de conexão',
    action: 'Verifique sua conexão e tente novamente',
    recoverable: true
  },
  API_ERROR: {
    message: 'Erro ao comunicar com o servidor',
    action: 'Tente novamente em alguns instantes',
    recoverable: true
  },
  DATABASE_ERROR: {
    message: 'Erro ao acessar os dados',
    action: 'Tente novamente em alguns instantes',
    recoverable: true
  },
  VALIDATION_ERROR: {
    message: 'Dados inválidos',
    action: 'Verifique os dados e tente novamente',
    recoverable: true
  },
  UNKNOWN_ERROR: {
    message: 'Ocorreu um erro inesperado',
    action: 'Tente novamente ou entre em contato com o suporte',
    recoverable: true
  }
};

function createError(code: ErrorCode, message?: string, details?: any): ValidationError {
  const error = new Error(message || ERROR_MESSAGES[code].message) as ValidationError;
  error.code = code;
  error.details = details;
  return error;
}

function logError(error: ValidationError) {
  console.error('Plan Selection Error:', {
    code: error.code,
    message: error.message,
    details: error.details,
    stack: error.stack
  });
}

function PlanSelectionModal({ isOpen, onClose, themeColor }: PlanSelectionModalProps) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ValidationError | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [planToDowngrade, setPlanToDowngrade] = useState<Plan | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // DECLARE A FUNÇÃO handlePlanSelect AQUI:
  const handlePlanSelect = async (plan: Plan) => {
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw createError('INVALID_USER', 'Erro ao obter dados do usuário', {
          supabaseError: authError
        });
      }
      if (!user) {
        throw createError('INVALID_USER', 'Usuário não autenticado');
      }
      const currentPlanData = plans.find(p => p.id === currentPlan);
      const validation = await validatePlanUpgrade(user, currentPlanData || null, plan);
      if ((validation as any).requiresDowngrade) {
        setPlanToDowngrade(plan);
        setShowDowngradeConfirm(true);
        return;
      }
      if (plan.price === 0) {
        await activateFreePlan(plan);
        return;
      }
      // Para planos pagos, exibe o modal de pagamento
      setSelectedPlan(plan);
      setShowPaymentModal(true);
    } catch (error) {
      const validationError = error as ValidationError;
      logError(validationError);
      const errorDetails = ERROR_MESSAGES[validationError.code || 'UNKNOWN_ERROR'];
      setError(createError(
        validationError.code || 'UNKNOWN_ERROR',
        `${errorDetails.message}${errorDetails.action ? `. ${errorDetails.action}` : ''}`,
        validationError.details
      ));
      if (!errorDetails.recoverable) {
        setTimeout(() => {
          onClose();
          if (validationError.code === 'INVALID_USER') {
            navigate('/');
          }
        }, 3000);
      }
    }
  };

  // As demais funções, como validatePlanUpgrade e activateFreePlan, devem estar definidas aqui...
  // (Certifique-se de que essas funções estejam presentes no seu código)

  // Exemplo (simplificado) para ativar plano gratuito:
  const activateFreePlan = async (plan: Plan) => {
    // Lógica para ativar plano gratuito
    // ...
    setShowSuccess(true);
    setCurrentPlan(plan.id);
    setCurrentSubscription({
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    setTimeout(() => {
      onClose();
      setShowSuccess(false);
    }, 2000);
  };

  // Exemplo (simplificado) para validar upgrade
  const validatePlanUpgrade = async (user: any, currentPlan: Plan | null, newPlan: Plan): Promise<any> => {
    if (!user) {
      throw createError('INVALID_USER', 'Usuário não autenticado', { userId: user?.id });
    }
    if (!newPlan) {
      throw createError('INVALID_PLAN', 'Plano inválido', { planId: newPlan?.id });
    }
    if (currentPlan?.id === newPlan.id) {
      throw createError('SAME_PLAN', 'Você já possui este plano', {
        currentPlanId: currentPlan.id,
        newPlanId: newPlan.id
      });
    }
    if (currentPlan && currentPlan.price > newPlan.price) {
      return { requiresDowngrade: true, currentPlan, newPlan };
    }
    return { requiresDowngrade: false };
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        if (!isOpen) return;
        const { data: plansData, error: plansError } = await supabase
          .from('planosxmenu')
          .select('*')
          .order('price', { ascending: true });
        if (plansError) {
          throw createError('DATABASE_ERROR', 'Erro ao carregar planos', { supabaseError: plansError });
        }
        setPlans(plansData || []);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          throw createError('INVALID_USER', 'Erro ao obter dados do usuário', { supabaseError: authError });
        }
        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(`
              id,
              plano,
              subscriptions (
                id,
                status,
                current_period_start,
                current_period_end
              )
            `)
            .eq('id', user.id)
            .maybeSingle();
          if (profileError) {
            throw createError('DATABASE_ERROR', 'Erro ao carregar dados do perfil', { supabaseError: profileError, userId: user.id });
          }
          if (profileData) {
            setCurrentPlan(profileData.plano);
            const activeSubscription = profileData.subscriptions?.find((sub: any) => sub.status === 'active');
            if (activeSubscription) {
              setCurrentSubscription(activeSubscription);
            }
          }
        }
      } catch (error) {
        const validationError = error as ValidationError;
        logError(validationError);
        const errorDetails = ERROR_MESSAGES[validationError.code || 'UNKNOWN_ERROR'];
        setError(createError(
          validationError.code || 'UNKNOWN_ERROR',
          `${errorDetails.message}${errorDetails.action ? `. ${errorDetails.action}` : ''}`,
          validationError.details
        ));
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, [isOpen, navigate]);

  const calculateAnnualPrice = (monthlyPrice: number): number => {
    const annualPrice = monthlyPrice * 12;
    const discount = annualPrice * 0.2; // Desconto de 20%
    return annualPrice - discount;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(isAnnual ? calculateAnnualPrice(price) : price) + (isAnnual ? '/ano' : '/mês');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      {/* Container com rolagem para dispositivos móveis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-auto max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Escolha seu plano
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{error.message}</div>
                {error.details && (
                  <div className="mt-1 text-sm opacity-80">
                    Detalhes técnicos: {JSON.stringify(error.details)}
                  </div>
                )}
              </div>
            </div>
          )}

          {showSuccess && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">Plano atualizado com sucesso!</div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: themeColor }}></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="col-span-full flex justify-center gap-1.5">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    !isAnnual
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Plano Mensal
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isAnnual
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Plano Anual
                  <span className="ml-1 text-xs text-green-600">20% OFF</span>
                </button>
              </div>

              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white dark:bg-gray-800 rounded-lg border-2 transition-colors ${
                    currentPlan === plan.id
                      ? 'border-blue-500 dark:border-blue-400'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {currentPlan === plan.id && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Plano Atual
                    </div>
                  )}

                  <div className="p-5">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {plan.name}
                    </h3>
                    
                    <div className="text-gray-500 dark:text-gray-400 mb-1">
                      {plan.description}
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-3xl font-bold" style={{ color: themeColor }}>
                        {formatPrice(plan.price)}
                        {isAnnual && (
                          <div className="text-sm text-gray-500 mt-1">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(plan.price * 0.8)}/mês
                          </div>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-1 mb-4">
                      {plan.features?.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"
                        >
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePlanSelect(plan)}
                      disabled={currentPlan === plan.id}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-colors ${
                        currentPlan === plan.id
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                      style={{
                        backgroundColor: currentPlan === plan.id ? '' : themeColor
                      }}
                    >
                      {currentPlan === plan.id ? 'Plano Atual' : plan.price === 0 ? 'Ativar Plano' : 'Fazer Upgrade'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {currentSubscription && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  currentSubscription.status === 'active'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                    : currentSubscription.status === 'past_due'
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                }`}>
                  {currentSubscription.status === 'active' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : currentSubscription.status === 'past_due' ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {plans.find(p => p.id === currentPlan)?.name || 'Plano Atual'}
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {currentSubscription.status === 'active'
                      ? 'Assinatura ativa'
                      : currentSubscription.status === 'past_due'
                      ? 'Pagamento pendente'
                      : 'Assinatura inativa'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Expira em {new Date(currentSubscription.current_period_end).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {showDowngradeConfirm && planToDowngrade && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Confirmar Downgrade
              </h3>
              <button
                onClick={() => {
                  setShowDowngradeConfirm(false);
                  setPlanToDowngrade(null);
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-gray-600 dark:text-gray-400 mb-6">
              Ao fazer downgrade para o plano {planToDowngrade.name}, você perderá acesso a todas as funcionalidades do seu plano atual, incluindo:
            </div>
            
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <X className="w-5 h-5" />
                Sistema de etiquetas
              </li>
              <li className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <X className="w-5 h-5" />
                Personalização avançada
              </li>
              <li className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <X className="w-5 h-5" />
                Sistema de pagamento
              </li>
              <li className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <X className="w-5 h-5" />
                Suporte Premium
              </li>
            </ul>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDowngradeConfirm(false);
                  setPlanToDowngrade(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setShowDowngradeConfirm(false);
                  if (planToDowngrade.price === 0) {
                    await activateFreePlan(planToDowngrade);
                  } else {
                    setSelectedPlan(planToDowngrade);
                    setShowPaymentModal(true);
                  }
                  setPlanToDowngrade(null);
                }}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirmar Downgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPlan && showPaymentModal && selectedPlan.price > 0 && (
        <PlanPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
          isAnnual={isAnnual}
          themeColor={themeColor}
        />
      )}
    </div>
  );
}

export default PlanSelectionModal;
