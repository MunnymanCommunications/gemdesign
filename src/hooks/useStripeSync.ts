import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';

export const useStripeSync = () => {
  const { refetch } = useSubscription();

  useEffect(() => {
    const syncSubscriptionStatus = async () => {
      console.log('useStripeSync: Starting syncSubscriptionStatus');
      try {
        // Call a function to sync Stripe subscription status
        console.log('useStripeSync: Invoking sync-subscription-status function');
        const result = await supabase.functions.invoke('sync-subscription-status');
        console.log('useStripeSync: Function invoke result:', result);
        // Refetch subscription data after sync
        console.log('useStripeSync: Calling refetch');
        refetch();
        console.log('useStripeSync: Refetch completed');
      } catch (error) {
        console.error('useStripeSync: Error syncing subscription:', error);
        console.error('useStripeSync: Error details:', {
          message: error.message,
          code: error.code,
          status: error.status
        });
      }
    };

    // Sync on mount and periodically
    console.log('useStripeSync: Initial sync call');
    syncSubscriptionStatus();
    const interval = setInterval(() => {
      console.log('useStripeSync: Interval sync call');
      syncSubscriptionStatus();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [refetch]);
};