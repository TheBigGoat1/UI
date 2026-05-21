import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../brand/BrandLogo';

const AUTH_HERO = '/images/auth-hero.png';

/**
 * Split auth screen — hero image left, sign-in panel right (stacks on mobile).
 */
const AuthSplitLayout = ({
  children,
  title,
  subtitle,
  footer,
  heroTagline = 'Institutional macro research and AI trading intelligence for the modern trader.',
}) => (
  <div className="auth-split">
    <aside className="auth-split__visual" aria-label="Insidr brand">
      <img src={AUTH_HERO} alt="" className="auth-split__image" loading="eager" decoding="async" />
      <div className="auth-split__visual-scrim" aria-hidden="true" />
      <div className="auth-split__visual-glow" aria-hidden="true" />

      <div className="auth-split__visual-content">
        <BrandLogo size="lg" linkTo="/" showTagline className="auth-brand--on-media" />
        <p className="auth-split__visual-tagline">{heroTagline}</p>
        <ul className="auth-split__visual-points" aria-hidden="true">
          <li>Live AI trade ideas</li>
          <li>Macro sentiment and regime context</li>
          <li>Desk-grade risk tools</li>
        </ul>
      </div>
    </aside>

    <main className="auth-split__panel">
      <div className="auth-split__panel-top">
        <Link to="/" className="auth-split__home-link text-xs font-bold uppercase tracking-widest text-text-muted hover:text-primary transition-colors">
          ← Back to home
        </Link>
      </div>

      <div className="auth-split__panel-scroll">
        <div className="auth-split__panel-inner">
          <div className="auth-split__panel-brand lg:hidden">
            <BrandLogo size="md" linkTo="/" showTagline />
          </div>

          <div className="auth-form-card">
            <header className="auth-form-card__header">
              <h1 className="auth-form-card__title">{title}</h1>
              {subtitle && <p className="auth-form-card__subtitle">{subtitle}</p>}
            </header>

            {children}

            {footer && <footer className="auth-form-card__footer">{footer}</footer>}
          </div>
        </div>
      </div>
    </main>
  </div>
);

export default AuthSplitLayout;
