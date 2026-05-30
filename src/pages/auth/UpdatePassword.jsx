import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api/api';
import BrandLogo from '../../components/brand/BrandLogo';
import { isStrongPassword, PASSWORD_POLICY_TEXT } from '../../utils/passwordPolicy.js';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY_TEXT);
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      if (resetToken) {
        await api.auth.resetPassword(resetToken, password);
      } else {
        await api.auth.updatePassword(password);
      }
      navigate('/login');
    } catch (err) {
      setError(err.error || 'Could not update password.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 page-mesh">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-card animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <BrandLogo size="lg" linkTo="/" />
          </div>
          <h1 className="text-2xl font-heading tracking-wide text-text-main">SET NEW PASSWORD</h1>
          <p className="text-sm text-text-muted mt-2">
            {resetToken ? 'Enter a new password for your reset token.' : 'Update password for your logged-in account.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2 text-red-500 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-2.5 pl-10 pr-10 rounded outline-none"
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

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm New Password"
              required
              minLength={10}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-2.5 pl-10 pr-10 rounded outline-none"
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
          <p className="text-xs text-text-muted">{PASSWORD_POLICY_TEXT}</p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
