import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { supabase } from '../services/api/supabase.js';
import AuthSplitLayout from '../components/layout/AuthSplitLayout';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard/`,
      },
    });

    if (error) {
      console.error('Error signing up with Google:', error.message);
      setError(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.name,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <AuthSplitLayout
      title="Create your account"
      subtitle="Join Insidr for institutional-grade analytics and AI trade ideas."
      heroTagline="Start your 7-day trial. Cancel anytime. Built for traders who want a desk-grade edge."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-bold">
            Sign in
          </Link>
        </>
      }
    >
      {error && (
        <div className="auth-alert auth-alert--error">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button type="button" onClick={handleGoogleLogin} className="btn-ghost w-full py-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Sign up with Google
      </button>

      <div className="auth-divider">
        <hr />
        <span>Or via email</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            name="name"
            placeholder="Full name"
            required
            value={formData.name}
            onChange={handleChange}
            className="input-modern"
            autoComplete="name"
          />
        </div>

        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="email"
            name="email"
            placeholder="Email address"
            required
            value={formData.email}
            onChange={handleChange}
            className="input-modern"
            autoComplete="email"
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="password"
            name="password"
            placeholder="Create password"
            required
            minLength={6}
            value={formData.password}
            onChange={handleChange}
            className="input-modern"
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 disabled:opacity-50">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthSplitLayout>
  );
};

export default Register;
