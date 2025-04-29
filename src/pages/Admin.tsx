import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { supabase } from '../lib/supabase';
import PlanModal from '../components/PlanModal';
import CustomerDetailsModal from '../components/CustomerDetailsModal';
import {
  Users,
  CreditCard,
  BarChart3,
  Package,
  Settings,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  UserPlus,
  ShoppingBag
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Admin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'customers' | 'metrics'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({
    totalCustomers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    canceledSubscriptions: 0
  });

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // Get session data
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const session = sessionData.session;
        if (!session) {
          navigate('/');
          return;
        }

        // Check if user is admin using profiles table only
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile data:', profileError);
          throw new Error('Erro ao verificar permissões de administrador');
        }

        if (!profileData || profileData.email !== 'admin@admin.com') {
          console.error('User is not admin:', profileData);
          navigate('/dashboard');
          return;
        }

        // Fetch initial data
        await Promise.all([
          fetchPlans(),
          fetchCustomers(),
          fetchMetrics()
        ]);

      } catch (error) {
        console.error('Admin check error:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('planosxmenu')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchCustomers = async () => {
  try {
    // Query profiles table directly with all necessary fields, excluindo o admin
    const { data: customersData, error: customersError } = await supabase
      .from('profiles') 
      .select(`
        id, 
        name, 
        email, 
        cpf, 
        store_name,
        telefone,
        endereco,
        instagram,
        created_at,
        planosxmenu (
          id,
          name,
          price
        ),
        subscriptions (
          id,
          status,
          current_period_start,
          current_period_end
        )
      `)
      .neq('email', 'admin@admin.com') // Exclui o admin da listagem
      .order('created_at', { ascending: false });

    if (customersError) throw customersError;

    setCustomers(customersData || []);

  } catch (error) {
    console.error('Error fetching customers:', error);
  }
};


  const fetchMetrics = async () => {
    try {
      // Get user growth data for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: userGrowth, error: growthError } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (growthError) throw growthError;

      // Get monthly revenue data
      const { data: revenueHistory, error: revenueError } = await supabase
        .from('subscription_payments')
        .select('amount, created_at, period_type')
        .eq('status', 'approved')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (revenueError) throw revenueError;

      // Process growth data
      const monthlyGrowth = new Map();
      userGrowth?.forEach(user => {
        const month = new Date(user.created_at).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
        monthlyGrowth.set(month, (monthlyGrowth.get(month) || 0) + 1);
      });

      // Process revenue data
      const monthlyRevenue = new Map();
      revenueHistory?.forEach(payment => {
        const month = new Date(payment.created_at).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
        const amount = payment.period_type === 'annual' 
          ? payment.amount / 12 // Divide annual payments by 12 for monthly revenue
          : payment.amount;
        monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + amount);
      });

      // Fill in missing months
      const months = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
        months.unshift(month);
        if (!monthlyGrowth.has(month)) monthlyGrowth.set(month, 0);
        if (!monthlyRevenue.has(month)) monthlyRevenue.set(month, 0);
      }

      // Set chart data
      setGrowthData({
        labels: months,
        datasets: [{
          label: 'Novos Usuários',
          data: months.map(month => monthlyGrowth.get(month)),
          borderColor: '#0061FF',
          backgroundColor: '#0061FF20',
          fill: true,
          tension: 0.4
        }]
      });

      setRevenueData({
        labels: months,
        datasets: [{
          label: 'Receita Mensal',
          data: months.map(month => monthlyRevenue.get(month)),
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 1
        }]
      });
      const { count: customersCount, error: profileCountError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
      if (profileCountError) throw profileCountError;

      // Get monthly revenue from subscription_payments
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Get all approved payments for the current month
      const { data: monthlyPayments, error: paymentsError } = await supabase
        .from('subscription_payments')
        .select('amount, period_type')
        .gte('created_at', startOfMonth.toISOString())
        .eq('status', 'approved');

      if (paymentsError) throw paymentsError;

      // Calculate current month's revenue
      const currentMonthRevenue = monthlyPayments?.reduce((sum, payment) => {
        const amount = payment.amount || 0;
        // For annual payments, divide by 12 to get monthly value
        return sum + (payment.period_type === 'annual' ? amount / 12 : amount);
      }, 0) || 0;

      // Get active subscriptions grouped by user
      const { data: activeSubscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          user_id,
          plan_id,
          planosxmenu!inner (
            name,
            price
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // Get unique active users and their plans
      const uniqueActiveUsers = new Set();
      const activePlans = new Map();

      activeSubscriptions?.forEach(sub => {
        if (!uniqueActiveUsers.has(sub.user_id)) {
          uniqueActiveUsers.add(sub.user_id);
          activePlans.set(sub.planosxmenu.name, (activePlans.get(sub.planosxmenu.name) || 0) + 1);
        }
      });

      // Get canceled subscriptions
      const { data: canceledSubscriptions, error: canceledError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('status', 'canceled');

      if (canceledError) throw canceledError;

      setMetrics({
        totalCustomers: customersCount || 0,
        totalRevenue: currentMonthRevenue,
        activeSubscriptions: uniqueActiveUsers.size,
        canceledSubscriptions: canceledSubscriptions?.length || 0,
        activePlanBreakdown: Object.fromEntries(activePlans)
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  // Update metrics every minute
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
  };

  const handleClosePlanModal = () => {
    setShowPlanModal(false);
    setSelectedPlan(null);
  };

  const handleCustomerUpdate = async () => {
    await Promise.all([
      fetchCustomers(),
      fetchMetrics()
    ]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button
              onClick={handleLogout}
              className="mt-4 px-4 py-2 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Log out and try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold">Admin Panel</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">
                Total de Clientes
              </h3>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {metrics.totalCustomers}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              clientes registrados
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">
                Faturamento Mensal
              </h3>
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(metrics.totalRevenue)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              em assinaturas ativas
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">
                Assinaturas Ativas
              </h3>
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {metrics.activeSubscriptions}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              clientes ativos
            </p>
            {metrics.activePlanBreakdown && Object.entries(metrics.activePlanBreakdown).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Distribuição por plano:</p>
                {Object.entries(metrics.activePlanBreakdown).map(([plan, count]) => (
                  <div key={plan} className="flex justify-between text-xs">
                    <span className="text-gray-600">{plan}</span>
                    <span className="font-medium text-purple-600">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">
                Assinaturas Canceladas
              </h3>
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-red-600">
              {metrics.canceledSubscriptions}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              assinaturas canceladas
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('plans')}
                className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm ${
                  activeTab === 'plans'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="w-5 h-5" />
                Planos
              </button>
              
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm ${
                  activeTab === 'customers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-5 h-5" />
                Clientes
              </button>
              
              <button
                onClick={() => setActiveTab('metrics')}
                className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm ${
                  activeTab === 'metrics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                Métricas
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'plans' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Planos Disponíveis
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPlanModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Novo Plano
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                    >
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-gray-500 mb-4">
                          {plan.description}
                        </p>
                        <p className="text-3xl font-bold text-blue-600 mb-6">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(plan.price)}
                          <span className="text-sm font-normal text-gray-500">
                            /mês
                          </span>
                        </p>

                        <ul className="space-y-3 mb-6">
                          {plan.features?.map((feature: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-center gap-2 text-gray-600"
                            >
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPlan(plan)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                // First check if plan can be deleted
                                const { data: canDelete, error: checkError } = await supabase
                                  .rpc('can_delete_plan', {
                                    plan_id: plan.id
                                  });

                                if (checkError) {
                                  console.error('Error checking plan:', checkError);
                                  alert('Erro ao verificar status do plano');
                                  return;
                                }

                                if (!canDelete) {
                                  alert('Não é possível excluir um plano que possui assinaturas ativas');
                                  return;
                                }

                                // If plan can be deleted, proceed with deletion
                                const { error: deleteError } = await supabase
                                  .from('planosxmenu')
                                  .delete()
                                  .eq('id', plan.id);

                                if (deleteError) {
                                  console.error('Error deleting plan:', deleteError);
                                  alert('Erro ao excluir plano');
                                  return;
                                }

                                // Refresh plans list
                                fetchPlans();
                              } catch (error) {
                                console.error('Error deleting plan:', error);
                                alert('Erro ao excluir plano. Por favor, tente novamente.');
                              }
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Lista de Clientes
                  </h2>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    Novo Cliente
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customers.map((customer) => (
                        <tr key={customer.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {customer.store_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {customer.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <span className="font-medium text-gray-900">
                                {customer.planosxmenu?.name || 'Sem plano'}
                              </span>
                              {customer.planosxmenu?.price > 0 && (
                                <p className="text-xs text-gray-500">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(customer.planosxmenu.price)}/mês
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {customer.subscriptions?.[0]?.status === 'active' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Ativo
                              </span>
                            ) : customer.subscriptions?.[0]?.status === 'canceled' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Cancelado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Sem assinatura
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customer.planosxmenu?.price ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(customer.planosxmenu.price) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedCustomer(customer)}
                              className="text-blue-600 hover:text-blue-900">
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'metrics' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Métricas do Sistema
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Growth Chart */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Crescimento de Usuários
                      </h3>
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="h-64">
                      {growthData && (
                        <Line
                          data={growthData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  stepSize: 1
                                }
                              }
                            },
                            plugins: {
                              legend: {
                                display: false
                              }
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Revenue Chart */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Receita Mensal
                      </h3>
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    
                    <div className="h-64">
                      {revenueData && (
                        <Bar
                          data={revenueData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: (value) => {
                                    return new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL'
                                    }).format(value as number);
                                  }
                                }
                              }
                            },
                            plugins: {
                              legend: {
                                display: false
                              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    return new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(context.raw as number);
                  }
                }
              }
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <PlanModal
        isOpen={showPlanModal}
        onClose={handleClosePlanModal}
        initialData={selectedPlan}
        onSuccess={fetchPlans}
      />
      
      {selectedCustomer && (
        <CustomerDetailsModal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
          onUpdate={handleCustomerUpdate}
        />
      )}
    </div>
  );
}