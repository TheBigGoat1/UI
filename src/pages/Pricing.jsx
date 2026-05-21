import React from 'react';
import { Check, Zap, Shield } from 'lucide-react';

const Pricing = () => {
  const handleUpgrade = () => {
    // We will wire this to Stripe Checkout later!
    console.log("Redirecting to Stripe...");
  };

  return (
    <div className="flex flex-col items-center py-8">
      <div className="text-center max-w-2xl mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-4">
          Unlock Institutional-Grade Analytics
        </h1>
        <p className="text-text-muted">
          Stop trading on gut feeling. Get real-time AI trade signals, global risk sentiment analysis, and unlimited macro backtesting.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Free Tier Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col">
          <h2 className="text-xl font-bold text-text-main mb-2">Basic Access</h2>
          <div className="text-3xl font-bold text-text-main mb-6">$0<span className="text-sm font-normal text-text-muted">/mo</span></div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-text-muted text-sm">
              <Check size={18} className="text-emerald-500" /> Standard Economic Calendar
            </li>
            <li className="flex items-center gap-3 text-text-muted text-sm">
              <Check size={18} className="text-emerald-500" /> Delayed Macro News
            </li>
            <li className="flex items-center gap-3 text-text-muted text-sm">
              <Check size={18} className="text-emerald-500" /> Basic Trade Journal (50 entries)
            </li>
          </ul>

          <button className="w-full py-3 rounded-lg border border-border text-text-muted font-bold cursor-not-allowed bg-background">
            Current Plan
          </button>
        </div>

        {/* Pro Tier Card */}
        <div className="bg-surface border-2 border-primary rounded-2xl p-8 flex flex-col relative shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]">
          <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Zap size={12} /> MOST POPULAR
          </div>
          
          <h2 className="text-xl font-bold text-text-main mb-2">Insidr Pro</h2>
          <div className="text-3xl font-bold text-text-main mb-6">$49<span className="text-sm font-normal text-text-muted">/mo</span></div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-text-main text-sm font-medium">
              <Check size={18} className="text-primary" /> Live AI Risk Analysis & Signals
            </li>
            <li className="flex items-center gap-3 text-text-main text-sm font-medium">
              <Check size={18} className="text-primary" /> Advanced Macro Backtester
            </li>
            <li className="flex items-center gap-3 text-text-main text-sm font-medium">
              <Check size={18} className="text-primary" /> Real-time News & Institutional Feeds
            </li>
            <li className="flex items-center gap-3 text-text-main text-sm font-medium">
              <Check size={18} className="text-primary" /> Unlimited Portfolio Tracking
            </li>
          </ul>

          <button 
            onClick={handleUpgrade}
            className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Shield size={18} /> Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
