-- ── Referral programme ───────────────────────────────────────────────
-- Hashrial keeps 2% of what a user earns. A referrer receives HALF of the fee
-- taken from the people they brought in — i.e. 1% of those users' gross
-- earnings. It is a split of revenue Hashrial already collects, not an extra
-- charge: the referred user still pays 2% and still receives 98%.
--
-- Deliberately NOT stored as a running balance. Every credit is an immutable
-- row, so the total is always derivable and always auditable. A single mutable
-- counter is how referral programmes end up unreconcilable.

ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_at   TIMESTAMPTZ;

-- The code is a public identifier, so it must be unique and fast to look up.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_users_referred_by   ON users(referred_by);

-- One row per referrer/referred/day.
--
-- The UNIQUE constraint is the important part: the crediting job is idempotent
-- because of it. A poller that runs twice, retries after a timeout, or gets
-- restarted mid-run cannot pay the same day twice — the second insert conflicts
-- instead of silently doubling someone's reward.
CREATE TABLE IF NOT EXISTS referral_earnings (
  id                BIGSERIAL PRIMARY KEY,
  referrer_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settle_date       DATE NOT NULL,
  -- What the referred user grossed that day, kept so a reward can always be
  -- re-derived and explained rather than just asserted.
  referred_gross_btc NUMERIC NOT NULL DEFAULT 0,
  -- The fee Hashrial took from that gross (2%).
  fee_btc            NUMERIC NOT NULL DEFAULT 0,
  -- The referrer's share of that fee (50% of it = 1% of gross).
  reward_btc         NUMERIC NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id, settle_date)
);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings(referrer_id, settle_date DESC);

-- A referrer cannot be their own referrer, and self-referral is the first thing
-- anyone tries. Enforced in the DB so no code path can bypass it.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_no_self_referral;
ALTER TABLE users ADD  CONSTRAINT users_no_self_referral CHECK (referred_by IS NULL OR referred_by <> id);

ALTER TABLE referral_earnings DROP CONSTRAINT IF EXISTS referral_no_self;
ALTER TABLE referral_earnings ADD  CONSTRAINT referral_no_self CHECK (referrer_id <> referred_id);

-- Backfill codes for existing accounts. Short, uppercase, no ambiguous glyphs
-- (no O/0/I/1/L) because these get typed and read aloud.
UPDATE users
   SET referral_code = UPPER(
         TRANSLATE(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FOR 8),
                   'o0i1l', 'QRSTU')
       )
 WHERE referral_code IS NULL;
