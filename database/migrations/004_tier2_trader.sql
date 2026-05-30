-- Tier 2: trader profile, position plan metadata, journal linkage

CREATE TABLE IF NOT EXISTS user_trading_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_size NUMERIC(20, 2) NOT NULL DEFAULT 10000,
  risk_percent_per_trade NUMERIC(6, 3) NOT NULL DEFAULT 1.0,
  max_book_heat_percent NUMERIC(6, 3) NOT NULL DEFAULT 3.0,
  max_open_positions INT NOT NULL DEFAULT 3,
  event_gate_minutes INT NOT NULL DEFAULT 45,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE live_positions
  ADD COLUMN IF NOT EXISTS plan_agreed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE live_positions
  ADD COLUMN IF NOT EXISTS thesis_tag TEXT;

ALTER TABLE live_positions
  ADD COLUMN IF NOT EXISTS risk_percent_used NUMERIC(6, 3);

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS idea_id UUID REFERENCES trade_ideas(id) ON DELETE SET NULL;

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS plan_followed BOOLEAN;

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS thesis_tag TEXT;

CREATE INDEX IF NOT EXISTS idx_trades_user_idea ON trades(user_id, idea_id);
