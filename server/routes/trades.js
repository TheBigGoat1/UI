import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { safeAsync, isDbMissingError } from "../utils/safeRoute.js";
import { mapIdeaRow } from "../services/ideaEngine.js";
import { getAllPrices } from "../services/marketData.js";
import {
  getTradingProfile,
  computeBookHeat,
  suggestPositionSize,
} from "../services/tradingProfile.js";

const router = Router();
router.use(requireAuth);

const OPEN_POSITION_SQL = `
  SELECT
    lp.id AS position_id,
    lp.status AS position_status,
    lp.position_size,
    lp.plan_agreed,
    lp.thesis_tag,
    lp.risk_percent_used,
    lp.entry_price AS position_entry_price,
    lp.exit_price AS position_exit_price,
    lp.opened_at AS position_opened_at,
    lp.closed_at AS position_closed_at,
    ti.id,
    ti.user_id,
    ti.symbol,
    ti.direction,
    ti.confidence,
    ti.entry_price,
    ti.stop_loss,
    ti.target_price,
    ti.rationale,
    ti.source_payload,
    ti.created_at
  FROM live_positions lp
  JOIN trade_ideas ti ON ti.id = lp.idea_id
`;

function mapOpenPosition(row) {
  return {
    positionId: row.position_id,
    status: row.position_status,
    position_size: Number(row.position_size),
    plan_agreed: row.plan_agreed,
    thesis_tag: row.thesis_tag,
    entry_price: Number(row.position_entry_price),
    opened_at: row.position_opened_at,
    idea: mapIdeaRow(row),
  };
}

router.post("/flatten-all", async (req, res) => {
  const { rows: open } = await query(
    `${OPEN_POSITION_SQL}
     WHERE lp.user_id = $1 AND lp.status = 'open'
     ORDER BY lp.opened_at ASC`,
    [req.user.id],
  );

  if (!open.length) {
    return res.json({
      success: true,
      data: { closed: 0, positions: [], message: "No open positions to flatten" },
    });
  }

  const prices = await getAllPrices();
  const closed = [];

  for (const pos of open) {
    const positionId = pos.position_id;
    const symbol = pos.symbol;
    let exit = prices[symbol]?.price || Number(pos.position_entry_price) || 0;
    const entry = Number(pos.position_entry_price);
    const isLong = pos.direction === "bullish";
    const pnl = isLong ? exit - entry : entry - exit;
    const journalStatus = pnl >= 0 ? "WIN" : "LOSS";

    await query(
      `UPDATE live_positions
       SET status = 'closed', exit_price = $1, closed_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [exit, positionId, req.user.id],
    );

    await query(
      `INSERT INTO trades (
         user_id, idea_id, symbol, side, entry_price, exit_price, pnl, strategy, status, plan_followed, thesis_tag, opened_at, closed_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
      [
        req.user.id,
        pos.id,
        symbol,
        isLong ? "long" : "short",
        entry,
        exit,
        pnl,
        "Emergency flatten",
        journalStatus,
        pos.plan_agreed || null,
        pos.thesis_tag || null,
        pos.position_opened_at,
      ],
    );

    closed.push({ positionId, symbol, exit_price: exit, pnl, journalStatus });
  }

  res.json({
    success: true,
    data: {
      closed: closed.length,
      positions: closed,
      message: `Closed ${closed.length} position(s) at current market prices`,
    },
  });
});

router.get(
  "/open",
  safeAsync(async (req, res) => {
    try {
      const { rows } = await query(
        `${OPEN_POSITION_SQL}
         WHERE lp.user_id = $1 AND lp.status = 'open'
         ORDER BY lp.opened_at DESC`,
        [req.user.id],
      );
      res.json({ success: true, data: rows.map(mapOpenPosition) });
    } catch (error) {
      if (isDbMissingError(error)) {
        return res.json({ success: true, data: [], meta: { degraded: true } });
      }
      throw error;
    }
  }),
);

router.post("/accept", async (req, res) => {
  const {
    idea_id,
    position_size,
    plan_agreed = false,
    thesis_tag = null,
    risk_percent_used = null,
  } = req.body;
  if (!idea_id) {
    return res.status(400).json({ success: false, error: "idea_id required" });
  }

  const { rows: ideas } = await query(`SELECT * FROM trade_ideas WHERE id = $1`, [
    idea_id,
  ]);
  if (!ideas[0]) {
    return res.status(404).json({ success: false, error: "Idea not found" });
  }

  const idea = mapIdeaRow(ideas[0]);
  const profile = await getTradingProfile(req.user.id);
  const heat = await computeBookHeat(req.user.id, profile, [idea]);

  if (heat.atPositionCap) {
    return res.status(409).json({
      success: false,
      error: `Max open positions (${profile.max_open_positions}) reached — close one before accepting.`,
      data: { heat },
    });
  }
  if (heat.overHeat) {
    return res.status(409).json({
      success: false,
      error: `Book heat would exceed ${profile.max_book_heat_percent}% — reduce size or close a position.`,
      data: { heat },
    });
  }

  const { rows: existing } = await query(
    `SELECT id FROM live_positions
     WHERE user_id = $1 AND idea_id = $2 AND status = 'open'`,
    [req.user.id, idea_id],
  );
  if (existing.length) {
    return res.status(409).json({
      success: false,
      error: "Position already open for this idea",
      data: { id: existing[0].id, status: "open" },
    });
  }

  const sizePreview = suggestPositionSize(idea, profile);
  const size =
    position_size != null && !Number.isNaN(Number(position_size))
      ? Number(position_size)
      : sizePreview.units;

  const prices = await getAllPrices();
  const entry =
    prices[ideas[0].symbol]?.price || Number(ideas[0].entry_price) || 0;

  const { rows } = await query(
    `INSERT INTO live_positions (
       user_id, idea_id, position_size, entry_price, status,
       plan_agreed, thesis_tag, risk_percent_used
     ) VALUES ($1,$2,$3,$4,'open',$5,$6,$7)
     RETURNING id`,
    [
      req.user.id,
      idea_id,
      size,
      entry,
      Boolean(plan_agreed),
      thesis_tag || null,
      risk_percent_used ?? profile.risk_percent_per_trade,
    ],
  );

  res.json({
    success: true,
    data: {
      id: rows[0].id,
      positionId: rows[0].id,
      status: "open",
      entry_price: entry,
      position_size: size,
      sizePreview,
      heat,
    },
  });
});

router.post("/:id/close", async (req, res) => {
  const positionId = req.params.id;
  const exitPriceRaw = req.body?.exit_price;
  const plan_followed = req.body?.plan_followed;

  const { rows: positions } = await query(
    `${OPEN_POSITION_SQL}
     WHERE lp.id = $1 AND lp.user_id = $2 AND lp.status = 'open'`,
    [positionId, req.user.id],
  );

  if (!positions[0]) {
    const closed = await query(
      `SELECT id, status FROM live_positions WHERE id = $1 AND user_id = $2`,
      [positionId, req.user.id],
    );
    if (closed.rows[0]?.status === "closed") {
      return res.json({
        success: true,
        data: { id: positionId, status: "closed", message: "Already closed" },
      });
    }
    return res.status(404).json({ success: false, error: "Open position not found" });
  }

  const pos = positions[0];
  const ideaMapped = mapIdeaRow(pos);
  const prices = await getAllPrices();
  const symbol = pos.symbol;

  let exit = Number(exitPriceRaw);
  if (!exit || Number.isNaN(exit)) {
    exit = prices[symbol]?.price || Number(pos.position_entry_price) || 0;
  }

  const entry = Number(pos.position_entry_price);
  const isLong = pos.direction === "bullish";
  const pnl = isLong ? exit - entry : entry - exit;
  const journalStatus = pnl >= 0 ? "WIN" : "LOSS";
  const stop = Number(pos.stop_loss);
  const target = Number(pos.target_price);
  let followed = plan_followed;
  if (followed == null && stop && target) {
    if (isLong) followed = exit >= entry && pnl >= 0;
    else followed = exit <= entry && pnl >= 0;
  }

  await query(
    `UPDATE live_positions
     SET status = 'closed', exit_price = $1, closed_at = NOW()
     WHERE id = $2 AND user_id = $3`,
    [exit, positionId, req.user.id],
  );

  await query(
    `INSERT INTO trades (
       user_id, idea_id, symbol, side, entry_price, exit_price, pnl, strategy, status,
       plan_followed, thesis_tag, opened_at, closed_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
    [
      req.user.id,
      pos.id,
      symbol,
      isLong ? "long" : "short",
      entry,
      exit,
      pnl,
      ideaMapped.setup_type || "Insidr idea",
      journalStatus,
      followed,
      pos.thesis_tag || null,
      pos.position_opened_at,
    ],
  );

  res.json({
    success: true,
    data: {
      id: positionId,
      positionId,
      status: "closed",
      exit_price: exit,
      pnl,
      journalStatus,
      plan_followed: followed,
    },
  });
});

export default router;
