/** Shared labels + helpers for Insidr / Claude desk analysis UI */

/**
 * Brain orchestration (single responsibility per path):
 * - News brain     → POST /chat/news-insight        (Pro gate, Claude headline read)
 * - Candle brain   → POST /desk/candle-analysis     (no gate, Claude + calendar context)
 * - Calendar brain → POST /desk/calendar-event-analysis (no gate, Claude macro brief)
 *
 * UI: BrainClaudeBadge + BrainAnalysisSections + BrainCalendarInsight + InsidrNewsAnalysis
 */

export const CALENDAR_SECTION_LABELS = [
  { key: 'summary', title: 'Summary' },
  { key: 'transmission', title: 'Transmission' },
  { key: 'upsideSurprise', title: 'Upside surprise' },
  { key: 'downsideSurprise', title: 'Downside surprise' },
  { key: 'deskRead', title: 'Desk read' },
  { key: 'tradingNotes', title: 'Trading notes' },
];

export function isClaudeProvider(provider, aiEnabled = false) {
  return provider === 'anthropic' || aiEnabled === true;
}

export function providerLabel(provider, aiEnabled = false) {
  if (isClaudeProvider(provider, aiEnabled)) return 'Claude desk read';
  if (provider === 'desk_deterministic' || provider === 'deterministic' || provider === 'factual') {
    return 'Live desk rules';
  }
  if (provider === 'factual_model') return 'Model context';
  return provider ? String(provider) : 'Desk analysis';
}

/** Split prose into paragraphs for readable layout */
export function splitAnalysisParagraphs(text) {
  if (!text) return [];
  return String(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
