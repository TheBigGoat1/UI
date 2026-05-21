import React from 'react';
import { Link } from 'react-router-dom';
import brandMark from '../../assets/brand/insidr-mark.png';

const sizes = {
  sm: { mark: 'h-9 w-9', text: 'text-lg leading-none', gap: 'gap-2.5', sub: false },
  md: { mark: 'h-10 w-10', text: 'text-2xl leading-none', gap: 'gap-3', sub: false },
  lg: { mark: 'h-14 w-14', text: 'text-3xl leading-none', gap: 'gap-3.5', sub: true },
  xl: { mark: 'h-24 w-24 md:h-28 md:w-28', text: 'text-4xl leading-none', gap: 'gap-4', sub: true },
};

/**
 * Insidr brand — bull/bear mark + wordmark, aligned for nav and auth.
 */
const BrandLogo = ({
  size = 'md',
  showText = true,
  showTagline = false,
  linkTo,
  className = '',
}) => {
  const s = sizes[size] || sizes.md;

  const content = (
    <span className={`inline-flex items-center ${s.gap} group ${className}`} aria-label="Insidr">
      <span
        className={`logo-mark relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${s.mark} ring-1 ring-white/10 shadow-glow-sm transition-all duration-400 ease-smooth group-hover:ring-primary/50 group-hover:shadow-glow-primary group-hover:scale-[1.03]`}
      >
        <img
          src={brandMark}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_40%] scale-[1.15] transition-transform duration-500 group-hover:scale-[1.22]"
          draggable={false}
        />
        <span className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-primary/25 mix-blend-overlay pointer-events-none" />
        <span className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-2xl pointer-events-none" />
      </span>

      {showText && (
        <span className="flex flex-col justify-center min-w-0">
          <span
            className={`font-heading ${s.text} tracking-[0.18em] text-text-main transition-colors duration-300 group-hover:text-primary`}
          >
            INSIDR
          </span>
          {(showTagline || s.sub) && size !== 'sm' && size !== 'md' && (
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted mt-0.5 hidden sm:block">
              Bull · Bear · Edge
            </span>
          )}
          {showTagline && (size === 'sm' || size === 'md') && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted mt-0.5">
              Trading Intelligence
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl -m-1 p-1"
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default BrandLogo;
