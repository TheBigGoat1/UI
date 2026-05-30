import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  // If the user is NOT logged in, go back to the login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If they ARE logged in, render the child routes (the dashboard)
  return <Outlet />;
};

export default ProtectedRoute;
