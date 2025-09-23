import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';

const PrivateRoute = () => {
  const { subscription, loading: subLoading } = useSubscription();
  const { isAdmin } = useRoles();

  if (subLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (isAdmin) {
    return <Outlet />;
  }

  const hasActiveSubscription = subscription && subscription.status === 'active';
  return hasActiveSubscription ? <Outlet /> : <Navigate to="/subscription" replace />;
};

export default PrivateRoute;