import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { StoreProfile, StoreState } from '../types/store';

export const useStore = (storeName: string | undefined) => {
  const [state, setState] = useState<StoreState>({
    isLoading: true,
    error: null,
    storeProfile: null,
    products: [],
    featuredProducts: [],
    categories: [],
    priceRangeLimits: [0, 0],
    allowCart: false,
    showFeatured: false,
    planName: ''
  });

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        if (!storeName) {
          throw new Error('Nome da loja não fornecido');
        }

        // Fetch store profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('store_name', storeName)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData) {
          throw new Error('Loja não encontrada');
        }

        // Update meta tags
        updateMetaTags(profileData);

        // Get plan features and name
        const { planName, allowCart } = await fetchPlanDetails(profileData.plano);

        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        // Calculate price range and featured products
        const priceRangeLimits = calculatePriceRangeLimits(productsData || []);
        const featuredProducts = (productsData || []).filter(p => 
          p.tags?.includes('exclusivo') && p.quantity > 0
        );

        // Get unique categories
        const categories = Array.from(new Set(productsData
          ?.map(product => product.category)
          .filter((category): category is string => !!category)
        ));

        setState({
          isLoading: false,
          error: null,
          storeProfile: profileData,
          products: productsData || [],
          featuredProducts,
          categories,
          priceRangeLimits,
          allowCart,
          showFeatured: planName !== 'Básico',
          planName
        });

      } catch (error) {
        console.error('Error fetching store data:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Erro ao carregar dados da loja'
        }));
      }
    };

    fetchStoreData();
  }, [storeName]);

  return state;
};

// Helper functions
const updateMetaTags = (profileData: StoreProfile) => {
  const title = `${profileData.store_name} - XMenu`;
  const description = `Confira nosso catálogo digital e faça seu pedido online!`;
  
  document.title = title;
  
  const metaTags = {
    'og:title': title,
    'og:description': description,
    'og:image': profileData.logo_url || 'https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/store-3d.png',
    'og:url': window.location.href
  };
  
  Object.entries(metaTags).forEach(([property, content]) => {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  });
};

const fetchPlanDetails = async (planId: string | undefined) => {
  if (!planId) return { planName: 'Básico', allowCart: false };

  const { data: planData, error: planError } = await supabase
    .from('planosxmenu')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  if (planError) {
    console.error('Error fetching plan data:', planError);
    return { planName: 'Básico', allowCart: false };
  }

  const { data: planFeatures } = await supabase
    .from('plan_features')
    .select('*')
    .eq('plan_id', planId)
    .maybeSingle();

  return {
    planName: planData?.name || 'Básico',
    allowCart: planFeatures?.allow_cart || false
  };
};

const calculatePriceRangeLimits = (products: Product[]): [number, number] => {
  if (products.length === 0) return [0, 0];
  const prices = products.map(p => p.price);
  return [Math.min(...prices), Math.max(...prices)];
};