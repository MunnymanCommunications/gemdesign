import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Subscription {
  effective_tier: string;
  max_documents: number;
  is_active: boolean;
  source: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
  
    setLoading(true);
    try {
      console.log('useSubscription: Invoking sync-subscription-status for fetch');
      const result = await supabase.functions.invoke('sync-subscription-status');
      console.log('useSubscription: Function invoke result:', result);
  
      if (result.error) {
        setError(result.error.message);
        setSubscription(null);
      } else if (result.data && result.data.subscription) {
        setSubscription(result.data.subscription);
      } else {
        // No active subscription, create a free one
        const { data: freeSub, error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            tier: 'free',
            max_documents: 2,
            status: 'active',
            source: 'free'
          })
          .select('*')
          .single();
  
        if (createError) {
          setError(createError.message);
          setSubscription(null);
        } else {
          // Refetch using edge function to get computed values
          const newResult = await supabase.functions.invoke('sync-subscription-status');
          if (newResult.error) {
            setError(newResult.error.message);
            setSubscription(null);
          } else if (newResult.data && newResult.data.subscription) {
            setSubscription(newResult.data.subscription);
          } else {
            setSubscription(null);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  
    // Periodic sync
    const interval = setInterval(() => {
      console.log('useSubscription: Interval sync call');
      fetchSubscription();
    }, 60000); // Every minute
  
    return () => clearInterval(interval);
  }, [fetchSubscription]);

  const effectiveTier = subscription?.effective_tier;
  const isPro = effectiveTier === 'pro';
  const isEnterprise = effectiveTier === 'enterprise';
  const isProOrHigher = isPro || isEnterprise;
  const isActive = subscription?.is_active;
  const tier = effectiveTier;

  return {
    subscription,
    loading,
    error,
    isPro,
    isEnterprise,
    isProOrHigher,
    isActive,
    tier,
    refetch: fetchSubscription
  };
};