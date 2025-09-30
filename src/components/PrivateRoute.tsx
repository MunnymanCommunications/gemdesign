import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';

const PrivateRoute = () => {
  const { subscription, loading: subLoading } = useSubscription();
  const { isAdmin, isModerator, loading: rolesLoading } = useRoles();

  if (subLoading || rolesLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  const hasAdminOrModAccess = isAdmin || isModerator;
  if (hasAdminOrModAccess) {
    return <Outlet />;
  }

  const hasActiveSubscription = subscription && (subscription.status === 'active' || subscription.status === 'trialing');
  return hasActiveSubscription ? <Outlet /> : <Navigate to="/subscription" replace />;
};

export default PrivateRoute;