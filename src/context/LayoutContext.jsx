import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  readNavCollapsed,
  readTerminalLayout,
  writeNavCollapsed,
  writeTerminalLayout,
} from '../utils/layoutPrefs.js';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(readNavCollapsed);
  const [terminal, setTerminal] = useState(readTerminalLayout);

  const chartExpanded = terminal.chartExpanded;
  const newsOpen = terminal.newsOpen && !chartExpanded;
  const headerCompact = terminal.headerCompact || chartExpanded;

  useEffect(() => {
    writeNavCollapsed(isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    writeTerminalLayout(terminal);
    if (terminal.chartExpanded) setIsCollapsed(true);
  }, [terminal]);

  const patchTerminal = useCallback((patch) => {
    setTerminal((prev) => ({ ...prev, ...patch }));
  }, []);

  const setChartExpanded = useCallback((next) => {
    const value = Boolean(next);
    setTerminal((prev) => ({
      ...prev,
      chartExpanded: value,
      headerCompact: value ? true : prev.headerCompact,
      newsOpen: value ? false : prev.newsOpen,
    }));
  }, []);

  const toggleChartExpanded = useCallback(() => {
    setTerminal((prev) => {
      const next = !prev.chartExpanded;
      return {
        ...prev,
        chartExpanded: next,
        headerCompact: next ? true : prev.headerCompact,
        newsOpen: next ? false : true,
      };
    });
  }, []);

  const setNewsOpen = useCallback((next) => {
    const value = Boolean(next);
    setTerminal((prev) => ({
      ...prev,
      newsOpen: value,
      chartExpanded: value ? false : prev.chartExpanded,
    }));
  }, []);

  const toggleNewsOpen = useCallback(() => {
    setTerminal((prev) => {
      if (prev.chartExpanded) {
        return { ...prev, chartExpanded: false, newsOpen: true };
      }
      return { ...prev, newsOpen: !prev.newsOpen };
    });
  }, []);

  const setHeaderCompact = useCallback((next) => {
    patchTerminal({ headerCompact: Boolean(next) });
  }, [patchTerminal]);

  const toggleHeaderCompact = useCallback(() => {
    setTerminal((prev) => ({ ...prev, headerCompact: !prev.headerCompact }));
  }, []);

  const value = useMemo(
    () => ({
      isCollapsed,
      setIsCollapsed,
      chartMode: chartExpanded,
      chartExpanded,
      setChartExpanded,
      toggleChartExpanded,
      newsOpen,
      setNewsOpen,
      toggleNewsOpen,
      headerCompact,
      setHeaderCompact,
      toggleHeaderCompact,
      setChartMode: setChartExpanded,
      toggleChartMode: toggleChartExpanded,
    }),
    [
      isCollapsed,
      chartExpanded,
      newsOpen,
      headerCompact,
      setChartExpanded,
      toggleChartExpanded,
      setNewsOpen,
      toggleNewsOpen,
      setHeaderCompact,
      toggleHeaderCompact,
    ],
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
