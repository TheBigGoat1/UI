/** Platform usage — shown in Settings → Platform guide */

export const QUICK_START = [
  {
    step: 1,
    title: 'Overview',
    path: '/dashboard',
    action:
      'Pick symbol, interval, and period. Analysis recalculates per timeframe (Higher TF vs your chart). TradingView + risk regime update with the asset.',
  },
  {
    step: 2,
    title: 'Ideas',
    path: '/dashboard/ideas',
    action:
      'Browse saved setups or click Generate New Ideas (Pro/Elite). An empty list is normal when filters hide everything or markets are ranging — see “When a screen looks empty” below.',
  },
  {
    step: 3,
    title: 'Journal',
    path: '/dashboard/journal',
    action: 'Log trades manually or review auto-journal entries when you close accepted ideas.',
  },
  {
    step: 4,
    title: 'Calendar',
    path: '/dashboard/calendar',
    action: 'Navigate by year/month, filter by country and impact, sync macro events.',
  },
  {
    step: 5,
    title: 'News',
    path: '/dashboard/news',
    action: 'Click Sync headlines, then browse global or per-asset feeds.',
  },
  {
    step: 6,
    title: 'Economy',
    path: '/dashboard/economy',
    action:
      '9-country macro intelligence: risk score, AI interpretation, event pipeline. If empty, click Refresh macro data.',
  },
  {
    step: 7,
    title: 'Backtest',
    path: '/dashboard/backtest',
    action:
      'Historical signal simulation (Pro/Elite in production). Use BTCUSD for best data. Empty results mean no signals met your confidence bar.',
  },
  {
    step: 8,
    title: 'Connections',
    path: '/dashboard/connections',
    action: 'Optional: link read-only exchange API keys for future sync.',
  },
];

/** What users see when data is missing — the UI never goes “blank”, it shows guidance */
export const EMPTY_STATE_GUIDE = [
  {
    id: 'ideas-none',
    screen: 'Ideas → Latest (no cards)',
    meaning:
      'The tab is not broken. You either have no saved ideas, filters hide everything, or the last scan found no bullish/bearish setups (common in ranging markets).',
    whatToDo:
      '1) Set Confidence to “All” and Market to “All”. 2) Click Generate New Ideas (requires sign-in + Pro/Elite in production). 3) On first visit, the app may auto-scan once — if still empty, wait for a volatile session and try again.',
  },
  {
    id: 'ideas-filters',
    screen: 'Ideas → “No ideas match these filters”',
    meaning: 'Ideas exist in the database but your confidence tier or asset class filter excludes them.',
    whatToDo: 'Lower confidence to 50%+ or All, or switch Market to All, then refresh.',
  },
  {
    id: 'ideas-open',
    screen: 'Ideas → Open trades (empty)',
    meaning: 'You have not accepted any setup yet. Open trades only appear after you Accept from a card or modal.',
    whatToDo: 'Open a signal card → Accept trade → it appears under Open trades until you close it.',
  },
  {
    id: 'ideas-confluence',
    screen: 'Ideas card shows “92/10” confluence',
    meaning:
      'Old bug: confidence % was shown as /10. New ideas store a true 1–10 confluence score (e.g. 9.2/10). Regenerate ideas to refresh.',
    whatToDo: 'Click Generate New Ideas. Footer should read like 7.5/10 or 9.2/10, never 70/10.',
  },
  {
    id: 'ideas-generate-zero',
    screen: 'After Generate — still empty',
    meaning:
      'The engine scanned forex + crypto but skipped neutral/ranging symbols. This is expected behaviour, not a crash.',
    whatToDo:
      'Try again later, pick crypto assets (often more trend), or check Settings → Platform guide → Data source health.',
  },
  {
    id: 'overview-chart',
    screen: 'Overview → chart area',
    meaning: 'TradingView loads by symbol. Select an asset first; chart needs internet for the embed.',
    whatToDo: 'Click a Major Asset chip. If stuck, restart npm run dev:all and hard-refresh the browser.',
  },
  {
    id: 'economy-empty',
    screen: 'Economy Intelligence (no events)',
    meaning: 'Macro calendar not seeded in the database yet.',
    whatToDo: 'Click Refresh macro data on the Economy page (or run npm run calendar:sync).',
  },
  {
    id: 'backtest-zero',
    screen: 'Backtest → 0 trades',
    meaning: 'No historical bars matched your date range, or no signals passed min confidence.',
    whatToDo: 'Use BTCUSD, 4h, last 30 days, lower min confidence. Read the amber message for data source.',
  },
  {
    id: 'news-empty',
    screen: 'News feed empty',
    meaning: 'NewsAPI keys missing, rate limited, or sync not run.',
    whatToDo: 'Add keys in .env, restart API, click Sync on the News page.',
  },
];

export const FEATURE_GUIDE = [
  {
    id: 'daily-brief',
    title: 'Daily brief (Tier 2)',
    purpose: 'Session command center: regime, book heat, one Today’s Focus, or explicit sit-out.',
    usage:
      'On Overview and Ideas. A-grade = focus candidate; B = valid; Watch = size down. Suppressed list explains correlated ideas held back. Set account size under Settings → Trading for heat % and accept sizing.',
  },
  {
    id: 'overview',
    title: 'Overview dashboard',
    purpose: 'Command center: live prices, TradingView chart, multi-timeframe analysis, macro risk.',
    usage:
      'Daily brief at top. Change Interval and Period — analysis reloads for that TF (RSI/levels on chart TF; structure compares Higher TF vs your chart). Green “In sync” = aligned trends; amber “Divergence” = HTF and chart disagree.',
  },
  {
    id: 'ideas',
    title: 'Trade ideas',
    purpose: 'Actionable setups with entry, stop, target, and confidence — decision support only.',
    usage:
      'Latest: browse generated signals. Open trades: positions you accepted. Generate (Pro/Elite) scans markets; empty result means no trend bias, not a blank bug. Cards show confidence % (top) and confluence as X/10 (footer, e.g. 9.2/10). Trigger badge is execution TF (15m). Crypto is diversified (max 2 same-direction alts with identical structure). Click a card for TradingView + levels, then Accept to track.',
    tiers: 'Generate requires Pro or Elite when billing is enabled. Dev: sign in; generation works for local testing.',
  },
  {
    id: 'journal',
    title: 'Journal',
    purpose: 'Performance history, analytics, and calendar view.',
    usage:
      'Weekly debrief on Overview tab. Accept ideas with plan checkbox + mindset tag — close marks plan-followed. Add manual trades with +. Closed ideas appear with P&L.',
  },
  {
    id: 'calendar',
    title: 'Economic calendar',
    purpose: 'Macro schedule across multiple years and regions.',
    usage:
      'Select year/month, filter impact/country. Sync refreshes economic_events in the database (same data feeds Economy Intelligence).',
  },
  {
    id: 'economy',
    title: 'Economy Intelligence',
    purpose: '9-country macro pipeline: risk score, event counts, AI interpretation, release table.',
    usage:
      'Click a country tile or use the dropdown. Refresh macro data rebuilds the calendar. Claude improves text when ANTHROPIC_API_KEY is set; rule-based text always shows otherwise.',
  },
  {
    id: 'news',
    title: 'News',
    purpose: 'Headlines from NewsAPI, NewsData, CoinDesk, and CryptoPanic.',
    usage: 'Browse latest or filter by asset. Search keywords. Sync pulls new articles through the API.',
  },
  {
    id: 'backtest',
    title: 'Backtest lab',
    purpose: 'Walk-forward test of the same technical bias engine used for ideas.',
    usage:
      'Pick asset (BTCUSD recommended), timeframe, dates, min confidence, R:R → Run simulation. Review win rate, profit factor, signal log. Synthetic OHLC used if live history is rate-limited.',
    tiers: 'Pro/Elite in production. Signed-in dev users can run without Stripe.',
  },
  {
    id: 'connections',
    title: 'Connections',
    purpose: 'Link read-only exchange API keys (optional).',
    usage: 'Add Binance, Bybit, or OKX keys for future sync. Read-only permissions only.',
  },
  {
    id: 'emergency',
    title: 'Emergency flatten',
    purpose: 'Close all positions tracked inside Insidr only.',
    usage:
      'Settings → Safety when you have open accepted ideas. Does not close external broker orders.',
  },
];

export const LEGAL_REMINDERS = [
  'Trade ideas and AI text are educational decision support — not investment advice.',
  'Backtest results are hypothetical and do not guarantee future performance.',
  'Macro and news data may be delayed or synthetic when API limits apply.',
];
