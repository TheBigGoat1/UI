/** Wrap async route handlers — always return JSON, never crash the process. */
export function safeAsync(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error(`[route] ${req.method} ${req.originalUrl}:`, error.message);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message || "Server error",
        });
      }
    }
  };
}

/** Graceful empty payloads when DB tables are missing or offline. */
export function isDbMissingError(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("relation") ||
    msg.includes("connect") ||
    msg.includes("econnrefused") ||
    msg.includes("timeout")
  );
}
