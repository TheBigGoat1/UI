import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  readChartMode,
  readNavCollapsed,
  writeChartMode,
  writeNavCollapsed,
} from '../utils/layoutPrefs.js';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(readNavCollapsed);
  const [chartMode, setChartModeState] = useState(readChartMode);

  useEffect(() => {
    writeNavCollapsed(isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    writeChartMode(chartMode);
    if (chartMode) setIsCollapsed(true);
  }, [chartMode]);

  const setChartMode = useCallback((next) => {
    setChartModeState(Boolean(next));
  }, []);

  const toggleChartMode = useCallback(() => {
    setChartModeState((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      isCollapsed,
      setIsCollapsed,
      chartMode,
      setChartMode,
      toggleChartMode,
    }),
    [isCollapsed, chartMode, setChartMode, toggleChartMode],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return ctx;
}
