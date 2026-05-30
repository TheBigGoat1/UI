import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Sun / moon toggle — landing nav, dashboard sidebar, settings.
 */
const ThemeToggle = ({ className = '', size = 'md', showLabel = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${showLabel ? 'gap-2 px-3' : ''} ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <Sun size={iconSize} aria-hidden="true" className="text-primary" />
      ) : (
        <Moon size={iconSize} aria-hidden="true" className="text-secondary" />
      )}
      {showLabel && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
      <span className="sr-only">{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
    </button>
  );
};

export default ThemeToggle;
