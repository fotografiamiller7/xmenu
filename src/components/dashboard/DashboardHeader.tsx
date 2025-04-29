import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Settings, UserCog, ShoppingBag, Palette, CreditCard, LogOut } from 'lucide-react';
import type { DashboardHeaderProps } from '../../types/dashboard';

export function DashboardHeader({
  profile,
  onViewStore,
  onViewOrders,
  onCustomize,
  onPlanSelect,
  onLogout
}: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="pt-2 pb-6 border-b border-gray-200">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bem-vindo {profile?.store_name}!
        </h1>
        <p className="text-gray-600 text-lg">
          Olá {profile?.name?.split(' ')[0]}, aqui você gerencia seu catálogo, pedidos e configurações do sistema.
        </p>
        <div className="grid grid-cols-5 gap-2 mt-5 w-full">
          <button
            onClick={onViewStore}
            className="flex flex-col items-center justify-center gap-2 p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[30px]"
          >
            <Store className="w-5 h-5" />
            <span className="text-sm hidden sm:block">Ver Loja</span>
          </button>
          
          {profile?.email === 'admin@admin.com' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex flex-col items-center justify-center gap-2 p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[30px]"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm hidden sm:block">Administração</span>
            </button>
          )}

          <button
            onClick={onViewOrders}
            className="flex flex-col items-center justify-center gap-2 p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[30px]"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm hidden sm:block">Pedidos</span>
          </button>

          <button
            onClick={onCustomize}
            className="flex flex-col items-center justify-center gap-2 p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[30px]"
          >
            <Palette className="w-5 h-5" />
            <span className="text-sm hidden sm:block">Personalização</span>
          </button>

          <button
            onClick={onPlanSelect}
            className="flex flex-col items-center justify-center gap-2 p-4 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-h-[80px]"
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-sm hidden sm:block">Meu Plano</span>
          </button>
        </div>
      </div>
    </div>
  );
}