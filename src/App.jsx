import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import PageLoader from './components/layout/PageLoader.jsx';
import AdminRouteGuard from './components/auth/AdminRouteGuard';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Ideas = lazy(() => import('./pages/Ideas'));
const Calendar = lazy(() => import('./pages/Calendar'));
const News = lazy(() => import('./pages/News'));
const Settings = lazy(() => import('./pages/Settings'));
const Backtest = lazy(() => import('./pages/Backtest'));
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const UpdatePassword = lazy(() => import('./pages/auth/UpdatePassword'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Journal = lazy(() => import('./pages/Journal'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const OnboardingSuccess = lazy(() => import('./pages/OnboardingSuccess'));
const Connections = lazy(() => import('./pages/Connections'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminUnauthorized = lazy(() => import('./pages/AdminUnauthorized'));
const Economy = lazy(() => import('./pages/Economy'));
const Terms = lazy(() => import('./pages/legal/Terms'));
const Privacy = lazy(() => import('./pages/legal/Privacy'));
const Cookies = lazy(() => import('./pages/legal/Cookies'));
const RiskDisclaimer = lazy(() => import('./pages/legal/RiskDisclaimer'));

const LazyPage = ({ children, title }) => (
  <ErrorBoundary title={title}>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </ErrorBoundary>
);

// Route guards — wait for auth bootstrap before redirecting
const DashboardGuard = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !user.setup_complete) return <Navigate to="/onboarding" replace />;

  return children;
};

const OnboardingGuard = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.setup_complete) return <Navigate to="/dashboard" replace />;

  return children;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary title="Application error">
            <Suspense fallback={<PageLoader />}>
              <AppRoutes />
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  return (
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LazyPage title="Landing error"><Landing /></LazyPage>} />
          <Route path="/login" element={<LazyPage title="Login error"><Login /></LazyPage>} />
          <Route path="/admin/login" element={<LazyPage title="Admin login error"><AdminLogin /></LazyPage>} />
          <Route path="/admin/unauthorized" element={<LazyPage title="Admin unauthorized error"><AdminUnauthorized /></LazyPage>} />
          <Route path="/register" element={<LazyPage title="Register error"><Register /></LazyPage>} />
          <Route path="/forgot-password" element={<LazyPage title="Forgot password error"><ForgotPassword /></LazyPage>} />
          <Route path="/update-password" element={<LazyPage title="Update password error"><UpdatePassword /></LazyPage>} />
          <Route path="/legal/terms" element={<LazyPage title="Terms error"><Terms /></LazyPage>} />
          <Route path="/legal/privacy" element={<LazyPage title="Privacy error"><Privacy /></LazyPage>} />
          <Route path="/legal/cookies" element={<LazyPage title="Cookies error"><Cookies /></LazyPage>} />
          <Route path="/legal/risk" element={<LazyPage title="Risk disclaimer error"><RiskDisclaimer /></LazyPage>} />

          {/* THE ONBOARDING FUNNEL */}
          <Route path="/onboarding" element={
            <OnboardingGuard>
              <LazyPage title="Onboarding error"><OnboardingWizard /></LazyPage>
            </OnboardingGuard>
          } />
          <Route path="/onboarding/success" element={
            <ProtectedRoute>
              <LazyPage title="Onboarding success error"><OnboardingSuccess /></LazyPage>
            </ProtectedRoute>
          } />

          {/* Protected App Dashboard */}
          <Route path="/dashboard" element={
            <DashboardGuard>
              <DashboardLayout />
            </DashboardGuard>
          }>

            {/* Standard Free Pages */}
            <Route index element={<LazyPage title="Overview error"><Dashboard /></LazyPage>} />
            <Route path="ideas" element={<LazyPage title="Ideas error"><Ideas /></LazyPage>} />
            <Route path="calendar" element={<LazyPage title="Calendar error"><Calendar /></LazyPage>} />
            <Route path="news" element={<LazyPage title="News error"><News /></LazyPage>} />
            <Route path="economy" element={<LazyPage title="Economy error"><Economy /></LazyPage>} />
            <Route path="settings" element={<LazyPage title="Settings error"><Settings /></LazyPage>} />
            <Route path="help" element={<Navigate to="/dashboard/settings?tab=guide" replace />} />
            <Route
              path="admin-monitoring"
              element={<Navigate to="/dashboard/settings?tab=activity" replace />}
            />
            <Route path="journal" element={<LazyPage title="Journal error"><Journal /></LazyPage>} />
            <Route path="connections" element={<LazyPage title="Connections error"><Connections /></LazyPage>} />
            {/* Pricing Upgrade Page inside the dashboard */}
            <Route path="pricing" element={<LazyPage title="Pricing error"><Pricing /></LazyPage>} />
      
            <Route path="backtest" element={<LazyPage title="Backtest error"><Backtest /></LazyPage>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route
            path="/admin"
            element={
              <AdminRouteGuard>
                <LazyPage title="Admin error"><Admin /></LazyPage>
              </AdminRouteGuard>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
  );
}

export default App;
