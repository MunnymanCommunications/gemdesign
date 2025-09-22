import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';

const ProRoute = () => {
  const { subscription } = useSubscription();
  const isPro = subscription?.tier === 'pro';
  const hasActiveSubscription = subscription && subscription.status === 'active';

  return isPro && hasActiveSubscription ? <Outlet /> : <Navigate to="/upgrade" replace />;
};

export default ProRoute;