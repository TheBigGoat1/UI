import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/api/supabase.js';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/brand/BrandLogo';
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Globe, 
  Wallet, 
  TrendingUp, 
  ShieldCheck,
  Zap,
  Star
} from 'lucide-react';

// Stub for your analytics engine (Segment, Mixpanel, etc.)
const trackAnalytics = (eventName, data = {}) => {
  console.log(`[Analytics] ${eventName}`, data);
  // Example: mixpanel.track(eventName, data);
};

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { completeSetup } = useAuth();
  
  const [step, setStep] = useState(1);
  const [billingCycle, setBillingCycle] = useState('annual'); // 'monthly' or 'annual'
  
  // Funnel State
  const [formData, setFormData] = useState({
    experience: '',
    markets: [],
    currency: 'USD',
    watchlist: []
  });

  // Track initial entry
  useEffect(() => {
    trackAnalytics('onboarding_started');
    trackAnalytics('step_1_viewed');
  }, []);

  const handleNext = () => {
    trackAnalytics(`step_${step}_completed`, formData);
    if (step < 5) {
      setStep(step + 1);
      trackAnalytics(`step_${step + 1}_viewed`);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleArrayItem = (field, value) => {
    setFormData(prev => {
      const array = prev[field];
      const newArray = array.includes(value) 
        ? array.filter(item => item !== value)
        : [...array, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleSkip = async () => {
    const res = await completeSetup();
    if (res.success) navigate('/dashboard');
    else alert(res.error || 'Could not skip onboarding.');
  };

  const handleCheckout = async (planId) => {
    trackAnalytics('checkout_initiated', { plan: planId, cycle: billingCycle });
    
    // In a production app, you would redirect to a Stripe Checkout URL here.
    // For now, we are simulating a successful payment and saving their data!
    try {
      // 1. Update the user's metadata in Supabase
      const { data, error } = await supabase.auth.updateUser({
        data: { 
          setup_complete: true,
          plan: planId,
          billing_cycle: billingCycle,
          trading_experience: formData.experience,
          preferred_markets: formData.markets,
          base_currency: formData.currency,
          watchlist: formData.watchlist
        }
      });

      if (error) throw error;

      trackAnalytics('onboarding_completed');
      
      // 2. Force a hard reload to refresh the AuthContext and unlock the dashboard
      window.location.href = '/dashboard';
      
    } catch (err) {
      console.error("Failed to save onboarding data:", err);
      alert("Error saving profile. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col font-sans selection:bg-primary/30 selection:text-primary relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      {/* Header */}
      <header className="h-20 flex items-center justify-between px-6 md:px-12 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <BrandLogo size="md" linkTo="/" />
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-text-muted font-mono hidden sm:inline">
            STEP {step} OF 5
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-bold uppercase tracking-wider text-text-muted hover:text-primary transition-colors"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-surface">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(step / 5) * 100}%` }}
        ></div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        <div className="w-full max-w-2xl animate-fade-in">
          
          {/* STEP 1: Experience */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h1 className="text-4xl font-heading mb-3">What is your trading experience?</h1>
                <p className="text-text-muted">This helps our AI calibrate risk metrics and rationale complexity.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                  <button 
                    key={level}
                    onClick={() => setFormData({...formData, experience: level})}
                    className={`p-6 rounded-xl border text-center transition-all ${
                      formData.experience === level 
                        ? 'bg-primary/10 border-primary text-text-main' 
                        : 'bg-surface border-border text-text-muted hover:border-primary/50'
                    }`}
                  >
                    <span className="font-bold block">{level}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Markets */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h1 className="text-4xl font-heading mb-3">Which markets do you trade?</h1>
                <p className="text-text-muted">Select all that apply to tailor your news feed.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'Forex', icon: Globe },
                  { id: 'Crypto', icon: Zap },
                  { id: 'Indices', icon: TrendingUp },
                  { id: 'Commodities', icon: ShieldCheck }
                ].map(market => {
                  const Icon = market.icon;
                  const isSelected = formData.markets.includes(market.id);
                  return (
                    <button 
                      key={market.id}
                      onClick={() => toggleArrayItem('markets', market.id)}
                      className={`p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                        isSelected 
                          ? 'bg-primary/10 border-primary text-primary' 
                          : 'bg-surface border-border text-text-muted hover:border-primary/50'
                      }`}
                    >
                      <Icon size={24} />
                      <span className="font-bold text-sm text-text-main">{market.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Currency */}
          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h1 className="text-4xl font-heading mb-3">Select base currency</h1>
                <p className="text-text-muted">This sets the default for your Portfolio and Trade Journal.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {['USD', 'EUR', 'GBP', 'JPY', 'AUD'].map(curr => (
                  <button 
                    key={curr}
                    onClick={() => setFormData({...formData, currency: curr})}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      formData.currency === curr 
                        ? 'bg-primary/10 border-primary text-text-main font-bold' 
                        : 'bg-surface border-border text-text-muted hover:border-primary/50 font-bold'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Watchlist */}
          {step === 4 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h1 className="text-4xl font-heading mb-3">Build your initial watchlist</h1>
                <p className="text-text-muted">Select assets to track immediately. You can change these later.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['EURUSD', 'GBPUSD', 'XAUUSD', 'SPX500', 'BTCUSD', 'USOIL'].map(asset => {
                  const isSelected = formData.watchlist.includes(asset);
                  return (
                    <button 
                      key={asset}
                      onClick={() => toggleArrayItem('watchlist', asset)}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected 
                          ? 'bg-primary/10 border-primary text-text-main' 
                          : 'bg-surface border-border text-text-muted hover:border-primary/50'
                      }`}
                    >
                      <span className="font-bold">{asset}</span>
                      {isSelected && <CheckCircle2 size={18} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Subscription (Stripe Integration) */}
          {step === 5 && (
            <div className="space-y-8 animate-fade-in w-full max-w-4xl mx-auto">
              <div className="text-center">
                <h1 className="text-4xl font-heading mb-3">Unlock Institutional Grade</h1>
                <p className="text-text-muted">Select your plan. Both plans include a 7-day risk-free trial.</p>
              </div>
              
              {/* Billing Toggle */}
              <div className="flex justify-center mb-8">
                <div className="bg-surface border border-border p-1 rounded-lg inline-flex">
                  <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-background text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => setBillingCycle('annual')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${billingCycle === 'annual' ? 'bg-background text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                  >
                    Annually <span className="text-emerald-500 ml-1">-20%</span>
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Pro Tier */}
                <div className="bg-surface border border-border rounded-xl p-8 flex flex-col">
                  <h2 className="text-xl font-bold mb-2">Insidr Pro</h2>
                  <div className="text-3xl font-bold mb-1">
                    ${billingCycle === 'annual' ? '280' : '28'}
                    <span className="text-sm font-normal text-text-muted">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                  </div>
                  <p className="text-sm text-text-muted mb-6 pb-6 border-b border-border">Core intelligence for active traders.</p>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-sm"><CheckCircle2 size={16} className="text-primary" /> Live AI Trade Signals</li>
                    <li className="flex items-center gap-3 text-sm"><CheckCircle2 size={16} className="text-primary" /> Global Sentiment Aggregation</li>
                    <li className="flex items-center gap-3 text-sm"><CheckCircle2 size={16} className="text-primary" /> Standard Backtester</li>
                  </ul>
                  
                  <button 
                    onClick={() => handleCheckout('pro')}
                    className="w-full py-3 rounded-lg border border-border hover:bg-surface-hover text-text-main font-bold transition-colors"
                  >
                    Start 7-Day Free Trial
                  </button>
                </div>

                {/* Elite Tier */}
                <div className="bg-surface border-2 border-primary rounded-xl p-8 flex flex-col relative shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
                    <Star size={10} /> Institutional Choice
                  </div>
                  
                  <h2 className="text-xl font-bold mb-2 text-primary">Insidr Elite</h2>
                  <div className="text-3xl font-bold mb-1">
                    ${billingCycle === 'annual' ? '790' : '79'}
                    <span className="text-sm font-normal text-text-muted">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                  </div>
                  <p className="text-sm text-text-muted mb-6 pb-6 border-b border-border">Full API access and predictive modeling.</p>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={16} className="text-primary" /> Everything in Pro</li>
                    <li className="flex items-center gap-3 text-sm"><CheckCircle2 size={16} className="text-primary" /> Predictive Machine Learning Models</li>
                    <li className="flex items-center gap-3 text-sm"><CheckCircle2 size={16} className="text-primary" /> API Access & Webhooks</li>
                    <li className="flex items-center gap-3 text-sm"><CheckCircle2 size={16} className="text-primary" /> 1-on-1 Analyst Onboarding</li>
                  </ul>
                  
                  <button 
                    onClick={() => handleCheckout('elite')}
                    className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold transition-colors"
                  >
                    Start 7-Day Free Trial
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls (Hidden on step 5) */}
          {step < 5 && (
            <div className="mt-12 flex items-center justify-between border-t border-border/50 pt-6">
              <button 
                onClick={handleBack}
                disabled={step === 1}
                className="flex items-center gap-2 text-text-muted hover:text-text-main disabled:opacity-30 transition-colors font-bold text-sm"
              >
                <ChevronLeft size={18} /> Back
              </button>
              
              <button 
                onClick={handleNext}
                disabled={
                  (step === 1 && !formData.experience) ||
                  (step === 2 && formData.markets.length === 0) ||
                  (step === 4 && formData.watchlist.length === 0)
                }
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-surface disabled:text-text-muted text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all"
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default OnboardingWizard;
