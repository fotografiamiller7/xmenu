import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCustomersData } from './useCustomersData';
import { useOrderStats } from './useOrderStats';
import type { Order } from '../../../lib/types';
import type { TopSellingProduct } from '../types';

type SortField = 'created_at' | 'total_amount';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export function useOrdersData(storeName: string | undefined) {
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [topSellingProducts, setTopSellingProducts] = useState<TopSellingProduct[]>([]);

  const { customers, setCustomers } = useCustomersData();
  const { orderStats, setOrderStats } = useOrderStats();

  const fetchTopSellingProducts = useCallback(async (userId: string) => {
    try {
      // Fetch all orders for this store
      const { data: ordersData, error: ordersError } = await supabase
        .from('pedidosxmenu')
        .select('produtos')
        .eq('store_id', userId);

      if (ordersError) throw ordersError;

      // Process orders to extract product sales data
      const productSales: Record<string, { 
        id: string;
        name: string;
        category: string | null;
        quantity: number;
        total_value: number;
        image_url: string | null;
      }> = {};

      // Iterate through all orders
      ordersData?.forEach(order => {
        // Iterate through products in each order
        if (order.produtos && Array.isArray(order.produtos)) {
          order.produtos.forEach((product: any) => {
            const productId = product.id;
            
            if (!productSales[productId]) {
              productSales[productId] = {
                id: productId,
                name: product.name,
                category: product.category || null,
                quantity: 0,
                total_value: 0,
                image_url: product.image_url || null
              };
            }
            
            // Add the quantity and value from this order
            productSales[productId].quantity += product.quantity;
            productSales[productId].total_value += product.price * product.quantity;
          });
        }
      });

      // Convert to array and sort by quantity sold (descending)
      const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10); // Get top 10

      setTopSellingProducts(sortedProducts);
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      // Don't set an error state here to avoid breaking the main functionality
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Get user's profile first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch orders for this store
      const { data: ordersData, error: ordersError } = await supabase
        .from('pedidosxmenu')
        .select('*')
        .eq('store_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch top selling products
      await fetchTopSellingProducts(user.id);

      // Calculate order statistics
      const stats = ordersData?.reduce((acc, order) => ({
        totalOrders: acc.totalOrders + 1,
        pendingOrders: acc.pendingOrders + (order.delivery_status === 'entrega_pendente' ? 1 : 0),
        deliveredOrders: acc.deliveredOrders + (order.delivery_status === 'entregue' ? 1 : 0),
        totalProducts: acc.totalProducts + order.produtos.reduce((sum: number, produto: any) => 
          sum + produto.quantity, 0),
        totalRevenue: acc.totalRevenue + Number(order.total_amount)
      }), {
        pendingOrders: 0,
        deliveredOrders: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalRevenue: 0
      });

      setOrderStats(stats || {
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        totalProducts: 0,
        totalRevenue: 0
      });

      // Fetch unique customers from orders
      const { data: customersData, error: customersError } = await supabase
        .from('pedidosxmenu')
        .select('customer_name, customer_email, customer_cpf, customer_phone')
        .eq('store_id', user.id)
        .order('customer_name', { ascending: true });

      if (customersError) throw customersError;

      // Process customers data to get unique customers with order count
      const uniqueCustomers = new Map();
      
      customersData?.forEach(order => {
        const key = order.customer_cpf;
        
        if (uniqueCustomers.has(key)) {
          const customer = uniqueCustomers.get(key);
          customer.orders_count += 1;
          
          if (customer.name !== order.customer_name || customer.email !== order.customer_email) {
            customer.name = order.customer_name;
            customer.email = order.customer_email;
          }
        } else {
          uniqueCustomers.set(key, {
            name: order.customer_name,
            email: order.customer_email,
            cpf: order.customer_cpf,
            phone: order.customer_phone || 'Não informado',
            orders_count: 1
          });
        }
      });
      
      setCustomers(Array.from(uniqueCustomers.values()));

    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar pedidos');
    } finally {
      setIsLoading(false);
    }
  }, [fetchTopSellingProducts]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filterOrders = useCallback((orders: Order[]): Order[] => {
    if (!searchTerm.trim()) return orders;
    
    const term = searchTerm.toLowerCase().trim();
    return orders.filter(order => 
      order.customer_name.toLowerCase().includes(term) ||
      order.customer_email.toLowerCase().includes(term) ||
      order.produtos.some(produto => 
        produto.name.toLowerCase().includes(term)
      )
    );
  }, [searchTerm]);

  const sortOrders = useCallback((orders: Order[]): Order[] => {
    return [...orders].sort((a, b) => {
      if (sortField === 'created_at') {
        return sortDirection === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      // total_amount
      return sortDirection === 'desc'
        ? b.total_amount - a.total_amount
        : a.total_amount - b.total_amount;
    });
  }, [sortField, sortDirection]);

  const filteredOrders = filterOrders(orders);
  const sortedOrders = sortOrders(filteredOrders);
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  
  const paginatedOrders = useCallback((): Order[] => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedOrders, currentPage]);

  return {
    profile,
    orders: {
      data: orders,
      filteredData: filteredOrders,
      paginatedData: paginatedOrders(),
      totalPages,
      currentPage,
      setCurrentPage,
      sortField,
      setSortField,
      sortDirection,
      setSortDirection,
      searchTerm,
      setSearchTerm
    },
    customers,
    orderStats,
    isLoading,
    error,
    refreshOrders: fetchOrders,
    topSellingProducts
  };
}