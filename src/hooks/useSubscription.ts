import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Check for free access first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('has_free_access')
          .eq('id', user.id)
          .single();

        if (profile?.has_free_access) {
          setSubscription({
            id: 'free-access',
            tier: 'pro',
            max_documents: 999,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'active',
            stripe_customer_id: null,
            stripe_subscription_id: null,
          });
          setLoading(false);
          return;
        }

        // If no free access, check for a real subscription
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['trialing', 'active'])
          .maybeSingle();

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
    };

    fetchSubscription();
  }, [user?.id]);

  const isPro = subscription?.tier === 'pro';
  const isEnterprise = subscription?.tier === 'enterprise';
  const isProOrHigher = isPro || isEnterprise;

  return { 
    subscription, 
    loading, 
    error, 
    isPro, 
    isEnterprise, 
    isProOrHigher 
  };
};