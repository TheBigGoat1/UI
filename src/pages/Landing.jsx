import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  BarChart3,
  Globe,
  ArrowRight,
  CheckCircle2,
  LineChart,
  BookOpen,
  Calendar,
  Lightbulb,
} from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import AppNavbar from '../components/layout/AppNavbar';
import BrandLogo from '../components/brand/BrandLogo';
import HeroVideoBackdrop from '../components/visual/HeroVideoBackdrop';
import LandingChrome from '../components/layout/LandingChrome';
import LandingPlatformBlock from '../components/landing/LandingPlatformBlock';
import LandingSignalsSection from '../components/landing/LandingSignalsSection';
import LandingCapabilitiesSection from '../components/landing/LandingCapabilitiesSection';
import LandingPricingSection from '../components/landing/LandingPricingSection';
import LandingTrustSection from '../components/landing/LandingTrustSection';
import ScrollReveal from '../components/motion/ScrollReveal';
import AppFlowShell from '../components/layout/AppFlowShell';
import usePrefetchLandingVideos from '../hooks/usePrefetchLandingVideos';

const PLATFORM_MODULES = [
  {
    icon: Lightbulb,
    color: 'text-primary',
    title: 'AI Signals',
    desc: 'Ranked setups with entry, targets, stops, and full written rationale.',
  },
  { icon: BarChart3, color: 'text-primary', title: 'Market Overview', desc: 'Regime gauge and live tickers. Risk-on or risk-off at a glance.' },
  { icon: Globe, color: 'text-secondary', title: 'Sentiment', desc: 'News heatmap with per-asset bullish and bearish scores.' },
  { icon: BookOpen, color: 'text-primary', title: 'Journal', desc: 'Psychology tags, mistake tracking, and equity analytics.' },
  { icon: Calendar, color: 'text-success', title: 'Calendar', desc: 'High-impact events with surprise and impact filters.' },
  { icon: LineChart, color: 'text-success', title: 'Backtest', desc: 'Validate ideas against historical price before you size up.' },
];

const Landing = () => {
  usePrefetchLandingVideos();

  return (
    <AppFlowShell className="landing-page selection:bg-primary/30 scroll-smooth">
      <LandingChrome />

      {/* ① Hero — video 1 (3945008) */}
      <section className="landing-hero">
        <HeroVideoBackdrop />

        <div className="relative z-10 flex min-h-screen flex-col items-center w-full landing-hero__content">
          <div className="hero-copy-panel animate-fade-in">
            <div className="hero-copy-open">
              <h1 className="hero-headline">
                <span className="hero-headline__line">TRADE WITH AN</span>
                <span className="hero-headline__accent">INSTITUTIONAL EDGE</span>
              </h1>
              <p className="hero-subtitle max-w-2xl">
                AI trade ideas, macro sentiment, and risk models in one command center built for traders who operate at desk-grade standards.
              </p>
              <div className="hero-cta-row flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 md:mt-12 w-full">
                <Link to="/register" className="btn-primary w-full sm:w-auto px-10 py-4 group min-w-[240px]">
                  Start Your Free Trial
                  <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <a href="#platform" className="btn-ghost w-full sm:w-auto px-10 py-4 min-w-[200px]">
                  Market Intelligence
                </a>
              </div>
              <div className="hero-trust-row">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                  7-day free trial
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                  Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </div>

        <a href="#stats" className="scroll-cue" aria-label="Scroll to stats">
          <span>Explore</span>
          <ChevronDown size={16} className="opacity-70 animate-bounce" />
        </a>
      </section>

      <div className="landing-section-emphasis flow-main">
        <section className="landing-band landing-band--solid" id="stats">
          <div className="section-shell grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { value: '50+', label: 'Assets', sub: 'FX · Crypto · Indices' },
              { value: '24/7', label: 'Coverage', sub: 'Global sessions' },
              { value: '85%', label: 'Top Ideas', sub: 'Confidence tier' },
              { value: '6', label: 'Core Modules', sub: 'Unified workspace' },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} variant="fade-up" delay={i * 80}>
                <div className="stat-card-elevated stat-card-elevated--lift text-center group h-full">
                  <div className="text-4xl font-heading text-primary mb-1">{stat.value}</div>
                  <div className="font-display font-bold text-text-main">{stat.label}</div>
                  <div className="stat-card-elevated__sub">{stat.sub}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <p className="section-shell landing-research-feeds">
            Research feeds · Reuters · Bloomberg · LSEG · TradingView · Forex Factory · Investing.com
          </p>
        </section>

        <LandingPlatformBlock modules={PLATFORM_MODULES} />

        <LandingSignalsSection />

        <LandingCapabilitiesSection />

        <LandingPricingSection />

        <LandingTrustSection />
      </div>

      <footer className="relative z-20 border-t border-border/40 py-14 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2">
            <BrandLogo size="md" showTagline className="mb-5" />
            <p className="text-sm text-text-muted max-w-sm leading-relaxed">
              Institutional macro research and AI trading intelligence for the modern retail trader.
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold text-sm mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href="#platform" className="nav-link inline-block">Platform</a></li>
              <li><a href="#features" className="nav-link inline-block">Features</a></li>
              <li><a href="#pricing" className="nav-link inline-block">Pricing</a></li>
              <li><a href="#showcase" className="nav-link inline-block">Ideas</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-sm mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href="#" className="nav-link inline-block">Terms</a></li>
              <li><a href="#" className="nav-link inline-block">Privacy</a></li>
              <li><a href="#" className="nav-link inline-block">Risk Disclosure</a></li>
            </ul>
          </div>
        </div>
        <p className="text-[10px] text-text-muted text-center max-w-4xl mx-auto leading-relaxed">
          *Past performance is not indicative of future results. Trading involves substantial risk.
        </p>
      </footer>
    </AppFlowShell>
  );
};

export default Landing;
