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
      const { data, error } = await supabase.rpc('get_user_subscription_status', {
        p_user_id: user.id
      });

      if (error) {
        setError(error.message);
        setSubscription(null);
      } else if (data) {
        setSubscription(data);
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
          // Refetch RPC to get computed values
          const { data: newData, error: rpcError } = await supabase.rpc('get_user_subscription_status', {
            p_user_id: user.id
          });

          if (rpcError) {
            setError(rpcError.message);
            setSubscription(null);
          } else {
            setSubscription(newData);
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