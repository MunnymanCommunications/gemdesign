import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';

const ProRoute = () => {
  const { subscription, loading } = useSubscription();
  
  if (loading) {
    return <div>Loading subscription...</div>; // Or a spinner component
  }

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'enterprise';
  const isGrantedPro = subscription?.id === 'granted-access' && subscription?.tier === 'pro';
  const hasActiveSubscription = subscription && (subscription.status === 'active' || subscription.status === 'trialing');
  const hasAccess = isPro || isGrantedPro || hasActiveSubscription;

  return hasAccess ? <Outlet /> : <Navigate to="/subscription" replace />;
};

export default ProRoute;