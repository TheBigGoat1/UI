import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../services/api/supabase.js';
import AuthSplitLayout from '../../components/layout/AuthSplitLayout';

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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('If an account exists, a password reset link has been sent to your email.');
    }
    setLoading(false);
  };

  return (
    <AuthSplitLayout
      title="Reset password"
      subtitle="Enter your email and we will send you a secure reset link."
      footer={
        <Link to="/login" className="inline-flex items-center justify-center gap-2 font-bold text-text-muted hover:text-primary transition-colors">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      }
    >
      {error && (
        <div className="auth-alert auth-alert--error">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="auth-alert auth-alert--success">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-modern"
            autoComplete="email"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 disabled:opacity-50">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </AuthSplitLayout>
  );
};

export default ForgotPassword;
