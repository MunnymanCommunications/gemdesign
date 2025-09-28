import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';

export const useStripeSync = () => {
  const { refetch } = useSubscription();

  useEffect(() => {
    const syncSubscriptionStatus = async () => {
      try {
        // Call a function to sync Stripe subscription status
        await supabase.functions.invoke('sync-subscription-status');
        // Refetch subscription data after sync
        refetch();
      } catch (error) {
        console.error('Error syncing subscription:', error);
      }
    };

    // Sync on mount and periodically
    syncSubscriptionStatus();
    const interval = setInterval(syncSubscriptionStatus, 60000); // Every minute

    return () => clearInterval(interval);
  }, [refetch]);
};