import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Subscription {
  id: string;
  tier: string;
  max_documents: number;
  created_at: string;
  updated_at: string;
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
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          setError(error.message);
          setSubscription(null);
        } else if (data) {
          setSubscription(data);
        } else {
          // No subscription found, create base subscription
          const { data: newSub, error: createError } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: user.id,
              tier: 'base',
              max_documents: 1
            })
            .select('*')
            .single();

          if (createError) {
            setError(createError.message);
            setSubscription(null);
          } else {
            setSubscription(newSub);
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