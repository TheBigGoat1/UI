import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api/api.js';
import { getToken, setToken, clearToken } from '../services/auth/authStorage.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  const applySession = (nextToken, nextUser) => {
    setToken(nextToken);
    setTokenState(nextToken);
    setUser(nextUser);
  };

  const enforceSubscriptionAccess = async (userData) => {
    if (!userData) return userData;
    if (userData.payment_required && !userData.has_access) {
      const hadPaidSetup =
        userData.subscription_status &&
        userData.subscription_status !== 'none' &&
        userData.subscription_status !== 'free';
      if (hadPaidSetup) {
        clearToken();
        setTokenState(null);
        setUser(null);
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href =
            '/login?reason=subscription&msg=' +
            encodeURIComponent('Your trial ended or payment failed. Subscribe to continue.');
        }
        return null;
      }
    }
    return userData;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const savedToken = getToken();
      if (!savedToken) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const res = await api.auth.me();
        if (mounted && res?.success) {
          const nextUser = await enforceSubscriptionAccess(res.data);
          if (nextUser) {
            setTokenState(savedToken);
            setUser(nextUser);
          }
        } else if (mounted) {
          clearToken();
          setTokenState(null);
          setUser(null);
        }
      } catch {
        if (mounted) {
          clearToken();
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token || !user) return undefined;

    const poll = async () => {
      try {
        const res = await api.billing.status();
        if (!res?.success) return;
        if (res.data.payment_required && !res.data.has_access) {
          const status = res.data.subscription_status;
          if (status && !['none', 'free'].includes(status)) {
            clearToken();
            setTokenState(null);
            setUser(null);
            window.location.href =
              '/login?reason=subscription&msg=' +
              encodeURIComponent(res.data.message || 'Subscription required');
          }
        } else {
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  tier: res.data.tier,
                  subscription_status: res.data.subscription_status,
                  trial_ends_at: res.data.trial_ends_at,
                  has_access: res.data.has_access,
                }
              : prev,
          );
        }
      } catch {
        /* ignore poll errors */
      }
    };

    poll();
    const id = setInterval(poll, 60000);
    return () => clearInterval(id);
  }, [token, user?.id]);

  const register = async (email, password, fullName) => {
    try {
      const res = await api.auth.register({ email, password, fullName });
      if (!res?.success) {
        return { success: false, error: res?.error || 'Registration failed.' };
      }
      applySession(res.data.token, res.data.user);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.error || 'Registration failed.' };
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.auth.login({ email, password });
      if (!res?.success) {
        return { success: false, error: res?.error || 'Login failed.' };
      }
      applySession(res.data.token, res.data.user);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.error || 'Invalid credentials.' };
    }
  };

  const completeSetup = async (metadata = {}) => {
    try {
      const res = await api.auth.completeSetup(metadata);
      if (!res?.success) {
        return { success: false, error: res?.error || 'Could not complete setup.' };
      }
      setUser(res.data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.error || 'Could not complete setup.' };
    }
  };

  const logout = async () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.me();
      if (res?.success) {
        setUser(res.data);
        return { success: true, data: res.data };
      }
    } catch (err) {
      return { success: false, error: err.error };
    }
    return { success: false };
  };

  const value = {
    user,
    session: token ? { access_token: token, user } : null,
    token,
    login,
    register,
    logout,
    completeSetup,
    refreshUser,
    isAuthenticated: Boolean(token && user),
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {loading && (
        <div
          className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center gap-4"
          aria-busy="true"
          aria-label="Loading"
        >
          <div className="h-10 w-10 rounded-xl border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Loading Insidr</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
