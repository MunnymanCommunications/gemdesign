import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';

const PrivateRoute = () => {
  const { subscription } = useSubscription();
  const { isAdmin } = useRoles();
  const hasActiveSubscription = subscription && subscription.status === 'active';

  if (isAdmin) {
    return <Outlet />;
  }

  return hasActiveSubscription ? <Outlet /> : <Navigate to="/subscription" replace />;
};

export default PrivateRoute;