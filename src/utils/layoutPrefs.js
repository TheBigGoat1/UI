const NAV_KEY = 'insidr_nav_collapsed';
const CHART_MODE_KEY = 'insidr_chart_mode';
const TERMINAL_KEY = 'insidr_terminal_layout';

const DEFAULT_TERMINAL = {
  newsOpen: true,
  chartExpanded: false,
  headerCompact: false,
};

export function readNavCollapsed() {
  try {
    return localStorage.getItem(NAV_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeNavCollapsed(value) {
  try {
    localStorage.setItem(NAV_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function readChartMode() {
  try {
    return localStorage.getItem(CHART_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeChartMode(value) {
  try {
    localStorage.setItem(CHART_MODE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function readTerminalLayout() {
  try {
    const raw = localStorage.getItem(TERMINAL_KEY);
    if (!raw) {
      return {
        ...DEFAULT_TERMINAL,
        chartExpanded: readChartMode(),
      };
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_TERMINAL, ...parsed };
  } catch {
    return { ...DEFAULT_TERMINAL, chartExpanded: readChartMode() };
  }
}

export function writeTerminalLayout(layout) {
  try {
    localStorage.setItem(TERMINAL_KEY, JSON.stringify(layout));
    writeChartMode(Boolean(layout.chartExpanded));
  } catch {
    /* ignore */
  }
}
