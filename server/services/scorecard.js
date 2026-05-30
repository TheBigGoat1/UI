import { query } from "../db.js";

export async function getScorecard(userId) {
  if (!userId) {
    return {
      sampleSize: 0,
      winRate: null,
      avgR: null,
      totalPnl: 0,
      planFollowedRate: null,
      message: "Sign in and accept trades to build your calibration scorecard.",
    };
  }

  const { rows } = await query(
    `SELECT pnl, status, r_multiple, plan_followed, thesis_tag, strategy, closed_at
     FROM trades
     WHERE user_id = $1 AND closed_at IS NOT NULL
     ORDER BY closed_at DESC
     LIMIT 200`,
    [userId],
  );

  if (!rows.length) {
    return {
      sampleSize: 0,
      winRate: null,
      avgR: null,
      totalPnl: 0,
      planFollowedRate: null,
      message: "No closed trades yet — accept an idea and close it to start your track record.",
    };
  }

  const wins = rows.filter((r) => (r.status || "").toUpperCase() === "WIN").length;
  const rVals = rows.map((r) => Number(r.r_multiple)).filter((n) => !Number.isNaN(n) && n !== 0);
  const avgR = rVals.length
    ? rVals.reduce((a, b) => a + b, 0) / rVals.length
    : null;
  const totalPnl = rows.reduce((s, r) => s + Number(r.pnl || 0), 0);
  const planRows = rows.filter((r) => r.plan_followed != null);
  const planFollowed = planRows.filter((r) => r.plan_followed === true).length;

  return {
    sampleSize: rows.length,
    winRate: Math.round((wins / rows.length) * 1000) / 10,
    avgR: avgR != null ? Math.round(avgR * 100) / 100 : null,
    totalPnl: Math.round(totalPnl * 100) / 100,
    planFollowedRate: planRows.length
      ? Math.round((planFollowed / planRows.length) * 1000) / 10
      : null,
    message: null,
  };
}

export async function getWeeklyDebrief(userId) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { rows } = await query(
    `SELECT symbol, pnl, status, plan_followed, thesis_tag, strategy, emotion, closed_at
     FROM trades
     WHERE user_id = $1 AND closed_at >= $2
     ORDER BY closed_at DESC`,
    [userId, since],
  );

  const totalPnl = rows.reduce((s, r) => s + Number(r.pnl || 0), 0);
  const wins = rows.filter((r) => (r.status || "").toUpperCase() === "WIN").length;
  const planOk = rows.filter((r) => r.plan_followed === true).length;
  const planBad = rows.filter((r) => r.plan_followed === false).length;
  const tags = {};
  for (const r of rows) {
    const t = r.thesis_tag || r.emotion || "untagged";
    tags[t] = (tags[t] || 0) + 1;
  }

  const topTag = Object.entries(tags).sort((a, b) => b[1] - a[1])[0];

  return {
    periodDays: 7,
    trades: rows.length,
    wins,
    winRate: rows.length ? Math.round((wins / rows.length) * 1000) / 10 : null,
    totalPnl: Math.round(totalPnl * 100) / 100,
    planFollowed: planOk,
    ruleBreaks: planBad,
    topTag: topTag ? { tag: topTag[0], count: topTag[1] } : null,
    insight:
      rows.length === 0
        ? "No closed trades this week — paper-review Ideas or accept one setup."
        : planBad > planOk
          ? "Rule breaks outweighed plan-followed trades — tighten size or wait for A-grade only."
          : wins / rows.length >= 0.5
            ? "Process held — keep tagging entries and respecting invalidation."
            : "Tough week — review only A-grade setups and event-gated days.",
  };
}

/** Rough calibration from closed Insidr-tracked trades */
export async function getSetupStatsForSymbol(userId, symbol) {
  const { rows } = await query(
    `SELECT status, pnl, r_multiple FROM trades
     WHERE user_id = $1 AND symbol = $2 AND closed_at IS NOT NULL
     ORDER BY closed_at DESC LIMIT 50`,
    [userId, symbol],
  );
  if (rows.length < 3) {
    return {
      sampleSize: rows.length,
      winRate: null,
      note: "Need 3+ closed trades on this symbol for personal stats.",
    };
  }
  const wins = rows.filter((r) => (r.status || "").toUpperCase() === "WIN").length;
  return {
    sampleSize: rows.length,
    winRate: Math.round((wins / rows.length) * 1000) / 10,
    note: `Your journal: ${wins}/${rows.length} wins on ${symbol}`,
  };
}
