/**
 * Normalize API / network failures into user-facing copy for terminal surfaces.
 */
export function userMessageFromError(err, fallback = 'Something went wrong. Try again.') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err?.response?.data?.message) return String(err.response.data.message);
  if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
    return 'Cannot reach API. Start the server with npm run dev:all';
  }
  if (err?.message) return String(err.message);
  return fallback;
}

export async function runSafe(fn, { onError, fallback } = {}) {
  try {
    return await fn();
  } catch (err) {
    const message = userMessageFromError(err, fallback);
    onError?.(message, err);
    return null;
  }
}
