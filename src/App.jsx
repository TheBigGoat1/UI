import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
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
import Journal from './pages/Journal';
import OnboardingWizard from './pages/OnboardingWizard';
import OnboardingSuccess from './pages/OnboardingSuccess';
import Connections from './pages/Connections';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import AdminUnauthorized from './pages/AdminUnauthorized';
import AdminRouteGuard from './components/auth/AdminRouteGuard';
import Economy from './pages/Economy';
import Terms from './pages/legal/Terms';
import Privacy from './pages/legal/Privacy';
import Cookies from './pages/legal/Cookies';
import RiskDisclaimer from './pages/legal/RiskDisclaimer';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Route guards — wait for auth bootstrap before redirecting
const DashboardGuard = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !user.setup_complete) return <Navigate to="/onboarding" replace />;

  return children;
};

const OnboardingGuard = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.setup_complete) return <Navigate to="/dashboard" replace />;

  return children;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary title="Application error">
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/unauthorized" element={<AdminUnauthorized />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/privacy" element={<Privacy />} />
          <Route path="/legal/cookies" element={<Cookies />} />
          <Route path="/legal/risk" element={<RiskDisclaimer />} />

          {/* THE ONBOARDING FUNNEL */}
          <Route path="/onboarding" element={
            <OnboardingGuard>
              <OnboardingWizard />
            </OnboardingGuard>
          } />
          <Route path="/onboarding/success" element={
            <ProtectedRoute>
              <OnboardingSuccess />
            </ProtectedRoute>
          } />

          {/* Protected App Dashboard */}
          <Route path="/dashboard" element={
            <DashboardGuard>
              <DashboardLayout />
            </DashboardGuard>
          }>

            {/* Standard Free Pages */}
            <Route index element={<ErrorBoundary title="Overview error"><Dashboard /></ErrorBoundary>} />
            <Route path="ideas" element={<ErrorBoundary title="Ideas error"><Ideas /></ErrorBoundary>} />
            <Route path="calendar" element={<ErrorBoundary title="Calendar error"><Calendar /></ErrorBoundary>} />
            <Route path="news" element={<ErrorBoundary title="News error"><News /></ErrorBoundary>} />
            <Route path="economy" element={<ErrorBoundary title="Economy error"><Economy /></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary title="Settings error"><Settings /></ErrorBoundary>} />
            <Route path="help" element={<Navigate to="/dashboard/settings?tab=guide" replace />} />
            <Route
              path="admin-monitoring"
              element={<Navigate to="/dashboard/settings?tab=activity" replace />}
            />
            <Route path="journal" element={<ErrorBoundary title="Journal error"><Journal /></ErrorBoundary>} />
            <Route path="connections" element={<ErrorBoundary title="Connections error"><Connections /></ErrorBoundary>} />
            {/* Pricing Upgrade Page inside the dashboard */}
            <Route path="pricing" element={<ErrorBoundary title="Pricing error"><Pricing /></ErrorBoundary>} />
      
            <Route path="backtest" element={<ErrorBoundary title="Backtest error"><Backtest /></ErrorBoundary>} />
          </Route>

          <Route
            path="/admin"
            element={
              <AdminRouteGuard>
                <Admin />
              </AdminRouteGuard>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </BrowserRouter>
  );
}

export default App;
