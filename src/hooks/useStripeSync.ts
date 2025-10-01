import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';

export const useStripeSync = () => {
  // Now handled in useSubscription hook
  // This hook is deprecated but kept for compatibility
};