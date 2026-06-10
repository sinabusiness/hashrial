-- Hashrial Mining Pool — Full Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username          TEXT UNIQUE NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  bitcoin_address   TEXT,
  antpool_subaccount TEXT UNIQUE,           -- set by admin after registration
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  last_login        TIMESTAMPTZ,
  notify_offline    BOOLEAN DEFAULT TRUE,
  notify_hashrate   BOOLEAN DEFAULT TRUE,
  notify_threshold  NUMERIC DEFAULT 20    -- % drop triggers alert
);

-- ── Workers ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_name  TEXT NOT NULL,
  first_seen   TIMESTAMPTZ DEFAULT NOW(),
  last_seen    TIMESTAMPTZ DEFAULT NOW(),
  status       TEXT DEFAULT 'offline',    -- online | offline | invalid
  UNIQUE(user_id, worker_name)
);

-- ── Hashrate history (polled from Antpool every 60s) ──────────
CREATE TABLE IF NOT EXISTS hashrate_history (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_name TEXT,                        -- NULL = account total
  ts          TIMESTAMPTZ DEFAULT NOW(),
  hs_10m      NUMERIC DEFAULT 0,
  hs_1h       NUMERIC DEFAULT 0,
  hs_1d       NUMERIC DEFAULT 0,
  accepted    NUMERIC DEFAULT 0,
  stale       NUMERIC DEFAULT 0,
  duplicate   NUMERIC DEFAULT 0,
  active_workers INT DEFAULT 0
);
CREATE INDEX ON hashrate_history(user_id, ts DESC);
CREATE INDEX ON hashrate_history(user_id, worker_name, ts DESC);

-- ── Earnings history ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS earnings_history (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  ts           TIMESTAMPTZ DEFAULT NOW(),
  balance      NUMERIC DEFAULT 0,
  earn_24h     NUMERIC DEFAULT 0,
  earn_total   NUMERIC DEFAULT 0,
  paid_out     NUMERIC DEFAULT 0,
  settle_date  DATE
);
CREATE INDEX ON earnings_history(user_id, ts DESC);

-- ── Live proxy sessions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS proxy_sessions (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT UNIQUE NOT NULL,
  user_id         UUID REFERENCES users(id),
  worker_name     TEXT NOT NULL,
  remote_ip       TEXT,
  connected_at    TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  shares_accepted BIGINT DEFAULT 0,
  shares_rejected BIGINT DEFAULT 0,
  is_fee_session  BOOLEAN DEFAULT FALSE
);

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,   -- worker_offline|worker_online|hashrate_drop
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON notifications(user_id, read, created_at DESC);
-- v3.1: fee share tracking for revenue reconciliation
CREATE TABLE IF NOT EXISTS fee_shares (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_name  TEXT NOT NULL,
  session_id   TEXT NOT NULL,
  count        BIGINT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, worker_name, session_id)
);
CREATE INDEX IF NOT EXISTS idx_fee_shares_user ON fee_shares(user_id, last_updated DESC);

-- ── Payout Requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_requests (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_btc   NUMERIC NOT NULL,
  address      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  txid         TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX ON payout_requests(user_id, requested_at DESC);
