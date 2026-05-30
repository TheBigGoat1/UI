import React from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Globe,
  ArrowRight,
  CheckCircle2,
  LineChart,
  BookOpen,
  Calendar,
  Lightbulb,
  Activity,
  Shield,
  Database,
  Newspaper,
  Link2,
} from 'lucide-react';
import BrandLogo from '../components/brand/BrandLogo';
import LandingChrome from '../components/layout/LandingChrome';
import HeroImageBackdrop from '../components/visual/HeroImageBackdrop';
import LandingPlatformBlock from '../components/landing/LandingPlatformBlock';
import LandingSignalsSection from '../components/landing/LandingSignalsSection';
import LandingCapabilitiesSection from '../components/landing/LandingCapabilitiesSection';
import LandingPricingSection from '../components/landing/LandingPricingSection';
import LandingTrustSection from '../components/landing/LandingTrustSection';

const PLATFORM_MODULES = [
  { icon: Lightbulb, title: 'AI Signals', desc: 'Ranked setups with entry, targets, stops, and written rationale.' },
  { icon: BarChart3, title: 'Market Overview', desc: 'Regime gauge and live tickers. Risk-on or risk-off at a glance.' },
  { icon: Globe, title: 'Sentiment', desc: 'News heatmap with per-asset bullish and bearish scores.' },
  { icon: BookOpen, title: 'Journal', desc: 'Psychology tags, mistake tracking, and equity analytics.' },
  { icon: Calendar, title: 'Calendar', desc: 'High-impact events with surprise and impact filters.' },
  { icon: LineChart, title: 'Backtest', desc: 'Validate ideas against historical price before you size up.' },
];

const FEATURES = [
  { icon: Database, title: 'PostgreSQL data layer', desc: 'Trades, journal, connections, and sync runs in one database.' },
  { icon: Newspaper, title: 'Live news ingestion', desc: 'GNews and CryptoPanic aggregated into one intelligence feed.' },
  { icon: Link2, title: 'Exchange sync', desc: 'Binance, Bybit, and OKX with read-only keys and journal pipeline.' },
];

const STATS = [
  { value: '50+', label: 'Assets', sub: 'FX · Crypto · Indices' },
  { value: '24/7', label: 'Coverage', sub: 'Global sessions' },
  { value: '85%', label: 'Top ideas', sub: 'Confidence tier' },
  { value: '6', label: 'Modules', sub: 'Unified workspace' },
];

const FEED = [
  { title: 'Sync completed', body: 'Binance connection updated. Journal metrics recalculated.', time: '2 min ago' },
  { title: 'Risk regime update', body: 'Macro gauge shifted risk-off. Review high-beta exposure.', time: '18 min ago' },
  { title: 'Calendar alert', body: 'High-impact US event approaching. Watchlist filter applied.', time: '1 hr ago' },
];

const Landing = () => (
  <div className="landing-page scroll-smooth">
    <LandingChrome />

    {/* Centered full-bleed hero — original layout */}
    <section className="landing-hero" id="top">
      <HeroImageBackdrop />
      <div className="landing-hero__content relative z-10 flex flex-col items-center w-full">
        <div className="hero-copy-panel animate-fade-in">
          <div className="hero-copy-open">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary mb-4 font-sans">
              Insidr trading intelligence
            </p>
            <h1 className="hero-headline">
              <span className="hero-headline__line">Trade with an</span>
              <span className="hero-headline__accent">institutional edge</span>
            </h1>
            <p className="hero-subtitle font-sans">
              AI trade ideas, macro sentiment, and risk models in one command center — built for
              traders who operate at desk-grade standards.
            </p>
            <div className="hero-cta-row flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 w-full">
              <Link to="/register" className="btn-primary w-full sm:w-auto px-10 py-4 min-w-[220px] inline-flex items-center justify-center gap-2">
                Start your free trial
                <ArrowRight size={20} />
              </Link>
              <a href="#platform" className="btn-ghost w-full sm:w-auto px-10 py-4 min-w-[200px] inline-flex items-center justify-center">
                Market intelligence
              </a>
            </div>
            <div className="hero-trust-row font-sans">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                7-day free trial
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                Observe, analyze, advise
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="landing-stats-bar" id="stats" aria-label="Platform metrics">
      <div className="section-shell">
        <div className="landing-stats-bar__inner">
          {STATS.map((s) => (
            <div key={s.label} className="landing-stats-bar__cell landing-surface">
            <div className="landing-stats-bar__value">{s.value}</div>
            <div className="landing-stats-bar__label">{s.label}</div>
            <div className="landing-stats-bar__sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <LandingPlatformBlock modules={PLATFORM_MODULES} />

    <section className="landing-band landing-band--solid flow-section--divider landing-section--balanced" id="features">
      <div className="section-shell">
        <header className="landing-block-head">
          <p className="landing-block-head__eyebrow">Infrastructure</p>
          <h2 className="landing-block-head__title">Built for serious workflows</h2>
          <p className="landing-block-head__lead">
            Clean data plumbing and desk-grade modules — one system from landing to dashboard.
          </p>
        </header>
        <div className="landing-grid landing-grid--3">
          {FEATURES.map((item) => (
            <article key={item.title} className="landing-card">
              <div className="landing-card__icon">
                <item.icon size={20} aria-hidden />
              </div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="landing-band landing-band--raised flow-section--divider" id="intelligence">
      <div className="section-shell">
        <div className="landing-os-deck landing-surface">
          <div className="landing-os-deck__copy">
            <p className="landing-os-deck__eyebrow">Command center</p>
            <h2 className="landing-os-deck__title">Your operating system</h2>
            <p className="landing-os-deck__lead">
              Market data in, normalized storage, analytics out. Alerts when it matters.
            </p>
            <ul className="landing-checklist landing-os-deck__list">
              <li><Activity size={18} aria-hidden />Live ticker and regime gauge across sessions</li>
              <li><Lightbulb size={18} aria-hidden />Confidence-ranked ideas with position calculator</li>
              <li><Shield size={18} aria-hidden />Read-only exchange keys — withdrawals disabled by design</li>
            </ul>
            <Link to="/dashboard" className="landing-btn landing-btn--primary landing-os-deck__cta inline-flex">
              Open dashboard
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <aside className="landing-os-deck__aside" aria-label="Recent platform activity">
            <div className="landing-os-deck__aside-head">
              <span className="landing-os-deck__pulse" aria-hidden />
              Live activity
            </div>
            <div className="landing-os-deck__feed">
              {FEED.map((item) => (
                <article key={item.title} className="landing-os-deck__feed-item">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <time>{item.time}</time>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>

    <LandingSignalsSection />
    <LandingCapabilitiesSection />
    <LandingPricingSection />
    <LandingTrustSection />

    <footer className="landing-footer">
      <div className="section-shell landing-footer__grid">
        <div className="landing-footer__brand">
          <BrandLogo size="md" showTagline className="mb-4" />
          <p>Institutional macro research and AI trading intelligence for the modern retail trader.</p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><a href="#platform">Platform</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#showcase">Ideas</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Terms</a></li>
            <li><a href="#">Privacy</a></li>
            <li><a href="#">Risk disclosure</a></li>
          </ul>
        </div>
      </div>
      <p className="landing-footer__legal">
        Past performance is not indicative of future results. Trading involves substantial risk of loss.
      </p>
    </footer>
  </div>
);

export default Landing;
