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
    console.log('useSubscription - fetch starting, user:', user); // Debug log
    if (!user) {
      console.log('useSubscription - no user, setting null'); // Debug log
      setSubscription(null);
      setLoading(false);
      return;
    }
  
    setLoading(true);
    try {
      // Check for granted access first
      const { data: profile } = await supabase
        .from('profiles')
        .select('granted_tier')
        .eq('id', user.id)
        .single();
      
      console.log('useSubscription - profile granted_tier:', profile?.granted_tier); // Debug log
  
      if (profile?.granted_tier && profile.granted_tier !== 'free') {
        const grantedSub = {
          id: 'granted-access',
          tier: profile.granted_tier,
          max_documents: profile.granted_tier === 'pro' ? 50 : 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
        };
        console.log('useSubscription - setting granted sub:', grantedSub); // Debug log
        setSubscription(grantedSub);
        setLoading(false);
        return;
      }
  
      // If no granted access, check for a real subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['trialing', 'active'])
        .maybeSingle();
      
      console.log('useSubscription - sub data:', data, 'error:', error); // Debug log
  
      if (error) {
        console.log('useSubscription - sub error, setting null'); // Debug log
        setError(error.message);
        setSubscription(null);
      } else if (data) {
        console.log('useSubscription - setting real sub:', data); // Debug log
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
        
        console.log('useSubscription - free sub:', freeSub, 'create error:', createError); // Debug log
  
        if (createError) {
          console.log('useSubscription - create error, setting null'); // Debug log
          setError(createError.message);
          setSubscription(null);
        } else {
          console.log('useSubscription - setting free sub:', freeSub); // Debug log
          setSubscription(freeSub);
        }
      }
    } catch (err) {
      console.log('useSubscription - catch error:', err); // Debug log
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSubscription(null);
    } finally {
      console.log('useSubscription - finally, loading false'); // Debug log
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