import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const EliteRoute = ({ children }) => {
  const { user } = useAuth();
  const hasAccess =
    user?.tier === 'elite' ||
    (user?.subscription_status === 'active' && user?.tier === 'elite');

  if (!hasAccess) {
    return <Navigate to="/dashboard/pricing" replace />;
  }

  return children;
};

export default EliteRoute;
