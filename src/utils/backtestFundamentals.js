import { intervalStepSec } from './chartCandleIntel.js';

export function periodForDaySpan(days) {
  if (days <= 7) return '1W';
  if (days <= 31) return '1M';
  if (days <= 120) return '3M';
  return '1Y';
}

export function periodForDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '3M';
  const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  return periodForDaySpan(days);
}

export function filterBarsInRange(bars, startDate, endDate) {
  if (!Array.isArray(bars) || !bars.length) return [];
  const startMs = new Date(startDate).setHours(0, 0, 0, 0);
  const endMs = new Date(endDate).setHours(23, 59, 59, 999);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return bars;
  const startSec = startMs / 1000;
  const endSec = endMs / 1000;
  return bars.filter((b) => b?.time >= startSec && b.time <= endSec);
}

function formatClock(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** MRKT-style pill label for a selected candle window */
export function formatCandleWindowLabel(bar, interval) {
  if (!bar?.time) return 'Select a candle';
  const step = intervalStepSec(interval) * 1000;
  const start = new Date(bar.time * 1000);
  const end = new Date(bar.time * 1000 + step);
  const day = start.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return `${formatClock(start)} – ${formatClock(end)} · ${day}`;
}
