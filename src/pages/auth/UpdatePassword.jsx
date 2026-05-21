import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/api/supabase.js';
import BrandLogo from '../../components/brand/BrandLogo';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // This updates the password for the currently active session
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
    } else {
      // Password updated successfully, route them straight to the app
      navigate('/dashboard');
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
          <p className="text-sm text-text-muted mt-2">Please enter your new password below.</p>
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
              type="password" placeholder="New Password" required minLength="6"
              value={password} onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-background border border-border focus:border-primary text-text-main text-sm py-2.5 pl-10 pr-4 rounded outline-none" 
            />
          </div>

          <button 
            type="submit" disabled={loading} 
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
