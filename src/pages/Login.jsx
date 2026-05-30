import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import AuthSplitLayout from '../components/layout/AuthSplitLayout';
import AuthField from '../components/auth/AuthField';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscriptionMsg = searchParams.get('msg');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(formData.email, formData.password);
    if (res.success) {
      const user = res.data?.user;
      navigate(user?.setup_complete ? '/dashboard' : '/onboarding');
    } else {
      setError(res.error || 'Invalid credentials provided.');
    }
    setLoading(false);
  };

  return (
    <AuthSplitLayout
      mode="sign-in"
      title="Sign in"
      subtitle="AI signals, macro sentiment, and risk tools — one workspace."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register">Create one</Link>
        </>
      }
    >
      {subscriptionMsg && (
        <div className="auth-alert auth-alert--error mb-4" role="alert">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{subscriptionMsg}</span>
        </div>
      )}
      {error && (
        <div className="auth-alert auth-alert--error" role="alert">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <AuthField id="login-email" label="Email" icon={Mail}>
          <input
            id="login-email"
            type="email"
            name="email"
            placeholder="you@firm.com"
            required
            value={formData.email}
            onChange={handleChange}
            className="auth-field__input"
            autoComplete="email"
          />
        </AuthField>

        <AuthField id="login-password" label="Password" icon={Lock}>
          <input
            id="login-password"
            type="password"
            name="password"
            placeholder="••••••••"
            required
            value={formData.password}
            onChange={handleChange}
            className="auth-field__input"
            autoComplete="current-password"
          />
        </AuthField>

        <div className="auth-form__row">
          <Link to="/forgot-password" className="auth-form__link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary auth-form__submit disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-[11px] text-text-muted mt-2">
          By continuing, you agree to{' '}
          <Link to="/legal/terms">Terms</Link>, <Link to="/legal/privacy">Privacy</Link>,{' '}
          <Link to="/legal/cookies">Cookies</Link>, and <Link to="/legal/risk">Risk Disclosure</Link>.
        </p>
      </form>
    </AuthSplitLayout>
  );
};

export default Login;
