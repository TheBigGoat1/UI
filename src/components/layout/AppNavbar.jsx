import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../brand/BrandLogo';
import ThemeToggle from '../theme/ThemeToggle';
const navLinks = [
  { href: '#platform', label: 'Platform' },
  { href: '#showcase', label: 'Ideas' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
];

const AppNavbar = ({ overlay = false, inChrome = false, scrolled: scrolledProp }) => {
  const [scrolledLocal, setScrolledLocal] = useState(false);

  useEffect(() => {
    if (inChrome) return;
    const onScroll = () => setScrolledLocal(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [inChrome]);

  const scrolled = inChrome ? scrolledProp : scrolledLocal;
  const solid = scrolled || !overlay;

  const chromeHero = inChrome && !scrolled;

  return (
    <header
      className={`landing-chrome__header border-b transition-all duration-500 ease-smooth w-full ${
        inChrome ? 'relative' : overlay ? 'absolute top-0 left-0 right-0 z-50' : 'sticky top-0 z-50'
      } ${
        inChrome
          ? ''
          : solid
            ? 'border-border/50 bg-chrome backdrop-blur-xl shadow-nav'
            : 'border-transparent bg-transparent backdrop-blur-sm'
      }`}
    >
      <div className="nav-shell">
        <BrandLogo
          size="md"
          linkTo="/"
          showTagline={!overlay || scrolled}
          className={chromeHero ? 'landing-chrome__nav-brand' : ''}
        />

        <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center" aria-label="Main">
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`nav-link px-5 py-2.5 text-sm rounded-xl ${
                !inChrome && !solid ? 'text-text-main/90 hover:text-text-main' : ''
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle size="sm" />
          <Link
            to="/login"
            className={`hidden sm:inline-flex px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
              inChrome || solid ? 'nav-link' : 'text-text-main/90 hover:text-text-main nav-link-ghost-hover'
            } ${chromeHero ? '!text-white/95 hover:!text-white' : ''}`}
          >
            Sign In
          </Link>
          <Link to="/register" className="btn-primary text-sm px-5 py-2.5 whitespace-nowrap">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;
