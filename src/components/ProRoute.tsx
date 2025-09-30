import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';

const ProRoute = () => {
  const { subscription, loading: subLoading } = useSubscription();
  const { isAdmin, isModerator, loading: rolesLoading } = useRoles();
  
  if (subLoading || rolesLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  const isProOrEnterprise = subscription?.tier === 'pro' || subscription?.tier === 'enterprise';
  const isGrantedProOrHigher = subscription?.id === 'granted-access' && (subscription?.tier === 'pro' || subscription?.tier === 'enterprise');
  const hasProSubscription = subscription && (subscription.status === 'active' || subscription.status === 'trialing') && isProOrEnterprise;
  const hasAdminOrModAccess = isAdmin || isModerator;
  
  const hasAccess = hasProSubscription || isGrantedProOrHigher || hasAdminOrModAccess;
  
  return hasAccess ? <Outlet /> : <Navigate to="/subscription" replace />;
};

export default ProRoute;