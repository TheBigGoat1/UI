import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Ideas from './pages/Ideas';
import Calendar from './pages/Calendar';
import News from './pages/News';
import Settings from './pages/Settings';
import Backtest from './pages/Backtest';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import UpdatePassword from './pages/auth/UpdatePassword';
import Pricing from './pages/Pricing';
import ProRoute from './components/layout/ProRoute';
import Journal from './pages/Journal';
import OnboardingWizard from './pages/OnboardingWizard';

// Protected route that ensures user is logged in AND has completed onboarding
const DashboardGuard = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !user.setup_complete) return <Navigate to="/onboarding" replace />;
  
  return children;
};

// Route specifically for the wizard. Bounces completed users to the dashboard.
const OnboardingGuard = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.setup_complete) return <Navigate to="/dashboard" replace />;
  
  return children;
};

// Protected routes wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />

          {/* THE ONBOARDING FUNNEL */}
          <Route path="/onboarding" element={
            <OnboardingGuard>
              <OnboardingWizard />
            </OnboardingGuard>
          } />

          {/* Protected App Dashboard */}
          <Route path="/dashboard" element={
            <DashboardGuard>
              <DashboardLayout />
            </DashboardGuard>
          }>

            {/* Standard Free Pages */}
            <Route index element={<Dashboard />} />
            <Route path="ideas" element={<Ideas />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="news" element={<News />} />
            <Route path="settings" element={<Settings />} />
            <Route path="journal" element={<Journal />} />
            {/* Pricing Upgrade Page inside the dashboard */}
            <Route path="pricing" element={<Pricing />} />
      
            {/* PRO FEATURES ONLY */}
            <Route 
              path="backtest" 
              element={
                <ProRoute>
                  <Backtest />
                </ProRoute>
              } 
            /> 
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
