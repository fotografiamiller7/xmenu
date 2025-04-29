import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserProducts } from '../lib/products';
import type { Profile } from '../types/profile';
import type { Product } from '../types/products';

export function useDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get session data
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const session = sessionData.session;
        if (!session) {
          throw new Error('No active session');
        }

        // Get user data
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('User not found');
        
        // Get profile data with plan information
        const { data: userProfileData, error: userProfileError } = await supabase
          .from('profiles')
          .select(`
            *,
            planosxmenu (
              id,
              name,
              price,
              description,
              features
            ),
            subscriptions (
              id,
              status,
              plan_id,
              current_period_start,
              current_period_end,
              period_type
            )
          `)
          .eq('id', user.id)
          .single();

        if (userProfileError) throw userProfileError;
        if (!userProfileData) {
          throw new Error('Profile information is incomplete');
        }

        // Check if the user has an active subscription
        let actualPlan = userProfileData.planosxmenu;
        
        // If the user has subscriptions, find the active one
        const activeSubscription = userProfileData.subscriptions?.find(
          (sub: any) => sub.status === 'active'
        );
        
        // If there's an active subscription, fetch its plan details
        if (activeSubscription) {
          const { data: planData, error: planError } = await supabase
            .from('planosxmenu')
            .select('*')
            .eq('id', activeSubscription.plan_id)
            .single();
            
          if (!planError && planData) {
            actualPlan = planData;
            
            // Update the profile's planosxmenu with the correct plan data
            userProfileData.planosxmenu = planData;
          }
        }

        setProfile(userProfileData);

        // Get user's products
        try {
          const userProducts = await getUserProducts(user.id);
          setProducts(userProducts);
        } catch (productsError) {
          console.error('Error fetching products:', productsError);
          throw new Error('Erro ao carregar produtos');
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard');
        await supabase.auth.signOut();
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleViewStore = () => {
    if (profile?.store_name) {
      navigate(`/store/${encodeURIComponent(profile.store_name)}`);
    }
  };

  const handleViewOrders = () => {
    if (profile?.store_name) {
      navigate(`/dashboard/pedidos/${encodeURIComponent(profile.store_name)}`);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch profile with plan information
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          planosxmenu (
            id,
            name,
            price,
            description,
            features
          ),
          subscriptions (
            id, 
            status,
            plan_id,
            current_period_start,
            current_period_end,
            period_type
          )
        `)
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      
      // Check if the user has an active subscription
      let actualPlan = profileData.planosxmenu;
      
      // If the user has subscriptions, find the active one
      const activeSubscription = profileData.subscriptions?.find(
        (sub: any) => sub.status === 'active'
      );
      
      // If there's an active subscription, fetch its plan details
      if (activeSubscription) {
        const { data: planData, error: planError } = await supabase
          .from('planosxmenu')
          .select('*')
          .eq('id', activeSubscription.plan_id)
          .single();
          
        if (!planError && planData) {
          actualPlan = planData;
          
          // Update the profile's planosxmenu with the correct plan data
          profileData.planosxmenu = planData;
        }
      }

      setProfile(profileData);

      // Reload products after profile update
      const userProducts = await getUserProducts(session.user.id);
      setProducts(userProducts);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  return {
    profile,
    products,
    isLoading,
    error,
    handleLogout,
    handleViewStore,
    handleViewOrders,
    handleProfileUpdate,
    setProducts
  };
}