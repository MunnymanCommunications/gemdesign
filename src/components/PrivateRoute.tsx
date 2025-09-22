import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  const { subscription } = useSubscription();
  const hasActiveSubscription = subscription && subscription.status === 'active';

  return hasActiveSubscription ? <Outlet /> : <Navigate to="/subscription" replace />;
};

export default PrivateRoute;