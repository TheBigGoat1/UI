import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Pro and Elite tiers (per Developer Specification) */
const ProRoute = ({ children }) => {
  const { user } = useAuth();
  const tier = user?.tier;
  const status = user?.subscription_status;
  const hasAccess =
    tier === 'pro' ||
    tier === 'elite' ||
    status === 'active' ||
    status === 'trialing';

  if (!hasAccess) {
    return <Navigate to="/dashboard/pricing" replace />;
  }

  return children;
};

export default ProRoute;
