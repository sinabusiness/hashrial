# Changelog

## v3.1.0 — Production Hardening

### Critical
- upstream.js: Added `connecting` flag to prevent double-connect race condition
- upstream.js: ready() now checks `connected` in addition to `authorized` and `destroyed`

### High
- BTC price: Circuit breaker prevents cascading timeouts during exchange API outages
- BTC price: Background refresh with 30s interval — dashboard never blocks on price fetch
- BTC price: Stale cache served for up to 1 hour when fresh data unavailable
- antpoolPoller.js: Crypto.randomBytes nonce replaces Date.now() — no collision risk
- antpoolPoller.js: Poll cycle timeout (80% of interval) prevents hung cycles
- antpoolPoller.js: Bounded concurrency (3 parallel users) instead of serial polling

### Medium
- fee_shares table: Tracks fee shares independently for Antpool revenue reconciliation
- proxy.js: Fee share counts persisted to DB on disconnect + periodic 5-min flush
- API: /api/admin/fee-shares endpoint for transparency
- API: All catch blocks now log errors (were silent)
- JWT_SECRET: Minimum length increased to 44 characters (32 bytes base64)
- .env.example: Updated JWT generation command

### Low
- proxy.js: Version string updated to v3.1

## v2.0.0 — Full audit fix release

### Critical fixes
- S-01: ExtraNonce1 now correctly captured from upstream subscribe response and relayed to miner
- S-02: Fee routing rewritten — single upstream connection, username rewrite only (was broken separate connection)
- S-03: Fixed import name mismatch (createUpstream → createUpstreamConnection) — proxy no longer crashes on start
- DB-01: Fixed all table names — hashrate_history and earnings_history (was hashrate_snapshots/earnings_snapshots)
- DB-02: Fixed notifications INSERT — title column removed from schema (was NOT NULL causing all inserts to fail)
- DB-03: Removed antpool_subaccount NOT NULL from users schema — registration now works

### High severity fixes
- S-04: Double cleanup() guard added (session.cleaned flag)
- S-05: 64KB buffer cap on proxy and upstream sockets
- S-06: Cumulative share counter in Redis — fee routing survives reconnects
- S-07: Upstream authorize race condition fixed — credentials stored before connect()
- S-09: Socket timeout reduced from 600s to 120s
- A-01: Antpool API rate limiter — proper async queue at 1 req/sec (was unbounded, got banned at 15 users)
- A-03: Proxy worker status takes precedence over API status when fresher than 120s
- A-04: Payout system added — bitcoin_address field, /api/payout/request, /api/payout/history
- SEC-01: CORS no longer uses wildcard — explicit SITE_URL required, startup assertion added
- SEC-02: Rate limiting on auth endpoints (5 attempts / 15min / IP)
- SEC-03: Per-IP connection limit on stratum port (max 50)
- SEC-04: JWT_SECRET length check at startup (min 32 chars)
- UI-02: Dashboard uses same-origin API calls — works in production build
- UI-04: BTC price proxied through backend /api/public/btcprice with 30s server-side cache

### Medium severity fixes
- S-08: Single upstream handles difficulty correctly
- S-10: Subscribe response format matches pool expectations
- S-12: Graceful shutdown waits for in-flight shares
- D-01: SSL cert path consistent between docker-compose and nginx.conf
- D-02: SSL setup documented in README
- D-03: Proxy healthcheck added to docker-compose
- D-04: Resource limits added to all services
- D-05: API port bound to 127.0.0.1 only
- DB-04: Database pruning documented and cron job provided
- DB-05: PG connection pool explicitly configured (max:20)
- SEC-05: Server-side password minimum length (10 chars)
- SEC-06: Redis password no longer in healthcheck command
- SEC-07: Nginx rate limiting zones for auth and API endpoints
- SEC-08: Login timing attack fixed (always runs bcrypt)

### New features
- Payout address management in Settings
- Payout request flow in Earnings page
- Payout history table
- Notifications page (real API data)
- USD equivalent on all BTC values (via proxied BTC price)
- Startup assertions for required environment variables

## v3.0.0 — Code flow analysis fix release

### Critical
- BUG-01: Cyrillic characters in Redis key 'sharестats' → fixed to pure ASCII 'sharestats'
  All share statistics were being written to an unreachable key. Stats now accumulate correctly.
- BUG-04: FEE_SUBACCOUNT has no fallback — proxy now exits at startup if env var missing
  Previously produced 'undefined.workerName' — fee revenue was zero silently.

### High
- BUG-02: upstream.js connect() called twice when authorize() called twice — orphaned TCP socket leak
  Added guard: 'if (socket && !socket.destroyed) return' at top of connect()
- BUG-03: async handleMessage called without await in sync loop — concurrent session state writes
  Added per-session msgQueue + drainQueue() to serialize all message handling
- BUG-06: Antpool API poller queue grew without bound past 25 users — OOM within hours at 50+
  Added pollRunning guard (skips cycle if previous still running)
  Added maxSize cap (500) on RequestQueue to prevent unbounded memory growth
  Changed default POLL_INTERVAL_MS to 120000 (2min) for safer headroom
  pollUser calls now serialized (await in for loop) to prevent Redis storm

### Medium
- BUG-05: Upstream buffer overflow cleared buffer but kept socket alive — mid-stream parse corruption
  Now destroys socket on overflow instead of silently clearing buffer
- BUG-08: Subscribe response sent random subscription IDs, not pool's real IDs
  Added onSubscribe callback in upstream.js to capture resp.result[0]
  Real pool subscription IDs now relayed to miner in subscribe response
- BUG-09: Notifier had no concurrency guard — duplicate notifications on slow DB
  Added notifierRunning flag with finally block guarantee

### Low
- BUG-07: feeShareCount never written in session — sessions.js always returned undefined
  Added feeShareCount:0 to session init, incremented on accepted fee shares
- BUG-10: Redis hgetall called individually per worker — parallel storms on large farms
  Replaced with Promise.all() batch for all workers in a poll cycle
