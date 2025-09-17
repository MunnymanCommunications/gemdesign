import { useSubscription } from '@/hooks/useSubscription';
import { Navigate, Outlet } from 'react-router-dom';

const ProRoute = () => {
  const { isPro } = useSubscription();
  return isPro ? <Outlet /> : <Navigate to="/subscription" replace />;
};

export default ProRoute;