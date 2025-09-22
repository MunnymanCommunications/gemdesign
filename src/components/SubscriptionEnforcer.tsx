import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionEnforcer = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { subscription, loading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSubscription = async () => {
      if (loading || !user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('has_seen_subscription_page')
        .eq('id', user.id)
        .single();

      if (!subscription && !profile?.has_seen_subscription_page) {
        if (location.pathname !== '/subscription') {
          navigate('/subscription');
          await supabase
            .from('profiles')
            .update({ has_seen_subscription_page: true })
            .eq('id', user.id);
        }
      }
    };

    checkSubscription();
  }, [user, subscription, loading, navigate, location.pathname]);

  return <>{children}</>;
};

export default SubscriptionEnforcer;