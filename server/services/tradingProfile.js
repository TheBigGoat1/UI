import { query } from "../db.js";
import { getAssetClass } from "../config/assets.js";

const DEFAULTS = {
  account_size: 10000,
  risk_percent_per_trade: 1.0,
  max_book_heat_percent: 3.0,
  max_open_positions: 3,
  event_gate_minutes: 45,
};

export async function getTradingProfile(userId) {
  if (!userId) return { ...DEFAULTS };
  try {
    const { rows } = await query(
      `SELECT account_size, risk_percent_per_trade, max_book_heat_percent,
              max_open_positions, event_gate_minutes
       FROM user_trading_profile WHERE user_id = $1`,
      [userId],
    );
    if (!rows[0]) return { ...DEFAULTS };
    return {
      account_size: Number(rows[0].account_size),
      risk_percent_per_trade: Number(rows[0].risk_percent_per_trade),
      max_book_heat_percent: Number(rows[0].max_book_heat_percent),
      max_open_positions: Number(rows[0].max_open_positions),
      event_gate_minutes: Number(rows[0].event_gate_minutes),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function upsertTradingProfile(userId, patch) {
  const cur = await getTradingProfile(userId);
  const next = { ...cur, ...patch };
  await query(
    `INSERT INTO user_trading_profile (
       user_id, account_size, risk_percent_per_trade, max_book_heat_percent,
       max_open_positions, event_gate_minutes, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       account_size = EXCLUDED.account_size,
       risk_percent_per_trade = EXCLUDED.risk_percent_per_trade,
       max_book_heat_percent = EXCLUDED.max_book_heat_percent,
       max_open_positions = EXCLUDED.max_open_positions,
       event_gate_minutes = EXCLUDED.event_gate_minutes,
       updated_at = NOW()`,
    [
      userId,
      next.account_size,
      next.risk_percent_per_trade,
      next.max_book_heat_percent,
      next.max_open_positions,
      next.event_gate_minutes,
    ],
  );
  return next;
}

function riskPerIdea(idea, riskPct, accountSize) {
  const entry = Number(idea.entry_price ?? idea.entryPrice);
  const stop = Number(idea.stop_loss ?? idea.stopLoss);
  if (!entry || !stop || entry === stop) return riskPct;
  const riskDist = Math.abs(entry - stop) / entry;
  if (riskDist < 0.0001) return riskPct;
  return Math.min(riskPct, riskPct);
}

/** Book heat = sum of risk% if all open stops hit */
export async function computeBookHeat(userId, profile, extraIdeas = []) {
  const riskPct = profile.risk_percent_per_trade;
  let openRows = [];
  try {
    const { rows } = await query(
      `SELECT ti.symbol, ti.entry_price, ti.stop_loss, ti.direction, ti.source_payload
       FROM live_positions lp
       JOIN trade_ideas ti ON ti.id = lp.idea_id
       WHERE lp.user_id = $1 AND lp.status = 'open'`,
      [userId],
    );
    openRows = rows;
  } catch {
    openRows = [];
  }

  let heat = 0;
  const buckets = { crypto_beta: 0, forex: 0, commodity: 0, index: 0 };

  for (const row of openRows) {
    heat += riskPct;
    const cls = getAssetClass(row.symbol);
    const bucket = cls === "crypto" ? "crypto_beta" : cls;
    buckets[bucket] = (buckets[bucket] || 0) + riskPct;
  }

  for (const idea of extraIdeas) {
    heat += riskPerIdea(idea, riskPct, profile.account_size);
  }

  return {
    heatPercent: Math.round(heat * 100) / 100,
    maxHeatPercent: profile.max_book_heat_percent,
    openCount: openRows.length,
    buckets,
    overHeat: heat > profile.max_book_heat_percent,
    atPositionCap: openRows.length >= profile.max_open_positions,
  };
}

export function suggestPositionSize(idea, profile) {
  const entry = Number(idea.entry_price ?? idea.entryPrice);
  const stop = Number(idea.stop_loss ?? idea.stopLoss);
  const account = profile.account_size;
  const riskPct = profile.risk_percent_per_trade / 100;
  if (!entry || !stop || !account) {
    return { units: 1, riskDollars: null, note: "Set account size in Settings → Trading" };
  }
  const riskPerUnit = Math.abs(entry - stop);
  if (riskPerUnit < 0.00001) {
    return { units: 1, riskDollars: null, note: "Stop too close to entry" };
  }
  const riskDollars = account * riskPct;
  const units = Math.max(0.0001, riskDollars / riskPerUnit);
  return {
    units: Math.round(units * 10000) / 10000,
    riskDollars: Math.round(riskDollars * 100) / 100,
    riskPercent: profile.risk_percent_per_trade,
    note: `~$${riskDollars.toFixed(2)} at risk (${profile.risk_percent_per_trade}% of $${account})`,
  };
}
