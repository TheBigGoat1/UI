import React, { createContext, useContext, useEffect } from 'react';

/** Single Lumio brand palette — no light/dark switching */
const ThemeContext = createContext({
  theme: 'lumio',
  isDark: true,
  isLight: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'lumio');
    root.classList.remove('light', 'dark');
    root.classList.add('lumio');

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#050A14');
  }, []);

  const value = {
    theme: 'lumio',
    setTheme: () => {},
    toggleTheme: () => {},
    isDark: true,
    isLight: false,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
