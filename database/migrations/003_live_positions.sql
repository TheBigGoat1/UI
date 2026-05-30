CREATE TABLE IF NOT EXISTS live_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id UUID NOT NULL REFERENCES trade_ideas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  position_size NUMERIC(20, 8) NOT NULL DEFAULT 1,
  entry_price NUMERIC(20, 8),
  exit_price NUMERIC(20, 8),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_positions_user_status ON live_positions(user_id, status);
