import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loginRes = await login(email, password);
      if (!loginRes?.success) {
        setError(loginRes?.error || 'Invalid credentials provided.');
        return;
      }
      const accessRes = await api.admin.getAccess();
      if (!accessRes?.success || !accessRes?.data?.isAdmin) {
        navigate('/admin/unauthorized', { replace: true });
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err?.error || err?.message || 'Admin access denied. Use an admin account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <ShieldCheck size={28} />
          </div>
          <h1>Admin Control Login</h1>
          <p>Sign in with your admin credentials to access site oversight tools.</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="admin-email">
            Admin Email
          </label>
          <div className="auth-input-wrap">
            <Mail size={16} />
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
              required
            />
          </div>

          <label className="auth-label" htmlFor="admin-password">
            Password
          </label>
          <div className="auth-input-wrap">
            <Lock size={16} />
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Checking admin access...' : 'Login to Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
