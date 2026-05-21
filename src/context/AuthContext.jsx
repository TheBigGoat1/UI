import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/api/supabase';

const AuthContext = createContext();

const formatUser = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Trader',
    avatar: user.user_metadata?.avatar_url || null,
    tier: user.user_metadata?.tier || 'free',
    setup_complete: user.user_metadata?.setup_complete === true,
    raw: user,
  };
};

export const fetchMe = async (token) => {
  const res = await fetch('/api/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error('Failed to fetch user');

  return res.json();
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const resolveUser = async (activeSession) => {
      if (!activeSession?.user) {
        setUser(null);
        return;
      }

      if (!isSupabaseConfigured) {
        setUser(formatUser(activeSession.user));
        return;
      }

      try {
        const profile = await fetchMe(activeSession.access_token);
        if (mounted) setUser(profile);
      } catch {
        if (mounted) setUser(formatUser(activeSession.user));
      }
    };

    const init = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) console.error('Auth session error:', error);
        if (!mounted) return;

        setSession(initialSession);
        await resolveUser(initialSession);
      } catch (err) {
        console.error('Auth init failed:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      await resolveUser(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const register = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          setup_complete: false,
          tier: 'free',
        },
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { success: false, error: error.message };
    if (data?.session) {
      setSession(data.session);
      setUser(formatUser(data.session.user));
    }
    return { success: true, data };
  };

  const completeSetup = async () => {
    const { data, error } = await supabase.auth.updateUser({
      data: { setup_complete: true },
    });
    if (error) return { success: false, error: error.message };
    if (data?.user) setUser(formatUser(data.user));
    else if (session?.user) {
      const next = {
        ...session.user,
        user_metadata: { ...session.user.user_metadata, setup_complete: true },
      };
      setSession({ ...session, user: next });
      setUser(formatUser(next));
    }
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const value = {
    user,
    session,
    login,
    register,
    logout,
    completeSetup,
    isAuthenticated: !!session,
    loading,
    isSupabaseConfigured,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 rounded-xl border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Loading Insidr</p>
        </div>
      ) : (
        children
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
