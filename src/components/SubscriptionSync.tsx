import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const SubscriptionSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Invalidate subscription queries to refetch
          queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
        }
      } catch (error) {
        console.error('Subscription sync error:', error);
      }
    };

    // Sync on mount and periodically
    syncSubscription();
    const interval = setInterval(syncSubscription, 60000); // Every minute

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
};