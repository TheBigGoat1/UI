const NAV_KEY = 'insidr_nav_collapsed';
const CHART_MODE_KEY = 'insidr_chart_mode';

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
