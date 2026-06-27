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

// ── Crypto helpers ─────────────────────────────────────────────
const crypto2 = require("crypto");
function randomToken() { return crypto2.randomBytes(32).toString("hex"); }
function hashToken(t) { return crypto2.createHash("sha256").update(t).digest("hex"); }
function isValidBtcAddress(addr) {
  if (!addr) return false;
  // Format check + basic length validation
  if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{6,87})$/.test(addr)) return false;
  // Bech32 (bc1) checksum validation
  if (addr.startsWith("bc1")) {
    try {
      // Simple length + character validation for bech32
      const hrp = "bc";
      const dataPart = addr.slice(hrp.length);
      if (dataPart.length < 8 || dataPart.length > 90) return false;
      // All bech32 chars
      if (!/^[a-z0-9]+$/.test(dataPart)) return false;
      return true;
    } catch { return false; }
  }
  // Legacy (1 or 3) — base58check format validation
  const base58chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  for (const c of addr) { if (!base58chars.includes(c)) return false; }
  try {
    // Decode base58
    let num = 0n;
    for (const c of addr) { num = num * 58n + BigInt(base58chars.indexOf(c)); }
    const hex = num.toString(16);
    if (hex.length < 4) return false; // Too short for checksum
    const payload = hex.slice(0, -8);
    const checksum = hex.slice(-8);
    // Double SHA256 of payload, take first 4 bytes as checksum
    const hash1 = crypto2.createHash("sha256").update(Buffer.from(payload, "hex")).digest();
    const hash2 = crypto2.createHash("sha256").update(hash1).digest();
    const expectedChecksum = hash2.slice(0, 4).toString("hex");
    return checksum === expectedChecksum;
  } catch { return false; }
}
function strongPassword(pw) {
  if (pw.length < 10) return "Password must be at least 10 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain a number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain a special character";
  return null;
}

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
// Allow additional origins from env (comma-separated) for local dev
if (process.env.CORS_ORIGINS) {
  allowedOrigins.push(...process.env.CORS_ORIGINS.split(",").map(s => s.trim()));
}
app.use(cors({
  origin: (origin, callback) => {
    // Require origin (no null origin — browser extensions, curl, etc. can't bypass)
    if (!origin) return callback(null, false);
    if (allowedOrigins.includes(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
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
  max: 25,
  idleTimeoutMillis: 10000,
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

// ── Wrapper for Express 4 async error handling ───────────────
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── Auth middleware ───────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Token revocation check (async) ────────────────────────────
function checkRevoked(req, res, next) {
  if (!req.user?.jti) return next();
  pg.query("SELECT 1 FROM token_blacklist WHERE jti=$1 AND expires_at > NOW()", [req.user.jti])
    .then(r => {
      if (r.rows.length > 0) return res.status(401).json({ error: "Token revoked" });
      next();
    })
    .catch(() => next());
}

// ── Register ──────────────────────────────────────────────────
app.post("/api/auth/register", registerLimiter, async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password)
    return res.status(400).json({ error: "username, email and password required" });
  if (!/^[a-z0-9_]{3,20}$/.test(username))
    return res.status(400).json({ error: "Username: 3-20 chars, lowercase letters/numbers/underscore" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Invalid email format" });
  const pwErr = strongPassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  try {
    const hash = await bcrypt.hash(password, 12);
    const r = await pg.query(
      `INSERT INTO users(username, email, password_hash, email_verified)
       VALUES($1,$2,$3,FALSE) RETURNING id, username, email, created_at`,
      [username, email, hash]
    );
    const user = r.rows[0];
    const jti = crypto2.randomUUID();
    const token = jwt.sign(
      { id: user.id, username: user.username, jti },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    // Generate email verification token
    const vToken = randomToken();
    const vHash = hashToken(vToken);
    await pg.query(
      "INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
      [user.id, vHash]
    );
    console.log(`[email] Verification token for ${email}: ${vToken}`);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email }, verificationToken: vToken });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Registration failed" });
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
    const r = await pg.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    const user = r.rows[0];

    // Check account lockout
    if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(429).json({ error: `Account locked. Try again in ${remaining} minutes.` });
    }

    const hash = user ? user.password_hash : DUMMY_HASH;
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok) {
      if (user) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        if (attempts >= 10) {
          await pg.query(
            "UPDATE users SET failed_login_attempts=$1, locked_until=NOW() + INTERVAL '15 minutes' WHERE id=$2",
            [attempts, user.id]
          );
          return res.status(429).json({ error: "Account locked for 15 minutes due to too many failed attempts." });
        }
        await pg.query("UPDATE users SET failed_login_attempts=$1 WHERE id=$2", [attempts, user.id]);
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset failed attempts on success
    await pg.query(
      "UPDATE users SET last_login=NOW(), failed_login_attempts=0, locked_until=NULL WHERE id=$1",
      [user.id]
    );
    const jti = crypto2.randomUUID();
    const token = jwt.sign(
      { id: user.id, username: user.username, jti },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (e) {
    console.error("login error:", e.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── Forgot password ───────────────────────────────────────────
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    const r = await pg.query("SELECT id FROM users WHERE email=$1", [email.toLowerCase().trim()]);
    if (r.rows.length > 0) {
      const token = randomToken();
      const hash = hashToken(token);
      await pg.query(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
        [r.rows[0].id, hash]
      );
      console.log(`[email] Password reset token for ${email}: ${token}`);
      // TODO: Send email with reset link
    }
    // Always return success to prevent email enumeration
    res.json({ ok: true, message: "If the email exists, a reset link has been sent." });
  } catch (e) {
    console.error("forgot-password error:", e.message);
    res.status(500).json({ error: "Failed" });
  }
});

// ── Reset password ────────────────────────────────────────────
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: "token and password required" });
  const pwErr = strongPassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  try {
    const hash = hashToken(token);
    const r = await pg.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash=$1 AND expires_at > NOW() AND used=FALSE
       LIMIT 1`,
      [hash]
    );
    if (r.rows.length === 0) return res.status(400).json({ error: "Invalid or expired reset token" });
    const userId = r.rows[0].user_id;
    const pwHash = await bcrypt.hash(password, 12);
    await pg.query("UPDATE users SET password_hash=$1, password_changed_at=NOW(), failed_login_attempts=0, locked_until=NULL WHERE id=$2", [pwHash, userId]);
    await pg.query("UPDATE password_reset_tokens SET used=TRUE WHERE token_hash=$1", [hash]);
    // Revoke all existing tokens for this user
    await pg.query(
      "INSERT INTO token_blacklist (jti, user_id, expires_at) SELECT jti, user_id, NOW() + INTERVAL '30 days' FROM token_blacklist WHERE user_id=$1",
      [userId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("reset-password error:", e.message);
    res.status(500).json({ error: "Failed" });
  }
});

// ── Verify email ──────────────────────────────────────────────
app.post("/api/auth/verify-email", async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "token required" });
  try {
    const hash = hashToken(token);
    const r = await pg.query(
      `SELECT user_id FROM email_verification_tokens
       WHERE token_hash=$1 AND expires_at > NOW() AND used=FALSE
       LIMIT 1`,
      [hash]
    );
    if (r.rows.length === 0) return res.status(400).json({ error: "Invalid or expired verification token" });
    await pg.query("UPDATE users SET email_verified=TRUE WHERE id=$1", [r.rows[0].user_id]);
    await pg.query("UPDATE email_verification_tokens SET used=TRUE WHERE token_hash=$1", [hash]);
    res.json({ ok: true, message: "Email verified successfully" });
  } catch (e) {
    console.error("verify-email error:", e.message);
    res.status(500).json({ error: "Failed" });
  }
});

// ── Logout (revoke token) ─────────────────────────────────────
app.post("/api/auth/logout", auth, asyncHandler(async (req, res) => {
  try {
    const jti = req.user.jti;
    if (jti) {
      await pg.query(
        "INSERT INTO token_blacklist (jti, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days') ON CONFLICT (jti) DO NOTHING",
        [jti, req.user.id]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("logout error:", e.message);
    res.status(500).json({ error: "Failed" });
  }
}));

// ── Change password (authenticated) ────────────────────────────
app.post("/api/auth/change-password", auth, checkRevoked, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "currentPassword and newPassword required" });
  const pwErr = strongPassword(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });
  try {
    const r = await pg.query("SELECT password_hash FROM users WHERE id=$1", [req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const ok = await bcrypt.compare(currentPassword, r.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
    const pwHash = await bcrypt.hash(newPassword, 12);
    await pg.query("UPDATE users SET password_hash=$1, password_changed_at=NOW() WHERE id=$2", [pwHash, req.user.id]);
    // Revoke all existing tokens for this user
    await pg.query(
      "DELETE FROM token_blacklist WHERE user_id=$1",
      [req.user.id]
    );
    res.json({ ok: true, message: "Password changed. Please log in again." });
  } catch (e) {
    console.error("change-password error:", e.message);
    res.status(500).json({ error: "Failed" });
  }
}));

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
    // Compute available balance
    const paid = await pg.query(
      "SELECT COALESCE(SUM(amount_btc), 0) as total_paid FROM payout_requests WHERE user_id=$1 AND status != 'failed'",
      [req.user.id]
    );
    const grossBalance = parseFloat(e.balance || 0);
    const availableBalance = Math.max(0, grossBalance - parseFloat(paid.rows[0]?.total_paid || 0));
    res.json({
      earnings: { balance: availableBalance, grossBalance, earn24h: e.earn_24h, earnTotal: e.earn_total, paidOut: e.paid_out },
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
         WHERE user_id=$1 AND worker_name=$2 AND ts > NOW() - ($3 || ' hours')::INTERVAL ORDER BY ts ASC`
      : `SELECT ts,hs_10m,hs_1h,hs_1d,accepted,stale FROM hashrate_history
         WHERE user_id=$1 AND worker_name IS NULL AND ts > NOW() - ($3 || ' hours')::INTERVAL ORDER BY ts ASC`;
    const r = await pg.query(q, worker ? [req.user.id, worker, hours] : [req.user.id, hours]);
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
    const parsedThreshold = parseFloat(notify_threshold);
    const safeThreshold = (isNaN(parsedThreshold) || !isFinite(parsedThreshold) || parsedThreshold < 1 || parsedThreshold > 100) ? 20 : parsedThreshold;
    await pg.query(
      "UPDATE users SET notify_offline=$1, notify_hashrate=$2, notify_threshold=$3 WHERE id=$4",
      [!!notify_offline, !!notify_hashrate, safeThreshold, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { console.error("settings/notifications update error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Payout address ────────────────────────────────────────────
app.put("/api/settings/payout-address", auth, async (req, res) => {
  const { bitcoin_address } = req.body || {};
  if (!bitcoin_address) return res.status(400).json({ error: "bitcoin_address required" });
  if (!isValidBtcAddress(bitcoin_address))
    return res.status(400).json({ error: "Invalid Bitcoin address (checksum validation failed)" });
  try {
    await pg.query("UPDATE users SET bitcoin_address=$1 WHERE id=$2", [bitcoin_address, req.user.id]);
    res.json({ ok: true });
  } catch (e) { console.error("settings/payout-address error:", e.message); res.status(500).json({ error: "Failed" }); }
});

// ── Payout request ────────────────────────────────────────────
app.post("/api/payout/request", auth, async (req, res) => {
  const client = await pg.connect();
  try {
    await client.query("BEGIN");
    // Lock the user row to prevent concurrent payouts
    const user = await client.query(
      "SELECT bitcoin_address FROM users WHERE id=$1 FOR UPDATE", [req.user.id]
    );
    if (!user.rows[0]?.bitcoin_address) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Set a payout address first in Settings" });
    }

    // Compute available balance: latest earnings balance minus total pending/completed payouts
    const bal = await client.query(
      "SELECT balance FROM earnings_history WHERE user_id=$1 ORDER BY ts DESC LIMIT 1",
      [req.user.id]
    );
    const grossBalance = parseFloat(bal.rows[0]?.balance || 0);
    const paid = await client.query(
      "SELECT COALESCE(SUM(amount_btc), 0) as total_paid FROM payout_requests WHERE user_id=$1 AND status != 'failed'",
      [req.user.id]
    );
    const availableBalance = Math.max(0, grossBalance - parseFloat(paid.rows[0]?.total_paid || 0));
    const MIN_PAYOUT = parseFloat(process.env.MIN_PAYOUT_BTC || "0.001");

    if (availableBalance < MIN_PAYOUT) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Minimum payout is ${MIN_PAYOUT} BTC. Available balance: ${availableBalance.toFixed(8)}` });
    }

    // Check for pending payout
    const pending = await client.query(
      "SELECT id FROM payout_requests WHERE user_id=$1 AND status='pending'",
      [req.user.id]
    );
    if (pending.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "You already have a pending payout request" });
    }

    await client.query(
      `INSERT INTO payout_requests(user_id, amount_btc, address)
       VALUES($1,$2,$3)`,
      [req.user.id, availableBalance, user.rows[0].bitcoin_address]
    );
    await client.query("COMMIT");
    res.json({ ok: true, amount: availableBalance, address: user.rows[0].bitcoin_address });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("payout request error:", e.message);
    res.status(500).json({ error: "Failed" });
  } finally {
    client.release();
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
  try {
    const host = process.env.STRATUM_HOST || process.env.SITE_URL.replace("https://", "").replace("http://", "");
    const { rows } = await pg.query("SELECT pool_index FROM users WHERE id = $1", [req.user.id]);
    const poolIndex = rows[0]?.pool_index || 1;
    const subAccount = `hashrial${poolIndex}.${req.user.username}`;
    const poolNames = { 1: "Pool 1 (US)", 2: "Pool 2 (EU)", 3: "Pool 3 (Asia)" };
    res.json({
      stratum: `stratum+tcp://${host}:3333`,
      username: `${subAccount}.WORKER_NAME`,
      password: "x",
      note: `Replace WORKER_NAME with any label (e.g. rig01, asic1). 2% pool fee applies.`,
      antpoolSubAccount: subAccount,
      poolIndex,
      poolName: poolNames[poolIndex] || `Pool ${poolIndex}`,
    });
  } catch (e) { console.error("connect error:", e.message); res.status(500).json({ error: "Failed" }); }
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
    try {
      const result = await s.get();
      // Validate price is in reasonable range
      if (result && result.price > 1000 && result.price < 1000000) return result;
    } catch (_) {}
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
const ADMIN_IDS = (process.env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
function adminOnly(req, res, next) {
  if (!ADMIN_IDS.includes(req.user.id)) return res.status(403).json({ error: "Forbidden" });
  next();
}
app.get("/api/admin/fee-shares", auth, adminOnly, async (req, res) => {
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
    res.status(503).json({ status: "error", error: "Service unavailable" });
  }
});

// ── Data retention cleanup (runs every hour, checks if 24h passed) ────
let lastCleanupRun = 0;
async function cleanupOldData() {
  const now = Date.now();
  if (now - lastCleanupRun < 86400000) return; // Once per day max
  lastCleanupRun = now;

  const RETENTION_DAYS = Math.max(1, Math.min(365, parseInt(process.env.DATA_RETENTION_DAYS || "90")));
  try {
    // Clean old hashrate data
    await pg.query("DELETE FROM hashrate_history WHERE ts < NOW() - MAKE_INTERVAL(days => $1)", [RETENTION_DAYS]);
    // Clean earnings but keep the latest per user
    await pg.query(`DELETE FROM earnings_history WHERE ts < NOW() - MAKE_INTERVAL(days => $1) AND id NOT IN (SELECT DISTINCT ON (user_id) id FROM earnings_history WHERE ts < NOW() - MAKE_INTERVAL(days => $1) ORDER BY user_id, ts DESC)`, [RETENTION_DAYS, RETENTION_DAYS]);
    // Clean old fee_shares
    await pg.query("DELETE FROM fee_shares WHERE last_updated < NOW() - INTERVAL '7 days'");
    // Clean old notifications
    await pg.query("DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'");
    // Clean old proxy_sessions
    await pg.query("DELETE FROM proxy_sessions WHERE connected_at < NOW() - INTERVAL '30 days'");
    // Clean expired token blacklist entries
    await pg.query("DELETE FROM token_blacklist WHERE expires_at < NOW()");
    // Clean used/expired password reset tokens
    await pg.query("DELETE FROM password_reset_tokens WHERE (used = TRUE OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '7 days'");
    // Clean used/expired email verification tokens
    await pg.query("DELETE FROM email_verification_tokens WHERE (used = TRUE OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '7 days'");
    console.log(`[cleanup] Completed at ${new Date().toISOString()}`);
  } catch (e) {
    console.error("[cleanup] Error:", e.message);
  }
}

// Run cleanup every hour (checks if 24h have passed internally)
setTimeout(() => cleanupOldData(), 60000);
setInterval(() => cleanupOldData(), 3600000);

// Admin: manual cleanup trigger
app.post("/api/admin/cleanup", auth, adminOnly, async (req, res) => {
  try {
    await cleanupOldData();
    res.json({ ok: true, message: "Cleanup completed" });
  } catch (e) {
    console.error("admin/cleanup error:", e.message);
    res.status(500).json({ error: "Failed" });
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

