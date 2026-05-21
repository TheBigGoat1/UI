import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProRoute = ({ children }) => {
  const { user } = useAuth();

  console.log("Gatekeeper Check - User Tier is:", user?.tier);

  // If the user is on the free tier (or it's missing), bounce them to pricing
  if (user?.tier !== 'pro') {
    return <Navigate to="/dashboard/pricing" replace />;
  }

  // If they are Pro, render the premium component
  return children;
};

export default ProRoute;
