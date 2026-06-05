import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Sparkles, Clock } from 'lucide-react';
import BrandLogo from '../brand/BrandLogo';
import AuthBackdrop from '../visual/AuthBackdrop';
import ApiStatusBar from './ApiStatusBar.jsx';

const TRUST_ITEMS = [
  { icon: Clock, label: '7-day trial' },
  { icon: Shield, label: 'Secure sign-in' },
  { icon: Sparkles, label: 'Desk-grade edge' },
];

const AuthSplitLayout = ({
  mode = 'sign-in',
  title,
  subtitle,
  children,
  footer,
  showTrust = true,
}) => {
  const eyebrow =
    mode === 'register' ? 'Get started' : mode === 'reset' ? 'Account recovery' : 'Welcome back';

  return (
    <div className="auth-screen">
      <AuthBackdrop />

      <Link to="/" className="auth-screen__home">
        <ArrowLeft size={14} aria-hidden />
        Back to home
      </Link>

      <div className="auth-screen__panel">
        <article className={`auth-card auth-card--${mode}`}>
          <div className="auth-card__glow" aria-hidden="true" />
          <div className="auth-card__accent" aria-hidden="true" />

          <div className="auth-card__hero">
            <img
              src="/landing-hero.jpg"
              alt=""
              className="auth-card__hero-image"
              loading="eager"
              decoding="async"
            />
            <div className="auth-card__hero-scrim" aria-hidden="true" />
            <div className="auth-card__hero-brand">
              <BrandLogo size="md" linkTo="/" showTagline />
              <p className="auth-card__hero-tag">Institutional trading intelligence</p>
            </div>
          </div>

          <div className="auth-card__divider" aria-hidden="true" />

          <div className="auth-card__body">
            <header className="auth-card__head">
              <p className="auth-card__eyebrow">{eyebrow}</p>
              <h1 className="auth-card__title">{title}</h1>
              {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
            </header>

            <div className="auth-card__form">
              <ApiStatusBar className="mb-4" />
              {children}
            </div>

            {showTrust && mode !== 'reset' && (
              <ul className="auth-card__trust" aria-label="Platform benefits">
                {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                  <li key={label}>
                    <Icon size={12} strokeWidth={2.25} aria-hidden />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            )}

            {footer && <footer className="auth-card__footer">{footer}</footer>}
          </div>
        </article>
      </div>
    </div>
  );
};

export default AuthSplitLayout;
