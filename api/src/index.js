"use strict";
// Hashrial API — v3.1 (production hardening)
// SEC-01: CORS with startup assertion
// SEC-02: rate limiting on auth endpoints
// SEC-04: JWT_SECRET length check (44 chars)
// SEC-05: server-side password minimum length
// DB-03: antpool_subaccount removed from register
// A-04: payout address field + /api/payout endpoint
// UI-02: REACT_APP_API_URL support
// Added: /api/public/btcprice (proxied, cached, circuit breaker)
// v3.1: Error logging in all catch blocks
// v3.1: /api/admin/fee-shares endpoint

const express     = require("express");
const cors        = require("cors");
const bcrypt      = require("bcryptjs");
const jwt         = require("jsonwebtoken");
const rateLimit   = require("express-rate-limit");
const { Pool }    = require("pg");
const Redis       = require("ioredis");
const https       = require("https");
const { startAntpoolPoller } = require("./antpoolPoller");
const { startNotifier }      = require("./notifier");

// v3.1: BTC price circuit breaker state
let btcPriceCircuitOpen = false;
let btcPriceFailures = 0;
const BTC_CIRCUIT_THRESHOLD = 5;
const BTC_CIRCUIT_RESET_MS = 300000; // 5 minutes

// ── Startup assertions ────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 44) {
  console.error("FATAL: JWT_SECRET must be at least 44 characters");
  console.error("Generate with: openssl rand -base64 32");
  process.exit(1);
}
if (!process.env.SITE_URL) {
  console.error("FATAL: SITE_URL must be set (e.g. https://hashrial.com)");
  process.exit(1);
}
if (!process.env.ANTPOOL_API_KEY || process.env.ANTPOOL_API_KEY.length < 8) {
  console.error("FATAL: ANTPOOL_API_KEY must be set (min 8 chars)");
  process.exit(1);
}
if (!process.env.ANTPOOL_API_SECRET || process.env.ANTPOOL_API_SECRET.length < 8) {
  console.error("FATAL: ANTPOOL_API_SECRET must be set (min 8 chars)");
  process.exit(1);
}

const app = express();

// SEC-01: CORS — explicit origin + local fallback in development
const allowedOrigins = [process.env.SITE_URL];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy violation"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "32kb" }));

// ── Security headers ─────────────────────────────────────────
app.use((req, res, next) => {
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  res.set('API-Version', '3.1');
  next();
});

const pg = new Pool({
  host:     process.env.POSTGRES_HOST,
  port:     parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const redis = new Redis({
  host:     process.env.REDIS_HOST,
  port:     parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  tls:      process.env.REDIS_TLS === "true" ? {} : undefined,
  retryStrategy: (t) => Math.min(t * 200, 5000),
});

// ── Rate limiters ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: "Too many registrations from this IP." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Too many requests." },
});
app.use("/api/", apiLimiter);

// ── Auth middleware ───────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Register ──────────────────────────────────────────────────
app.post("/api/auth/register", registerLimiter, async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password)
    return res.status(400).json({ error: "username, email and password required" });
  if (!/^[a-z0-9_]{3,20}$/.test(username))
    return res.status(400).json({ error: "Username: 3-20 chars, lowercase letters/numbers/underscore" });
  if (password.length < 10)
    return res.status(400).json({ error: "Password must be at least 10 characters" });
  try {
    const hash = await bcrypt.hash(password, 12);
    const r = await pg.query(
      `INSERT INTO users(username, email, password_hash)
       VALUES($1,$2,$3) RETURNING id, username, email, created_at`,
      [username, email, hash]
    );
    const user = r.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Username or email already taken" });
    console.error("register error:", e.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ── Login ─────────────────────────────────────────────────────
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const DUMMY_HASH = "$2a$12$dummyhashfortimingnormalization.topreventuserenum";
  try {
    const r = await pg.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = r.rows[0];
    const hash = user ? user.password_hash : DUMMY_HASH;
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok) return res.status(401).json({ error: "Invalid credentials" });

    await pg.query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (e) {
    console.error("login error:", e.message);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const r = await pg.query(
      `SELECT id, username, email, bitcoin_address, created_at, last_login,
              notify_offline, notify_hashrate, notify_threshold
       FROM users WHERE id=$1`, [req.user.id]
    );
    res.json(r.rows[0] || {});
  } catch (e) { console.error("auth/me error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Dashboard overview ────────────────────────────────────────
app.get("/api/dashboard/overview", auth, async (req, res) => {
  try {
    const cached = await redis.get(`pool:overview:${req.user.username}`);
    if (cached) return res.json(JSON.parse(cached));
    const earn = await pg.query(
      "SELECT * FROM earnings_history WHERE user_id=$1 ORDER BY ts DESC LIMIT 1",
      [req.user.id]
    );
    const hr = await pg.query(
      "SELECT * FROM hashrate_history WHERE user_id=$1 AND worker_name IS NULL ORDER BY ts DESC LIMIT 1",
      [req.user.id]
    );
    const e = earn.rows[0] || {};
    const h = hr.rows[0] || {};
    res.json({
      earnings: { balance: e.balance, earn24h: e.earn_24h, earnTotal: e.earn_total, paidOut: e.paid_out },
      hashrate: { hs_10m: h.hs_10m, hs_1h: h.hs_1h, hs_1d: h.hs_1d, active_workers: h.active_workers, accepted: h.accepted, stale: h.stale },
    });
  } catch (e) { console.error("dashboard/overview error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Hashrate chart ────────────────────────────────────────────
app.get("/api/dashboard/hashrate", auth, async (req, res) => {
  const { period = "1h", worker } = req.query;
  try {
    const cached = await redis.get(`pool:hashrate:${req.user.username}:${worker||"all"}:${period}`);
    if (cached) return res.json(JSON.parse(cached));
    const hoursMap = { "7d": 168, "1d": 24, "1h": 2 };
    const hours = hoursMap[period] || 2;
    const q = worker
      ? `SELECT ts,hs_10m,hs_1h,hs_1d,accepted,stale FROM hashrate_history
         WHERE user_id=$1 AND worker_name=$2 AND ts > NOW()-INTERVAL '${hours} hours' ORDER BY ts ASC`
      : `SELECT ts,hs_10m,hs_1h,hs_1d,accepted,stale FROM hashrate_history
         WHERE user_id=$1 AND worker_name IS NULL AND ts > NOW()-INTERVAL '${hours} hours' ORDER BY ts ASC`;
    const r = await pg.query(q, worker ? [req.user.id, worker] : [req.user.id]);
    res.json(r.rows);
  } catch (e) { console.error("dashboard/hashrate error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Workers ───────────────────────────────────────────────────
app.get("/api/dashboard/workers", auth, async (req, res) => {
  try {
    const cached = await redis.get(`pool:workers:${req.user.username}`);
    if (cached) return res.json(JSON.parse(cached));
    const r = await pg.query(
      `SELECT w.worker_name, w.status, w.last_seen,
              s.hs_10m, s.hs_1h, s.hs_1d, s.accepted, s.stale
       FROM workers w
       LEFT JOIN LATERAL (
         SELECT hs_10m, hs_1h, hs_1d, accepted, stale FROM hashrate_history
         WHERE user_id=w.user_id AND worker_name=w.worker_name
         ORDER BY ts DESC LIMIT 1
       ) s ON true
       WHERE w.user_id=$1 ORDER BY w.status DESC, w.last_seen DESC`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (e) { console.error("dashboard/workers error:", e.message); res.status(500).json({ error: "Failed" }); }
});

app.get("/api/dashboard/workers/:name", auth, async (req, res) => {
  try {
    const wq = await pg.query(
      "SELECT * FROM workers WHERE user_id=$1 AND worker_name=$2",
      [req.user.id, req.params.name]
    );
    const sq = await pg.query(
      `SELECT ts,hs_10m,hs_1h,hs_1d,accepted,stale FROM hashrate_history
       WHERE user_id=$1 AND worker_name=$2 AND ts > NOW()-INTERVAL '24 hours' ORDER BY ts ASC`,
      [req.user.id, req.params.name]
    );
    res.json({ worker: wq.rows[0] || null, snapshots: sq.rows });
  } catch (e) { console.error("dashboard/workers/detail error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Earnings ──────────────────────────────────────────────────
app.get("/api/dashboard/earnings", auth, async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  try {
    const cached = await redis.get(`pool:earnings:${req.user.username}:${page}`);
    if (cached) return res.json(JSON.parse(cached));
    const r = await pg.query(
      "SELECT * FROM earnings_history WHERE user_id=$1 ORDER BY ts DESC LIMIT $2 OFFSET $3",
      [req.user.id, Math.min(parseInt(pageSize), 50), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    const total = await pg.query(
      "SELECT COUNT(*) FROM earnings_history WHERE user_id=$1", [req.user.id]
    );
    res.json({ rows: r.rows, total: parseInt(total.rows[0].count), page: parseInt(page) });
  } catch (e) { console.error("dashboard/earnings error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Notifications ─────────────────────────────────────────────
app.get("/api/notifications", auth, async (req, res) => {
  try {
    const r = await pg.query(
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json(r.rows);
  } catch (e) { console.error("notifications error:", e.message); res.status(500).json({ error: "Failed" }); }
});

app.post("/api/notifications/read", auth, async (req, res) => {
  try {
    await pg.query("UPDATE notifications SET read=true WHERE user_id=$1", [req.user.id]);
    res.json({ ok: true });
  } catch (e) { console.error("notifications/read error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Settings ──────────────────────────────────────────────────
app.get("/api/settings/notifications", auth, async (req, res) => {
  try {
    const r = await pg.query(
      "SELECT notify_offline, notify_hashrate, notify_threshold FROM users WHERE id=$1",
      [req.user.id]
    );
    res.json(r.rows[0] || {});
  } catch (e) { console.error("settings/notifications error:", e.message); res.status(500).json({ error: "Failed" }); }
});

app.put("/api/settings/notifications", auth, async (req, res) => {
  const { notify_offline, notify_hashrate, notify_threshold } = req.body || {};
  try {
    await pg.query(
      "UPDATE users SET notify_offline=$1, notify_hashrate=$2, notify_threshold=$3 WHERE id=$4",
      [!!notify_offline, !!notify_hashrate, parseFloat(notify_threshold) || 20, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { console.error("settings/notifications update error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Payout address ────────────────────────────────────────────
app.put("/api/settings/payout-address", auth, async (req, res) => {
  const { bitcoin_address } = req.body || {};
  if (!bitcoin_address) return res.status(400).json({ error: "bitcoin_address required" });
  if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{6,87})$/.test(bitcoin_address))
    return res.status(400).json({ error: "Invalid Bitcoin address" });
  try {
    await pg.query("UPDATE users SET bitcoin_address=$1 WHERE id=$2", [bitcoin_address, req.user.id]);
    res.json({ ok: true });
  } catch (e) { console.error("settings/payout-address error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Payout request ────────────────────────────────────────────
app.post("/api/payout/request", auth, async (req, res) => {
  try {
    const user = await pg.query(
      "SELECT bitcoin_address FROM users WHERE id=$1", [req.user.id]
    );
    if (!user.rows[0]?.bitcoin_address)
      return res.status(400).json({ error: "Set a payout address first in Settings" });

    const bal = await pg.query(
      "SELECT balance FROM earnings_history WHERE user_id=$1 ORDER BY ts DESC LIMIT 1",
      [req.user.id]
    );
    const balance = parseFloat(bal.rows[0]?.balance || 0);
    const MIN_PAYOUT = parseFloat(process.env.MIN_PAYOUT_BTC || "0.001");

    if (balance < MIN_PAYOUT)
      return res.status(400).json({ error: `Minimum payout is ${MIN_PAYOUT} BTC. Current balance: ${balance}` });

    const pending = await pg.query(
      "SELECT id FROM payout_requests WHERE user_id=$1 AND status='pending'",
      [req.user.id]
    );
    if (pending.rows.length > 0)
      return res.status(409).json({ error: "You already have a pending payout request" });

    await pg.query(
      `INSERT INTO payout_requests(user_id, amount_btc, address)
       VALUES($1,$2,$3)`,
      [req.user.id, balance, user.rows[0].bitcoin_address]
    );
    res.json({ ok: true, amount: balance, address: user.rows[0].bitcoin_address });
  } catch (e) {
    console.error("payout request error:", e.message);
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/payout/history", auth, async (req, res) => {
  try {
    const r = await pg.query(
      "SELECT * FROM payout_requests WHERE user_id=$1 ORDER BY requested_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json(r.rows);
  } catch (e) { console.error("payout/history error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Connect info ──────────────────────────────────────────────
app.get("/api/connect", auth, async (req, res) => {
  const host = process.env.SITE_URL.replace("https://", "").replace("http://", "");
  res.json({
    stratum: `stratum+tcp://${host}:3333`,
    username: `${req.user.username}.WORKER_NAME`,
    password: "x",
    note: `Replace WORKER_NAME with any label (e.g. rig01, asic1). 2% pool fee applies.`,
  });
});

// ── BTC price — proxied + cached + circuit breaker (v3.1) ────
const BTC_PRICE_REFRESH_MS = 30000;
const BTC_PRICE_STALE_TTL  = 3600; // serve stale up to 1 hour
const BTC_PRICE_FRESH_TTL  = 30;   // normal cache

async function fetchBtcPriceFromSources() {
  const sources = [
    {
      name: "CoinGecko",
      get: () => new Promise((resolve, reject) => {
        const req = https.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true", { timeout: 5000 }, (res) => {
          let d = "";
          res.on("data", c => d += c);
          res.on("end", () => {
            try {
              const j = JSON.parse(d);
              resolve({ price: j.bitcoin.usd, change: j.bitcoin.usd_24h_change, source: "CoinGecko" });
            } catch { reject(new Error("parse")); }
          });
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
      }),
    },
    {
      name: "Binance",
      get: () => new Promise((resolve, reject) => {
        const r = https.get("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { timeout: 5000 }, (res) => {
          let d = "";
          res.on("data", c => d += c);
          res.on("end", () => {
            try {
              const j = JSON.parse(d);
              resolve({ price: parseFloat(j.lastPrice), change: parseFloat(j.priceChangePercent), source: "Binance" });
            } catch { reject(new Error("parse")); }
          });
        });
        r.on("error", reject);
        r.on("timeout", () => { r.destroy(); reject(new Error("timeout")); });
      }),
    },
  ];
  for (const s of sources) {
    try { return await s.get(); } catch (_) {}
  }
  return null;
}

async function refreshBtcPriceCache() {
  if (btcPriceCircuitOpen) return;
  
  const data = await fetchBtcPriceFromSources();
  if (data) {
    btcPriceFailures = 0;
    btcPriceCircuitOpen = false;
    await redis.set("btcprice:cache", JSON.stringify(data), "EX", BTC_PRICE_FRESH_TTL);
    await redis.set("btcprice:stale", JSON.stringify(data), "EX", BTC_PRICE_STALE_TTL);
    console.log(`[btcprice] updated: $${data.price} (${data.source})`);
  } else {
    btcPriceFailures++;
    console.error(`[btcprice] fetch failed (${btcPriceFailures}/${BTC_CIRCUIT_THRESHOLD})`);
    if (btcPriceFailures >= BTC_CIRCUIT_THRESHOLD) {
      btcPriceCircuitOpen = true;
      console.error(`[btcprice] circuit breaker OPEN — will retry in ${BTC_CIRCUIT_RESET_MS/1000}s`);
      setTimeout(() => {
        btcPriceCircuitOpen = false;
        btcPriceFailures = 0;
        console.log("[btcprice] circuit breaker reset — will retry next cycle");
      }, BTC_CIRCUIT_RESET_MS);
    }
  }
}

setTimeout(refreshBtcPriceCache, 3000);
setInterval(refreshBtcPriceCache, BTC_PRICE_REFRESH_MS);

app.get("/api/public/btcprice", async (req, res) => {
  try {
    const fresh = await redis.get("btcprice:cache");
    if (fresh) return res.json(JSON.parse(fresh));
    
    const stale = await redis.get("btcprice:stale");
    if (stale) {
      res.set("X-Price-Stale", "true");
      return res.json(JSON.parse(stale));
    }
    
    return res.status(503).json({ error: "Price unavailable" });
  } catch (e) {
    console.error("[btcprice] endpoint error:", e.message);
    res.status(500).json({ error: "Failed" });
  }
});

// ── Pool stats (public) ───────────────────────────────────────
app.get("/api/pool/stats", async (req, res) => {
  try {
    const cached = await redis.get("pool:stats");
    if (cached) return res.json(JSON.parse(cached));
    const u = await pg.query("SELECT COUNT(*) FROM users");
    const w = await pg.query("SELECT COUNT(*) FROM workers WHERE status='online'");
    const data = { totalUsers: parseInt(u.rows[0].count), activeWorkers: parseInt(w.rows[0].count) };
    await redis.set("pool:stats", JSON.stringify(data), "EX", 60);
    res.json(data);
  } catch (e) { console.error("pool/stats error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Admin: Fee Share Reconciliation (v3.1) ─────────────────────
app.get("/api/admin/fee-shares", auth, async (req, res) => {
  try {
    const r = await pg.query(
      `SELECT u.username, fs.worker_name, fs.session_id, fs.count, fs.last_updated
       FROM fee_shares fs
       JOIN users u ON u.id = fs.user_id
       ORDER BY fs.last_updated DESC
       LIMIT 100`
    );
    const total = await pg.query("SELECT SUM(count) as total FROM fee_shares");
    res.json({ rows: r.rows, totalFeeShares: parseInt(total.rows[0]?.total || 0) });
  } catch (e) {
    console.error("fee_shares endpoint error:", e.message);
    res.status(500).json({ error: "Failed" });
  }
});

// ── Health ────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    await pg.query("SELECT 1");
    await redis.ping();
    res.json({ status: "ok", ts: Date.now() });
  } catch (e) {
    res.status(503).json({ status: "error", error: e.message });
  }
});

const PORT = parseInt(process.env.API_PORT || "4000");
const server = app.listen(PORT, () => {
  console.log(`Hashrial API on :${PORT}`);
  startAntpoolPoller(pg, redis);
  startNotifier(pg, redis);
});

// ── Graceful shutdown ────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('[shutdown] SIGTERM received — graceful shutdown');
  server.close(async () => {
    await pg.end();
    await redis.quit();
    console.log('[shutdown] Complete');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
});

process.on('SIGINT', async () => {
  console.log('[shutdown] SIGINT received — graceful shutdown');
  server.close(async () => {
    await pg.end();
    await redis.quit();
    console.log('[shutdown] Complete');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
});

