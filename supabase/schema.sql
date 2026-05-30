-- INSIDR Core schema (Supabase Postgres)
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  tier text not null default 'free' check (tier in ('free', 'pro', 'elite')),
  setup_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exchange_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exchange text not null check (exchange in ('binance', 'bybit', 'okx')),
  api_key_encrypted text not null,
  api_secret_encrypted text not null,
  passphrase_encrypted text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exchange)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exchange text not null,
  status text not null check (status in ('queued', 'running', 'success', 'failed')),
  inserted_trades int not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exchange text,
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  entry_price numeric(20,8),
  exit_price numeric(20,8),
  quantity numeric(20,8),
  pnl numeric(20,8) default 0,
  r_multiple numeric(10,4),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete set null,
  strategy text,
  emotion text,
  mistakes text[] default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  asset_class text,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  url text not null unique,
  summary text,
  published_at timestamptz not null,
  symbols text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.news_sentiment (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.news_articles(id) on delete cascade,
  sentiment text not null check (sentiment in ('bullish', 'bearish', 'neutral')),
  score numeric(8,4) not null,
  rationale text,
  created_at timestamptz not null default now()
);

create table if not exists public.economic_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text unique,
  country text,
  event text not null,
  impact text,
  actual text,
  forecast text,
  previous text,
  event_time timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.risk_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  environment text not null,
  score numeric(8,4),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  symbol text not null,
  direction text not null check (direction in ('bullish', 'bearish', 'neutral')),
  confidence numeric(5,2) not null default 0,
  entry_price numeric(20,8),
  stop_loss numeric(20,8),
  target_price numeric(20,8),
  rationale text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  level text not null check (level in ('info', 'warn', 'error')),
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_trades_user_created on public.trades(user_id, created_at desc);
create index if not exists idx_news_articles_published on public.news_articles(published_at desc);
create index if not exists idx_events_time on public.economic_events(event_time desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read, created_at desc);

-- Row Level Security
alter table public.users enable row level security;
alter table public.exchange_connections enable row level security;
alter table public.sync_runs enable row level security;
alter table public.trades enable row level security;
alter table public.journal_entries enable row level security;
alter table public.watchlist enable row level security;
alter table public.risk_cache enable row level security;
alter table public.trade_ideas enable row level security;
alter table public.notifications enable row level security;
alter table public.system_logs enable row level security;

-- user-owned read/write
create policy "users_own_row" on public.users
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "exchange_connections_owner" on public.exchange_connections
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sync_runs_owner" on public.sync_runs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "trades_owner" on public.trades
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "journal_owner" on public.journal_entries
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "watchlist_owner" on public.watchlist
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "risk_cache_owner" on public.risk_cache
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "trade_ideas_owner" on public.trade_ideas
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notifications_owner" on public.notifications
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "system_logs_owner" on public.system_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- shared read for public market/news/event caches
alter table public.news_articles enable row level security;
alter table public.news_sentiment enable row level security;
alter table public.economic_events enable row level security;

create policy "public_read_news_articles" on public.news_articles
for select using (true);
create policy "public_read_news_sentiment" on public.news_sentiment
for select using (true);
create policy "public_read_events" on public.economic_events
for select using (true);
