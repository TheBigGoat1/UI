import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api/api';
import { useAuth } from '../context/AuthContext.jsx';
import BrandLogo from '../components/brand/BrandLogo';

const OnboardingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('Missing checkout session. Please try again from onboarding.');
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await api.billing.verifySession(sessionId);
        if (cancelled) return;
        if (!res?.success) {
          setError(res?.error || 'Could not verify subscription.');
          return;
        }
        sessionStorage.removeItem('insidr_onboarding');
        await refreshUser();
        navigate('/dashboard?welcome=1&checkout=success', { replace: true });
      } catch (err) {
        if (!cancelled) setError(err.error || 'Verification failed.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <BrandLogo size="md" linkTo="/" showTagline className="mb-8" />
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-surface p-8">
        {error ? (
          <>
            <AlertCircle className="mx-auto text-danger mb-4" size={40} />
            <h1 className="text-xl font-bold mb-2">Checkout incomplete</h1>
            <p className="text-text-muted text-sm mb-6">{error}</p>
            <Link to="/onboarding" className="btn-primary inline-flex px-6 py-3">
              Return to onboarding
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto text-primary animate-spin mb-4" size={40} />
            <h1 className="text-xl font-bold mb-2">Activating your trial</h1>
            <p className="text-text-muted text-sm">
              Confirming your 7-day free trial and setting up your workspace…
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingSuccess;
