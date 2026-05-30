import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Activity, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (isLogin) {
      const res = await login(formData.email, formData.password);
      if (res.success) {
        navigate('/app');
      } else {
        setError(res.error);
      }
    } else {
      const res = await register({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password
      });
      if (res.success) {
        setIsLogin(true);
        setSuccessMsg("Account created successfully! Please sign in.");
        setFormData({ ...formData, password: '' }); 
      } else {
        setError(res.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4 border border-primary/20">
            <Activity className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-main">
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2 text-red-500 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-start gap-2 text-emerald-500 text-sm">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" name="firstName" placeholder="First Name" required value={formData.firstName} onChange={handleChange} className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-2.5 pl-10 pr-4 rounded outline-none" />
              </div>
              <div className="flex-1 relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" name="lastName" placeholder="Last Name" required value={formData.lastName} onChange={handleChange} className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-2.5 pl-10 pr-4 rounded outline-none" />
              </div>
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="email" name="email" placeholder="Email Address" required value={formData.email} onChange={handleChange} className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-2.5 pl-10 pr-4 rounded outline-none" />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="password" name="password" placeholder="Password" required value={formData.password} onChange={handleChange} className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-2.5 pl-10 pr-4 rounded outline-none" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded transition-colors disabled:opacity-50 mt-4">
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-text-muted border-t border-border pt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMsg(null); }} className="text-primary hover:underline font-bold">
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;