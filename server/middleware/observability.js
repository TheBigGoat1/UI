import { query } from "../db.js";

function requestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function attachCorrelationId(req, res, next) {
  const id = req.headers["x-request-id"] || requestId();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

export function requestLogger(req, _res, next) {
  const started = Date.now();
  resOnFinish(req, _res, async () => {
    const ms = Date.now() - started;
    const level = ms > 2000 ? "warn" : "info";
    try {
      await query(
        `INSERT INTO system_logs (user_id, level, message, context)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
          req.user?.id || null,
          level,
          "request.completed",
          JSON.stringify({
            requestId: req.requestId,
            path: req.path,
            method: req.method,
            duration_ms: ms,
          }),
        ],
      );
    } catch {
      // ignore logging failures
    }
  });
  next();
}

function resOnFinish(req, res, cb) {
  const done = () => {
    res.off("finish", done);
    cb();
  };
  res.on("finish", done);
}
