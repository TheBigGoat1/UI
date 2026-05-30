import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api/api';

const AdminRouteGuard = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      if (!isAuthenticated) {
        if (mounted) {
          setAllowed(false);
          setChecking(false);
        }
        return;
      }
      try {
        const res = await api.admin.getAccess();
        const isAdmin = Boolean(res?.success && res?.data?.isAdmin);
        if (mounted) setAllowed(isAdmin);
      } catch {
        if (mounted) setAllowed(false);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkAccess();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (checking) return null;
  if (!allowed) return <Navigate to="/admin/unauthorized" replace />;
  return children;
};

export default AdminRouteGuard;
