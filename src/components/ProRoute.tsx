import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';

const ProRoute = () => {
  const { subscription, loading: subLoading } = useSubscription();
  const { isAdmin, isModerator, loading: rolesLoading } = useRoles();
  
  console.log('ProRoute - subscription:', subscription);
  console.log('ProRoute - subLoading:', subLoading);
  console.log('ProRoute - rolesLoading:', rolesLoading);
  console.log('ProRoute - isAdmin:', isAdmin);
  console.log('ProRoute - isModerator:', isModerator);

  if (subLoading || rolesLoading) {
    console.log('ProRoute - Returning loading...');
    return <div>Loading...</div>; // Or a spinner component
  }

  const isProOrEnterprise = subscription?.effective_tier === 'pro' || subscription?.effective_tier === 'enterprise';
  const hasProSubscription = subscription && subscription.is_active && isProOrEnterprise;
  const hasAdminOrModAccess = isAdmin || isModerator;
  
  const hasAccess = hasProSubscription || hasAdminOrModAccess;
  console.log('ProRoute - isProOrEnterprise:', isProOrEnterprise);
  console.log('ProRoute - hasProSubscription:', hasProSubscription);
  console.log('ProRoute - hasAdminOrModAccess:', hasAdminOrModAccess);
  console.log('ProRoute - hasAccess:', hasAccess);
  
  return hasAccess ? <Outlet /> : <Navigate to="/subscription" replace />;
};

export default ProRoute;