import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';

const PrivateRoute = () => {
  const { subscription, loading: subLoading } = useSubscription();
  const { isAdmin, isModerator, loading: rolesLoading } = useRoles();

  console.log('PrivateRoute - subscription:', subscription);
  console.log('PrivateRoute - subLoading:', subLoading);
  console.log('PrivateRoute - rolesLoading:', rolesLoading);
  console.log('PrivateRoute - isAdmin:', isAdmin);
  console.log('PrivateRoute - isModerator:', isModerator);

  if (subLoading || rolesLoading) {
    console.log('PrivateRoute - Returning loading...');
    return <div>Loading...</div>; // Or a spinner component
  }

  const hasAdminOrModAccess = isAdmin || isModerator;
  if (hasAdminOrModAccess) {
    console.log('PrivateRoute - Admin/Mod access granted');
    return <Outlet />;
  }

  const hasActiveSubscription = subscription && subscription.is_active;
  console.log('PrivateRoute - hasActiveSubscription:', hasActiveSubscription);
  return hasActiveSubscription ? <Outlet /> : <Navigate to="/subscription" replace />;
};

export default PrivateRoute;