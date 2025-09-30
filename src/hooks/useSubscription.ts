import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Subscription {
  id: string;
  tier: string;
  max_documents: number;
  created_at: string;
  updated_at: string;
  status: string;
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
          })
          .select('*')
          .single();

        if (createError) {
          setError(createError.message);
          setSubscription(null);
        } else {
          setSubscription(freeSub);
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

  const isPro = subscription?.tier === 'pro';
  const isEnterprise = subscription?.tier === 'enterprise';
  const isProOrHigher = isPro || isEnterprise;
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const tier = subscription?.tier;

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