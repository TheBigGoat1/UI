import { formatIntervalLabel } from './chartConfig.js';

export function formatConfluence10(idea) {
  const raw =
    idea?.confluence_10 ??
    idea?.confluence_score ??
    idea?.confluenceScore;
  if (raw != null && Number(raw) <= 10) {
    const n = Number(raw);
    return `${Number.isInteger(n) ? n : n.toFixed(1)}/10`;
  }
  const pct = Number(idea?.confidence ?? idea?.winProbability ?? 0);
  if (pct > 10) {
    return `${(pct / 10).toFixed(1)}/10`;
  }
  return '—';
}

export function formatTriggerBadge(idea) {
  const label = idea?.trigger_label;
  if (label) return `Trigger: ${label}`;
  const iv = idea?.trigger_interval;
  if (iv) return `Trigger: ${formatIntervalLabel(iv)}`;
  return 'Trigger: 15m';
}

export const GRADE_STYLES = {
  A: 'idea-grade idea-grade--a',
  B: 'idea-grade idea-grade--b',
  WATCH: 'idea-grade idea-grade--watch',
};

export function gradeLabel(grade) {
  if (grade === 'A') return 'A — Focus';
  if (grade === 'B') return 'B — Valid';
  return 'Watch';
}

export function confidenceTierLabel(idea) {
  return idea?.confidence_tier || (idea?.grade === 'A' ? 'High' : idea?.grade === 'B' ? 'Medium' : 'Watch');
}
