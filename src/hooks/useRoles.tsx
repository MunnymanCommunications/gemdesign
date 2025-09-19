import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const useRoles = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(true);
  }, [user]);

  return { isAdmin };
};