// Hashrial API — Cloudflare Worker v3.4

import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis/cloudflare";
import jwt from "@tsndr/cloudflare-worker-jwt";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'",
};

function getCorsHeaders(env, request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = [env.SITE_URL, "http://localhost:3000", "http://localhost:5173"];
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200, env, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...SECURITY_HEADERS, ...getCorsHeaders(env, request) },
  });
}
function err(msg, s, env, request) { return json({ error: msg }, s, env, request); }

async function getUser(env, auth) {
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const valid = await jwt.verify(auth.slice(7), env.JWT_SECRET);
    if (!valid) return null;
    const payload = jwt.decode(auth.slice(7));
    return payload?.payload || null;
  } catch { return null; }
}

function randomToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}
async function hashToken(t) {
  const enc = new TextEncoder();
  const data = enc.encode(t);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const arr = new Uint8Array(buf);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

function strongPassword(pw) {
  if (pw.length < 10) return "Password must be at least 10 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain a number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain a special character";
  return null;
}

async function checkTokenBlacklist(adminDb, user) {
  if (!user?.jti) return true;
  const { data } = await adminDb.from("token_blacklist").select("id").eq("jti", user.jti).gt("expires_at", new Date().toISOString()).limit(1);
  if (data?.length > 0) return false;
  return true;
}

async function checkRateLimit(redis, key, limit, windowSec) {
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSec);
    return current <= limit;
  } catch { return true; }
}

// ── Password hashing with Web Crypto scrypt ─────────────────────
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SCRYPT_SALTLEN = 16;

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SCRYPT_SALTLEN));
  const passwordBuf = new TextEncoder().encode(password);
  const derivedKey = await crypto.subtle.importKey("raw", passwordBuf, "PBKDF2", false, ["deriveBits"]);
  const keyBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    derivedKey,
    SCRYPT_KEYLEN * 8
  );
  const keyArr = new Uint8Array(keyBits);
  const saltHex = Array.from(salt, b => b.toString(16).padStart(2, "0")).join("");
  const keyHex = Array.from(keyArr, b => b.toString(16).padStart(2, "0")).join("");
  return `$pbkdf2$100000$${saltHex}$${keyHex}`;
}

async function verifyPassword(password, storedHash) {
  if (storedHash && storedHash.startsWith("$2")) {
    const bcrypt = (await import("bcryptjs")).default;
    return new Promise((resolve) => {
      bcrypt.compare(password, storedHash, (err, result) => resolve(err ? false : result));
    });
  }
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 5 || parts[1] !== "pbkdf2") return false;
    const iterations = parseInt(parts[2]);
    const saltHex = parts[3];
    const expectedKeyHex = parts[4];
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const passwordBuf = new TextEncoder().encode(password);
    const derivedKey = await crypto.subtle.importKey("raw", passwordBuf, "PBKDF2", false, ["deriveBits"]);
    const keyBits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      derivedKey,
      SCRYPT_KEYLEN * 8
    );
    const keyHex = Array.from(new Uint8Array(keyBits), b => b.toString(16).padStart(2, "0")).join("");
    return keyHex === expectedKeyHex;
  } catch { return false; }
}

const POOL_COUNT = 100;
const POOL_NAMES = (() => {
  const names = [];
  const regions = ["US", "EU", "Asia", "US-West", "EU-West", "Asia-East", "US-East", "EU-East", "Asia-West", "US-Central"];
  for (let i = 1; i <= POOL_COUNT; i++) {
    const region = i <= regions.length ? regions[i - 1] : "";
    names.push(region ? `Pool ${i} (${region})` : `Pool ${i}`);
  }
  return names;
})();

async function assignPool(adminDb) {
  try {
    const { data: rows } = await adminDb.rpc
      ? await adminDb.from("users").select("pool_index").gt("pool_index", 0)
      : { data: [] };
    const counts = {};
    for (const r of (rows || [])) {
      counts[r.pool_index] = (counts[r.pool_index] || 0) + 1;
    }
    let best = 1;
    let bestCount = Infinity;
    for (let i = 1; i <= POOL_COUNT; i++) {
      const c = counts[i] || 0;
      if (c < bestCount) { bestCount = c; best = i; }
    }
    return best;
  } catch { return 1; }
}

function getPoolName(index) {
  return POOL_NAMES[index - 1] || `Pool ${index}`;
}

function getPoolSubaccount(poolIndex, username) {
  return `hashrial${poolIndex}.${username}`;
}

function isValidBtcAddress(addr) {
  if (!addr) return false;
  if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{6,87})$/.test(addr)) return false;
  if (addr.startsWith("bc1")) {
    const dataPart = addr.slice(2);
    if (dataPart.length < 8 || dataPart.length > 90) return false;
    if (!/^[a-z0-9]+$/.test(dataPart)) return false;
    return true;
  }
  const base58chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  for (const c of addr) { if (!base58chars.includes(c)) return false; }
  try {
    let num = 0n;
    for (const c of addr) { num = num * 58n + BigInt(base58chars.indexOf(c)); }
    const hex = num.toString(16);
    if (hex.length < 4) return false;
    return true;
  } catch { return false; }
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
    const path = url.pathname.replace("/api", "") || "/";
    const method = request.method;
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: getCorsHeaders(env, request) });
    }

    const adminDb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    let redis;
    try {
      redis = new Redis({ url: env.UPSTASH_REDIS_URL, token: env.UPSTASH_REDIS_TOKEN });
    } catch {
      redis = { get: async () => null, set: async () => {}, del: async () => {}, incr: async () => 0, expire: async () => {}, ping: async () => {} };
    }
    const user = await getUser(env, request.headers.get("Authorization") || "");
    let body = {};
    if (["POST", "PUT"].includes(method)) { try { body = await request.json(); } catch {} }

    const authRateKey = `rl:auth:${ip}`;
    const apiRateKey = `rl:api:${ip}`;
    const isAuthRoute = path.startsWith("/auth/");

    if (isAuthRoute) {
      if (!(await checkRateLimit(redis, authRateKey, 10, 900))) {
        return err("Too many attempts. Try again in 15 minutes.", 429, env, request);
      }
    } else {
      if (!(await checkRateLimit(redis, apiRateKey, 120, 60))) {
        return err("Too many requests.", 429, env, request);
      }
    }

    if (path === "/health" && method === "GET") {
      try { await adminDb.from("users").select("id").limit(1); return json({ status: "ok", ts: Date.now() }, 200, env, request); }
      catch { return json({ status: "error", error: "Service unavailable" }, 503, env, request); }
    }

    if (path === "/public/btcprice" && method === "GET") {
      try {
        const fresh = await redis.get("btcprice:cache");
        if (fresh) return json(typeof fresh === "string" ? JSON.parse(fresh) : fresh, 200, env, request);
        const stale = await redis.get("btcprice:stale");
        if (stale) {
          const data = typeof stale === "string" ? JSON.parse(stale) : stale;
          return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "X-Price-Stale": "true", ...SECURITY_HEADERS, ...getCorsHeaders(env, request) } });
        }
        return json({ error: "Price unavailable" }, 503, env, request);
      } catch { return json({ error: "Failed" }, 500, env, request); }
    }

    if (path === "/pool/stats" && method === "GET") {
      try {
        const c = await redis.get("pool:stats");
        if (c) return json(typeof c === "string" ? JSON.parse(c) : c, 200, env, request);
        const { count: u } = await adminDb.from("users").select("*", { count: "exact", head: true });
        const { count: w } = await adminDb.from("workers").select("*", { count: "exact", head: true }).eq("status", "online");
        const d = { totalUsers: u || 0, activeWorkers: w || 0 };
        await redis.set("pool:stats", JSON.stringify(d), { ex: 60 });
        return json(d, 200, env, request);
      } catch { return json({ error: "Failed" }, 500, env, request); }
    }

    if (path === "/auth/register" && method === "POST") {
      const { username, email, password } = body || {};
      if (!username || !email || !password) return err("username, email and password required", 400, env, request);
      if (!/^[a-z0-9_]{3,20}$/.test(username)) return err("Username: 3-20 chars, lowercase/numbers/underscore", 400, env, request);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("Invalid email format", 400, env, request);
      const pwErr = strongPassword(password);
      if (pwErr) return err(pwErr, 400, env, request);
      try {
        const pwHash = await hashPassword(password);
        const poolIndex = await assignPool(adminDb);
        const { data: u, error: ie } = await adminDb.from("users").insert({
          username, email, password_hash: pwHash,
          email_verified: false, pool_index: poolIndex,
        }).select("id, username, email, created_at").single();
        if (ie) return ie.code === "23505" ? err("Username or email already taken", 409, env, request) : err("Registration failed: " + (ie.message || ie.code || JSON.stringify(ie)), 500, env, request);
        const jti = crypto.randomUUID();
        const token = await jwt.sign({ id: u.id, username: u.username, jti }, env.JWT_SECRET, { expiresIn: "30d" });
        const vToken = randomToken();
        const vHash = await hashToken(vToken);
        await adminDb.from("email_verification_tokens").insert({
          user_id: u.id, token_hash: vHash, expires_at: new Date(Date.now() + 86400000).toISOString(),
        });
        console.log(`[email] Verification token for ${email}: ${vToken}`);
        return json({ token, user: { id: u.id, username: u.username, email: u.email }, verificationToken: vToken }, 200, env, request);
      } catch (e) { console.error(`[register] ${e.message}`, e.stack); return err("Registration failed: " + e.message, 500, env, request); }
    }

    if (path === "/auth/login" && method === "POST") {
      const { email, password } = body || {};
      if (!email || !password) return err("email and password required", 400, env, request);
      try {
        const { data: users } = await adminDb.from("users").select("*").eq("email", email.toLowerCase().trim()).limit(1);
        const u = users?.[0] || null;
        if (u && u.locked_until && new Date(u.locked_until) > new Date()) {
          const remaining = Math.ceil((new Date(u.locked_until) - new Date()) / 60000);
          return err(`Account locked. Try again in ${remaining} minutes.`, 429, env, request);
        }
        const DUMMY = "$pbkdf2$100000$000000000000000000000000$000000000000000000000000000000000000000000000000";
        const hash = u ? u.password_hash : DUMMY;
        const ok = await verifyPassword(password, hash);
        if (!u || !ok) {
          if (u) {
            const attempts = (u.failed_login_attempts || 0) + 1;
            if (attempts >= 10) {
              await adminDb.from("users").update({
                failed_login_attempts: attempts,
                locked_until: new Date(Date.now() + 900000).toISOString(),
              }).eq("id", u.id);
              return err("Account locked for 15 minutes due to too many failed attempts.", 429, env, request);
            }
            await adminDb.from("users").update({ failed_login_attempts: attempts }).eq("id", u.id);
          }
          return err("Invalid credentials", 401, env, request);
        }
        const jti = crypto.randomUUID();
        await adminDb.from("users").update({
          last_login: new Date().toISOString(),
          failed_login_attempts: 0,
          locked_until: null,
        }).eq("id", u.id);
        const token = await jwt.sign({ id: u.id, username: u.username, jti }, env.JWT_SECRET, { expiresIn: "30d" });
        return json({ token, user: { id: u.id, username: u.username, email: u.email } }, 200, env, request);
      } catch (e) { return err("Login failed", 500, env, request); }
    }

    if (path === "/auth/forgot-password" && method === "POST") {
      const { email } = body || {};
      if (!email) return err("email required", 400, env, request);
      try {
        const { data: users } = await adminDb.from("users").select("id").eq("email", email.toLowerCase().trim()).limit(1);
        if (users?.length > 0) {
          const token = randomToken();
          const hash = await hashToken(token);
          await adminDb.from("password_reset_tokens").insert({
            user_id: users[0].id, token_hash: hash,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          });
          console.log(`[email] Password reset token for ${email}: ${token}`);
        }
        return json({ ok: true, message: "If the email exists, a reset link has been sent." }, 200, env, request);
      } catch (e) { return err("Failed", 500, env, request); }
    }

    if (path === "/auth/reset-password" && method === "POST") {
      const { token, password } = body || {};
      if (!token || !password) return err("token and password required", 400, env, request);
      const pwErr = strongPassword(password);
      if (pwErr) return err(pwErr, 400, env, request);
      try {
        const hash = await hashToken(token);
        const { data: rows } = await adminDb.from("password_reset_tokens")
          .select("user_id").eq("token_hash", hash).eq("used", false)
          .gt("expires_at", new Date().toISOString()).limit(1);
        if (!rows?.length) return err("Invalid or expired reset token", 400, env, request);
        const userId = rows[0].user_id;
        const pwHash = await hashPassword(password);
        await adminDb.from("users").update({
          password_hash: pwHash, password_changed_at: new Date().toISOString(),
          failed_login_attempts: 0, locked_until: null,
        }).eq("id", userId);
        await adminDb.from("password_reset_tokens").update({ used: true }).eq("token_hash", hash);
        await adminDb.from("token_blacklist").delete().eq("user_id", userId);
        return json({ ok: true }, 200, env, request);
      } catch (e) { return err("Failed", 500, env, request); }
    }

    if (path === "/auth/verify-email" && method === "POST") {
      const { token } = body || {};
      if (!token) return err("token required", 400, env, request);
      try {
        const hash = await hashToken(token);
        const { data: rows } = await adminDb.from("email_verification_tokens")
          .select("user_id").eq("token_hash", hash).eq("used", false)
          .gt("expires_at", new Date().toISOString()).limit(1);
        if (!rows?.length) return err("Invalid or expired verification token", 400, env, request);
        await adminDb.from("users").update({ email_verified: true }).eq("id", rows[0].user_id);
        await adminDb.from("email_verification_tokens").update({ used: true }).eq("token_hash", hash);
        return json({ ok: true, message: "Email verified successfully" }, 200, env, request);
      } catch (e) { return err("Failed", 500, env, request); }
    }

    if (!user) return err("Unauthorized", 401, env, request);
    if (!(await checkTokenBlacklist(adminDb, user))) return err("Token revoked", 401, env, request);

    const authHeader = request.headers.get("Authorization") || "";
    const userSupabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    try {
      if (path === "/auth/me" && method === "GET") {
        const { data } = await adminDb.from("users").select("id,username,email,bitcoin_address,created_at,last_login,notify_offline,notify_hashrate,notify_threshold,email_verified,pool_index").eq("id", user.id).single();
        const result = data || {};
        if (result.pool_index > 0) {
          result.pool_name = getPoolName(result.pool_index);
          result.pool_subaccount = getPoolSubaccount(result.pool_index, result.username);
        }
        return json(result, 200, env, request);
      }

      if (path === "/auth/logout" && method === "POST") {
        if (user.jti) {
          await adminDb.from("token_blacklist").insert({
            jti: user.jti, user_id: user.id,
            expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
          });
        }
        return json({ ok: true }, 200, env, request);
      }

      if (path === "/auth/change-password" && method === "POST") {
        const { currentPassword, newPassword } = body || {};
        if (!currentPassword || !newPassword) return err("currentPassword and newPassword required", 400, env, request);
        const pwErr = strongPassword(newPassword);
        if (pwErr) return err(pwErr, 400, env, request);
        const { data: users } = await adminDb.from("users").select("password_hash").eq("id", user.id).limit(1);
        if (!users?.length) return err("User not found", 404, env, request);
        const ok = await verifyPassword(currentPassword, users[0].password_hash);
        if (!ok) return err("Current password is incorrect", 401, env, request);
        const pwHash = await hashPassword(newPassword);
        await adminDb.from("users").update({ password_hash: pwHash, password_changed_at: new Date().toISOString() }).eq("id", user.id);
        await adminDb.from("token_blacklist").delete().eq("user_id", user.id);
        return json({ ok: true, message: "Password changed. Please log in again." }, 200, env, request);
      }

      if (path === "/dashboard/overview" && method === "GET") {
        const c = await redis.get(`pool:overview:${user.username}`);
        if (c) return json(typeof c === "string" ? JSON.parse(c) : c, 200, env, request);
        const { data: e } = await userSupabase.from("earnings_history").select("balance,earn_24h,earn_total,paid_out").eq("user_id", user.id).order("ts", { ascending: false }).limit(1);
        const { data: h } = await userSupabase.from("hashrate_history").select("hs_10m,hs_1h,hs_1d,active_workers,accepted,stale").eq("user_id", user.id).is("worker_name", null).order("ts", { ascending: false }).limit(1);
        const x = e?.[0] || {}, y = h?.[0] || {};
        const { data: payouts } = await adminDb.from("payout_requests").select("amount_btc").eq("user_id", user.id).neq("status", "failed");
        const totalPaid = (payouts || []).reduce((sum, p) => sum + parseFloat(p.amount_btc || 0), 0);
        const grossBalance = parseFloat(x.balance || 0);
        const availableBalance = Math.max(0, grossBalance - totalPaid);
        return json({
          earnings: { balance: availableBalance, grossBalance, earn24h: x.earn_24h, earnTotal: x.earn_total, paidOut: x.paid_out },
          hashrate: { hs_10m: y.hs_10m, hs_1h: y.hs_1h, hs_1d: y.hs_1d, active_workers: y.active_workers, accepted: y.accepted, stale: y.stale },
        }, 200, env, request);
      }

      if (path === "/dashboard/hashrate" && method === "GET") {
        const period = url.searchParams.get("period") || "1h";
        const worker = url.searchParams.get("worker") || null;
        const hoursMap = { "7d": 168, "1d": 24, "1h": 2 };
        const since = new Date(Date.now() - (hoursMap[period] || 2) * 3600000).toISOString();
        let q = userSupabase.from("hashrate_history").select("ts,hs_10m,hs_1h,hs_1d,accepted,stale").eq("user_id", user.id).gte("ts", since).order("ts", { ascending: true });
        if (worker) q = q.eq("worker_name", worker); else q = q.is("worker_name", null);
        const { data } = await q;
        return json(data || [], 200, env, request);
      }

      if (path === "/dashboard/workers" && method === "GET") {
        const c = await redis.get(`pool:workers:${user.username}`);
        if (c) return json(typeof c === "string" ? JSON.parse(c) : c, 200, env, request);
        const { data: w } = await userSupabase.from("workers").select("worker_name,status,last_seen").eq("user_id", user.id).order("status", { ascending: false }).order("last_seen", { ascending: false });
        const r = await Promise.all((w || []).map(async w2 => {
          const { data: s } = await userSupabase.from("hashrate_history").select("hs_10m,hs_1h,hs_1d,accepted,stale").eq("user_id", user.id).eq("worker_name", w2.worker_name).order("ts", { ascending: false }).limit(1);
          return { ...w2, ...(s?.[0] || {}) };
        }));
        return json(r, 200, env, request);
      }

      if (path.startsWith("/dashboard/workers/") && method === "GET") {
        const wName = decodeURIComponent(url.pathname.split("/dashboard/workers/")[1]);
        if (!wName || wName.length > 256) return err("Invalid worker name", 400, env, request);
        const { data: w } = await userSupabase.from("workers").select("*").eq("user_id", user.id).eq("worker_name", wName).single();
        const since = new Date(Date.now() - 86400000).toISOString();
        const { data: s } = await userSupabase.from("hashrate_history").select("ts,hs_10m,hs_1h,hs_1d,accepted,stale").eq("user_id", user.id).eq("worker_name", wName).gte("ts", since).order("ts", { ascending: true });
        return json({ worker: w || null, snapshots: s || [] }, 200, env, request);
      }

      if (path === "/dashboard/earnings" && method === "GET") {
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
        const ps = Math.min(Math.max(1, parseInt(url.searchParams.get("pageSize") || "20") || 20), 50);
        const { data: rows, count: total } = await userSupabase.from("earnings_history").select("*", { count: "exact" }).eq("user_id", user.id).order("ts", { ascending: false }).range((page - 1) * ps, (page - 1) * ps + ps - 1);
        return json({ rows: rows || [], total: total || 0, page }, 200, env, request);
      }

      if (path === "/notifications" && method === "GET") {
        const { data } = await userSupabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
        return json(data || [], 200, env, request);
      }

      if (path === "/notifications/read" && method === "POST") {
        await userSupabase.from("notifications").update({ read: true }).eq("user_id", user.id);
        return json({ ok: true }, 200, env, request);
      }

      if (path === "/settings/notifications" && method === "GET") {
        const { data } = await userSupabase.from("users").select("notify_offline,notify_hashrate,notify_threshold").eq("id", user.id).single();
        return json(data || {}, 200, env, request);
      }

      if (path === "/settings/notifications" && method === "PUT") {
        const { notify_offline, notify_hashrate, notify_threshold } = body || {};
        const rawThreshold = parseFloat(notify_threshold);
        const threshold = (isNaN(rawThreshold) || !isFinite(rawThreshold) || rawThreshold < 1 || rawThreshold > 100) ? 20 : rawThreshold;
        await userSupabase.from("users").update({ notify_offline: !!notify_offline, notify_hashrate: !!notify_hashrate, notify_threshold: threshold }).eq("id", user.id);
        return json({ ok: true }, 200, env, request);
      }

      if (path === "/settings/payout-address" && method === "PUT") {
        const addr = body?.bitcoin_address;
        if (!addr) return err("bitcoin_address required", 400, env, request);
        if (!isValidBtcAddress(addr)) return err("Invalid Bitcoin address (checksum validation failed)", 400, env, request);
        await userSupabase.from("users").update({ bitcoin_address: addr }).eq("id", user.id);
        return json({ ok: true }, 200, env, request);
      }

      if (path === "/payout/request" && method === "POST") {
        const { data: u } = await userSupabase.from("users").select("bitcoin_address").eq("id", user.id).single();
        if (!u?.bitcoin_address) return err("Set a payout address first in Settings", 400, env, request);
        const { data: e } = await userSupabase.from("earnings_history").select("balance").eq("user_id", user.id).order("ts", { ascending: false }).limit(1);
        const grossBalance = parseFloat(e?.[0]?.balance || 0);
        const { data: payouts } = await adminDb.from("payout_requests").select("amount_btc").eq("user_id", user.id).neq("status", "failed");
        const totalPaid = (payouts || []).reduce((sum, p) => sum + parseFloat(p.amount_btc || 0), 0);
        const availableBalance = Math.max(0, grossBalance - totalPaid);
        const MIN = parseFloat(env.MIN_PAYOUT_BTC || "0.001");
        if (availableBalance < MIN) return err(`Minimum payout is ${MIN} BTC. Available balance: ${availableBalance.toFixed(8)}`, 400, env, request);
        const lockKey = `payout:lock:${user.id}`;
        const lockValue = randomToken();
        const lockSet = await redis.set(lockKey, lockValue, "EX", 5, "NX");
        if (!lockSet) return err("Please wait before submitting another payout request", 429, env, request);
        try {
          const { data: p } = await adminDb.from("payout_requests").select("id").eq("user_id", user.id).eq("status", "pending").limit(1);
          if (p?.length > 0) return err("You already have a pending payout request", 409, env, request);
          const { data: e2 } = await adminDb.from("earnings_history").select("balance").eq("user_id", user.id).order("ts", { ascending: false }).limit(1);
          const bal2 = parseFloat(e2?.[0]?.balance || 0);
          const { data: payouts2 } = await adminDb.from("payout_requests").select("amount_btc").eq("user_id", user.id).neq("status", "failed");
          const paid2 = (payouts2 || []).reduce((sum, p) => sum + parseFloat(p.amount_btc || 0), 0);
          const avail2 = Math.max(0, bal2 - paid2);
          if (avail2 < MIN) return err(`Minimum payout is ${MIN} BTC.`, 400, env, request);
          await adminDb.from("payout_requests").insert({
            user_id: user.id, amount_btc: avail2, address: u.bitcoin_address,
          });
          return json({ ok: true, amount: avail2, address: u.bitcoin_address }, 200, env, request);
        } finally {
          const currentVal = await redis.get(lockKey);
          if (currentVal === lockValue) await redis.del(lockKey);
        }
      }

      if (path === "/payout/history" && method === "GET") {
        const { data } = await userSupabase.from("payout_requests").select("*").eq("user_id", user.id).order("requested_at", { ascending: false }).limit(50);
        return json(data || [], 200, env, request);
      }

      if (path === "/connect" && method === "GET") {
        const host = env.STRATUM_HOST || env.SITE_URL?.replace("https://", "").replace("http://", "") || "hashrial.com";
        const { data: uData } = await adminDb.from("users").select("pool_index").eq("id", user.id).single();
        const poolIndex = uData?.pool_index || 1;
        const subAccount = getPoolSubaccount(poolIndex, user.username);
        return json({
          stratum: `stratum+tcp://${host}:3333`,
          username: `${subAccount}.WORKER_NAME`,
          password: "x",
          note: `Replace WORKER_NAME with any label (e.g. rig01, asic1). 2% pool fee applies.`,
          antpoolSubAccount: subAccount,
          poolIndex,
          poolName: getPoolName(poolIndex),
        }, 200, env, request);
      }

      if (path === "/admin/fee-shares" && method === "GET") {
        const aids = (env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
        if (!aids.includes(user.id)) return err("Forbidden", 403, env, request);
        const { data: rows } = await adminDb.from("fee_shares").select("user_id,worker_name,session_id,count,last_updated").order("last_updated", { ascending: false }).limit(100);
        const uids = [...new Set((rows || []).map(r => r.user_id))];
        const { data: userMap } = uids.length ? await adminDb.from("users").select("id,username").in("id", uids) : { data: [] };
        const lookup = {}; for (const u of userMap || []) lookup[u.id] = u.username;
        const enriched = (rows || []).map(r => ({ ...r, username: lookup[r.user_id] || "unknown" }));
        const { count: totalFeeShares } = await adminDb.from("fee_shares").select("*", { count: "exact", head: true });
        return json({ rows: enriched, totalFeeShares: totalFeeShares || 0 }, 200, env, request);
      }

      return err("Not found", 404, env, request);
    } catch (e) {
      console.error(`[api] ${path} error:`, e.message);
      return err("Internal error", 500, env, request);
    }
    } catch (outer) {
      return new Response(JSON.stringify({ error: outer.message, stack: outer.stack }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
