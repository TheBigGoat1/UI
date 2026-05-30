import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api/api';
import AuthSplitLayout from '../../components/layout/AuthSplitLayout';
import AuthField from '../../components/auth/AuthField';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await api.auth.forgotPassword(email);
      setMessage(
        'If an account exists, a reset token was generated. In local dev, check the API server console for the reset link.',
      );
    } catch (err) {
      setError(err.error || 'Could not process reset request.');
    }
    setLoading(false);
  };

  return (
    <AuthSplitLayout
      mode="reset"
      title="Reset password"
      subtitle="We'll email you a secure link to choose a new password."
      showTrust={false}
      footer={
        <Link to="/login" className="inline-flex items-center justify-center gap-2">
          <ArrowLeft size={16} aria-hidden />
          Back to sign in
        </Link>
      }
    >
      {error && (
        <div className="auth-alert auth-alert--error" role="alert">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="auth-alert auth-alert--success" role="status">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <AuthField id="reset-email" label="Email" icon={Mail}>
          <input
            id="reset-email"
            type="email"
            placeholder="you@firm.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-field__input"
            autoComplete="email"
          />
        </AuthField>

        <button type="submit" disabled={loading} className="btn-primary auth-form__submit disabled:opacity-50">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </AuthSplitLayout>
  );
};

export default ForgotPassword;
