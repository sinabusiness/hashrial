-- ── Per-user pool sub-accounts ───────────────────────────────────────
-- Moving from one aggregate pool account to a sub-account per user. The pool
-- then does the per-user accounting itself, which removes the share-splitting
-- that Hashrial currently does on its side.
--
-- Two columns, and the distinction between them matters:
--
--   pool_subaccount               the name. Assigned by Hashrial, derived
--                                 deterministically from the user's id, and
--                                 IMMUTABLE once written.
--   pool_subaccount_provisioned_at  when the POOL confirmed it exists. NULL
--                                 means the name is reserved locally but the
--                                 pool may or may not have it yet.
--
-- The split exists because sub-account creation is not idempotent and, at
-- SpiderPool, a sub-account can never be deleted. So provisioning has exactly
-- two failure modes worth designing for:
--
--   created at the pool, not recorded here  -> retry asks for the SAME name,
--                                              pool says it already exists,
--                                              we record it. Converges.
--   recorded here, not created at the pool  -> provisioned_at stays NULL and
--                                              the job retries it.
--
-- A random name would break the first case: the retry would ask for a
-- different name and leave an orphan sub-account behind that nobody can
-- remove, forever. That is why the name is derived, not generated.
--
-- The name is derived from the user's UUID and NOT from their username. The
-- pool learns nothing about who the user is, which matters given where
-- Hashrial's users are and that most large pools screen against OFAC.

ALTER TABLE users ADD COLUMN IF NOT EXISTS pool_subaccount                TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pool_subaccount_provisioned_at TIMESTAMPTZ;

-- Unique because two users sharing a sub-account name would silently merge
-- their earnings, and — since sub-accounts cannot be deleted — permanently.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pool_subaccount
  ON users(pool_subaccount) WHERE pool_subaccount IS NOT NULL;

-- The name has to satisfy BOTH pools Hashrial is choosing between, so that
-- switching later does not mean re-provisioning every user:
--   SpiderPool  5-20 chars, lowercase letters and digits
--   F2Pool      2-15 chars, lowercase letters and digits, must start a letter
-- The intersection is 5-15, lowercase alphanumeric, leading letter. Enforced
-- here as well as in code, because a name that fails the pool's own validation
-- is rejected at provisioning time and the user simply never mines.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pool_subaccount_format;
ALTER TABLE users ADD  CONSTRAINT users_pool_subaccount_format
  CHECK (pool_subaccount IS NULL OR pool_subaccount ~ '^[a-z][a-z0-9]{4,14}$');

-- Finding who still needs provisioning is a hot path for the backfill job.
CREATE INDEX IF NOT EXISTS idx_users_pool_subaccount_pending
  ON users(id) WHERE pool_subaccount_provisioned_at IS NULL;

-- Deliberately NOT backfilled here. The name is produced by exactly one
-- function (poolSubaccountName in api-worker/src/index.js); reimplementing that
-- derivation in SQL would mean two sources of truth for a permanent identifier
-- that cannot be corrected after the fact. The provisioning job fills it.
