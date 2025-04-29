import { useState } from 'react';

interface OrderStats {
  pendingOrders: number;
  deliveredOrders: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
}

export function useOrderStats() {
  const [orderStats, setOrderStats] = useState<OrderStats>({
    pendingOrders: 0,
    deliveredOrders: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0
  });

  return {
    orderStats,
    setOrderStats
  };
}