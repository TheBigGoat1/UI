/** User-friendly API errors — never show raw HTTP codes or JSON parse noise. */
export function friendlyApiError(err) {
  const msg = String(err?.error || err?.message || err || '');

  if (/429|rate.?limit|too many requests/i.test(msg)) {
    return 'Market data is temporarily rate-limited. Results will use model OHLC — try again in a minute or use BTCUSD/ETHUSD for live history.';
  }
  if (/JSON|Unexpected token|SyntaxError/i.test(msg)) {
    return 'Market service returned an invalid response. Restart the API with npm run dev:all and try again.';
  }
  if (/401|Unauthorized/i.test(msg)) return 'Sign in to continue.';
  if (/403|Upgrade|capability/i.test(msg)) return 'This feature requires Pro or Elite.';
  if (/network|ECONNREFUSED|offline|unreachable|HTTP 5/i.test(msg)) {
    return 'API offline — run npm run dev:all in the UI-main folder.';
  }
  if (/^HTTP \d{3}$/i.test(msg.trim())) {
    return 'Market data temporarily unavailable. Using model data where possible — retry shortly.';
  }
  return msg || 'Something went wrong. Try again or refresh the page.';
}
