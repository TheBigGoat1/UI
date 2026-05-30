import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AuthSplitLayout from '../components/layout/AuthSplitLayout';
import AuthField from '../components/auth/AuthField';
import { isStrongPassword, PASSWORD_POLICY_TEXT } from '../utils/passwordPolicy.js';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isStrongPassword(formData.password)) {
      setError(PASSWORD_POLICY_TEXT);
      setLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const res = await register(formData.email, formData.password, formData.name);
    if (res.success) {
      navigate('/onboarding');
    } else {
      setError(res.error || 'Registration failed.');
    }
    setLoading(false);
  };

  return (
    <AuthSplitLayout
      mode="register"
      title="Create account"
      subtitle="Seven-day free trial. Desk-grade intelligence from day one."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </>
      }
    >
      {error && (
        <div className="auth-alert auth-alert--error" role="alert">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <AuthField id="register-name" label="Full name" icon={User}>
          <input
            id="register-name"
            type="text"
            name="name"
            placeholder="Your name"
            required
            value={formData.name}
            onChange={handleChange}
            className="auth-field__input"
            autoComplete="name"
          />
        </AuthField>

        <AuthField id="register-email" label="Email" icon={Mail}>
          <input
            id="register-email"
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

        <AuthField id="register-password" label="Password" icon={Lock}>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Strong password"
              required
              minLength={10}
              value={formData.password}
              onChange={handleChange}
              className="auth-field__input pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </AuthField>
        <AuthField id="register-confirm-password" label="Confirm password" icon={Lock}>
          <div className="relative">
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Repeat password"
              required
              minLength={10}
              value={formData.confirmPassword}
              onChange={handleChange}
              className="auth-field__input pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </AuthField>
        <p className="text-xs text-text-muted -mt-2">{PASSWORD_POLICY_TEXT}</p>

        <button type="submit" disabled={loading} className="btn-primary auth-form__submit disabled:opacity-50">
          {loading ? 'Creating account...' : 'Get started'}
        </button>
        <p className="text-[11px] text-text-muted mt-2">
          By creating an account, you accept <Link to="/legal/terms">Terms</Link>,{' '}
          <Link to="/legal/privacy">Privacy</Link>, <Link to="/legal/cookies">Cookies</Link>, and{' '}
          <Link to="/legal/risk">Risk Disclosure</Link>.
        </p>
      </form>
    </AuthSplitLayout>
  );
};

export default Register;
