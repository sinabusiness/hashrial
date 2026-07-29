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
// ── Email sending (Resend) ────────────────────────────────────
// Workers have native fetch, so no library needed. env.RESEND_API_KEY must
// be set via `wrangler secret put RESEND_API_KEY` — never in wrangler.toml,
// which is committed to git. EMAIL_FROM's domain must be verified in
// Resend before it delivers to real recipients. Failures are logged and
// swallowed, never thrown.
// EMAIL_FROM is a display header ("Hashrial <noreply@hashrial.com>"). Resend
// takes that string whole; the Cloudflare binding wants the parts separately.
export function parseEmailFrom(value) {
  const s = String(value || "").trim();
  const m = s.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].replace(/^"|"$/g, "") || undefined, email: m[2].trim() };
  return { name: undefined, email: s };
}

// Some clients render only plain text, and a missing text part costs points
// with spam filters — so derive one rather than sending HTML alone.
export function htmlToText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* Resend is the sender. Hashrial uses its own Resend account, separate from
 * صراف's — Resend's free plan verifies one domain per account, and صراف holds
 * the slot on the other one. That keeps both products sending for free.
 *
 * Cloudflare Email Sending is supported as a fallback but is NOT wired up:
 * there is no send_email binding in wrangler.toml, so env.EMAIL is undefined
 * and this path is skipped. It bills monthly; add the binding back only if you
 * decide to pay for it.
 *
 * A 403 from Resend almost always means the `from` domain is not verified in
 * whichever account this key belongs to — the failure that meant no user ever
 * received a verification email. Failures are logged with the response body
 * and never thrown to the caller. */
async function sendEmail(env, { to, subject, html, text }) {
  const from = parseEmailFrom(env.EMAIL_FROM);
  const body = text || htmlToText(html);

  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text: body }),
      });
      if (res.ok) return true;
      const detail = await res.text();
      console.error(`[email] Resend ${res.status} sending to ${to}: ${detail}`);
      if (res.status === 403 || /domain/i.test(detail)) {
        console.error(`[email] verify "${from.email.split("@")[1]}" under Domains in the Resend account this key belongs to`);
      }
    } catch (e) {
      console.error(`[email] Resend request to ${to} threw: ${e.message}`);
    }
  }

  // Only reachable if a send_email binding is added back.
  if (env.EMAIL && from.email) {
    try {
      await env.EMAIL.send({ to, from: { email: from.email, name: from.name }, subject, html, text: body });
      return true;
    } catch (e) {
      console.error(`[email] Cloudflare send to ${to} failed: ${e.code || "?"} ${e.message}`);
    }
  }

  if (!env.RESEND_API_KEY && !env.EMAIL) {
    console.warn(`[email] no sender configured — skipping send to ${to}`);
  }
  return false;
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
  // FIX: also check password_changed_at against the token's iat claim.
  // @tsndr/cloudflare-worker-jwt sets iat automatically at sign time, same
  // as the Node jsonwebtoken library. Without this, a stolen token kept
  // working after a password reset/change — see the two `.delete()` calls
  // on token_blacklist below, which were backwards (they un-revoke entries
  // rather than revoking anything) and have been removed in favor of this
  // single check applied universally to every protected route.
  if (user.iat) {
    const { data: u } = await adminDb.from("users").select("password_changed_at").eq("id", user.id).limit(1);
    const changedAt = u?.[0]?.password_changed_at;
    if (changedAt && user.iat * 1000 < new Date(changedAt).getTime()) return false;
  }
  return true;
}

/* Rate limiting must not silently switch itself off.
 *
 * Every Redis WRITE currently fails — UPSTASH_REDIS_TOKEN is Upstash's
 * read-only token — and the previous `catch { return true }` turned that into
 * "allow everything". Login, register and password-reset have had no
 * brute-force protection at all, with nothing in the logs to say so.
 *
 * Failing CLOSED is not the answer either: it would lock every user out the
 * moment Redis has a problem, and right now that is 100% of the time — the fix
 * would be an immediate outage. So this degrades to a per-isolate in-memory
 * counter. Weaker than a global limit (a Worker runs many isolates, and an
 * attacker spread across them gets a higher effective ceiling), but it is a
 * real ceiling rather than none, and it cannot take the site down. */
const memBuckets = new Map();
let rateLimitDegraded = false;

const MEM_BUCKET_CAP = 5000;

function memoryRateLimit(key, limit, windowSec, now) {
  const b = memBuckets.get(key);
  if (!b || now >= b.reset) {
    if (memBuckets.size >= MEM_BUCKET_CAP) {
      // Drop what has already expired first — free and lossless.
      for (const [k, v] of memBuckets) if (now >= v.reset) memBuckets.delete(k);
      // Still full: evict the LEAST-USED buckets, never the whole map and
      // never by age. Both of those hand an attacker a bypass — clearing
      // resets every counter, and evicting by age removes established
      // counters first, so spraying unique keys would wipe your own limit.
      // Evicting by count keeps the buckets that are actively limiting
      // someone; to displace one you must genuinely out-request it.
      if (memBuckets.size >= MEM_BUCKET_CAP) {
        const leastUsed = [...memBuckets.entries()]
          .sort((x, y) => x[1].count - y[1].count)
          .slice(0, Math.ceil(MEM_BUCKET_CAP / 5));
        for (const [k] of leastUsed) memBuckets.delete(k);
      }
    }
    memBuckets.set(key, { count: 1, reset: now + windowSec * 1000 });
    return true;
  }
  b.count++;
  return b.count <= limit;
}

async function checkRateLimit(redis, key, limit, windowSec) {
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSec);
    return current <= limit;
  } catch (e) {
    if (!rateLimitDegraded) {
      rateLimitDegraded = true;
      console.error(
        `[ratelimit] Redis unavailable (${e.message}) — degraded to per-isolate ` +
        `in-memory limiting. If this says NOPERM, UPSTASH_REDIS_TOKEN is the ` +
        `read-only token and needs replacing with the read-write one.`
      );
    }
    return memoryRateLimit(key, limit, windowSec, Date.now());
  }
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
    // NOTE: cleaned up a leftover `adminDb.rpc ? ... : { data: [] }` ternary
    // here — .rpc is a method reference on every Supabase client, so it's
    // always truthy and that check never actually branched. Removed rather
    // than left in as confusing dead code.
    const { data: rows } = await adminDb.from("users").select("pool_index").gt("pool_index", 0);
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

async function isValidBtcAddress(addr) {
  if (!addr) return false;
  if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{6,87})$/.test(addr)) return false;
  if (addr.startsWith("bc1")) {
    const dataPart = addr.slice(2);
    if (dataPart.length < 8 || dataPart.length > 90) return false;
    if (!/^[a-z0-9]+$/.test(dataPart)) return false;
    return true;
  }
  // FIX: this previously only checked the decoded hex length and then
  // returned true unconditionally — it never actually verified the
  // checksum. That meant a mistyped legacy address (one wrong character)
  // would pass validation, risking a payout going to an address nobody
  // controls, with no way to recover the funds. This decodes properly and
  // verifies the real double-SHA256 checksum, matching Bitcoin's actual
  // base58check format. Leading zero bytes (every address has at least
  // one — the version byte — which is why they start with '1') are
  // explicitly re-prepended since BigInt math would otherwise silently
  // drop them and corrupt the payload/checksum split.
  const base58chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  for (const c of addr) { if (!base58chars.includes(c)) return false; }
  try {
    let leadingZeros = 0;
    for (const c of addr) { if (c === "1") leadingZeros++; else break; }

    let num = 0n;
    for (const c of addr) { num = num * 58n + BigInt(base58chars.indexOf(c)); }

    let hex = num.toString(16);
    if (hex.length % 2) hex = "0" + hex;
    let bytes = new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));

    if (leadingZeros > 0) {
      const padded = new Uint8Array(leadingZeros + bytes.length);
      padded.set(bytes, leadingZeros);
      bytes = padded;
    }

    if (bytes.length !== 25) return false; // version(1) + hash160(20) + checksum(4)

    const payload  = bytes.slice(0, 21);
    const checksum = bytes.slice(21, 25);

    const hash1Buf = await crypto.subtle.digest("SHA-256", payload);
    const hash2Buf = await crypto.subtle.digest("SHA-256", hash1Buf);
    const hash2 = new Uint8Array(hash2Buf);

    for (let i = 0; i < 4; i++) { if (checksum[i] !== hash2[i]) return false; }
    return true;
  } catch { return false; }
}

// ── Price bundle: BTC in USD + FX rates for local-currency display ──────────
// Workers cannot run timers, so this is driven by a Cron Trigger (see
// wrangler.toml [triggers]) and additionally self-heals on a cold cache.

const PRICE_FRESH_TTL = 300;    // 5m — served directly
const PRICE_STALE_TTL = 86400;  // 24h — served with X-Price-Stale when refresh fails

// Currencies offered in the dashboard's price widget. The MENA set mirrors
// what صراف tracks; the rest cover the six UI languages.
const FX_CURRENCIES = [
  "USD","EUR","GBP","AED","SAR","KWD","QAR","BHD","OMR",
  "EGP","IRR","IQD","TRY","CNY","RUB","BRL","INR","PKR",
];

// Several public price APIs refuse Cloudflare's egress IPs (CoinGecko rate
// limits them, Binance geo-blocks some regions outright), so this tries a
// chain and logs why each one failed — a silent catch here is how the price
// feed stayed dead without anyone knowing.
const BTC_SOURCES = [
  {
    name: "CoinGecko",
    url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
    parse: (j) => ({ price: j?.bitcoin?.usd, change: j?.bitcoin?.usd_24h_change ?? 0 }),
  },
  {
    name: "Binance",
    url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
    parse: (j) => ({ price: parseFloat(j?.lastPrice), change: parseFloat(j?.priceChangePercent) }),
  },
  {
    // Ordered before Coinbase because Kraken carries the day's open, so a real
    // 24h change can be derived. Coinbase's spot endpoint has no change at all.
    name: "Kraken",
    url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
    parse: (j) => {
      const k = j?.result && Object.keys(j.result)[0];
      const t = k && j.result[k];
      const price = parseFloat(t?.c?.[0]);
      const open = parseFloat(t?.o);
      return { price, change: open > 0 ? ((price - open) / open) * 100 : null };
    },
  },
  {
    // Last resort: correct price, but no 24h change. Reported as null rather
    // than 0 so the UI hides the indicator instead of claiming the price is flat.
    name: "Coinbase",
    url: "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    parse: (j) => ({ price: parseFloat(j?.data?.amount), change: null }),
  },
];

async function fetchBtcUsd() {
  for (const s of BTC_SOURCES) {
    try {
      const r = await fetch(s.url, { headers: { "User-Agent": "hashrial-pool/1.0" }, cf: { cacheTtl: 60 } });
      if (!r.ok) { console.error(`[btcprice] ${s.name} HTTP ${r.status}`); continue; }
      const { price, change } = s.parse(await r.json());
      if (price > 1000 && price < 1000000) {
        // null means "this source has no 24h change", which the UI hides. Do
        // not coerce to 0 — that renders as a flat price, which is a claim.
        return { price, change: (change === null || !isFinite(change)) ? null : change, source: s.name };
      }
      console.error(`[btcprice] ${s.name} returned an out-of-range price: ${price}`);
    } catch (e) {
      console.error(`[btcprice] ${s.name} threw: ${e.message}`);
    }
  }
  console.error("[btcprice] every source failed");
  return null;
}

async function fetchFxRates(env) {
  let rates = {};
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { cf: { cacheTtl: 3600 } });
    if (r.ok) {
      const j = await r.json();
      if (j?.result === "success" && j.rates) {
        for (const c of FX_CURRENCIES) if (typeof j.rates[c] === "number") rates[c] = j.rates[c];
      }
    }
  } catch {}
  rates.USD = 1;

  // Operator overrides. For currencies with parallel markets the feed and the
  // rate a user can actually transact at diverge — measured 2026-07-29, the
  // feed put IRR at 1,266,355/USD while صراف quoted 1,780,000, so earnings
  // would read ~71% of their real local value. صراف is the operator's own
  // exchange and is the authority for those pairs, so its rate wins here.
  // Set FX_OVERRIDES in wrangler.toml [vars] as JSON, e.g. {"IRR":1780000}
  const overrides = {};
  try {
    const raw = env.FX_OVERRIDES;
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      for (const [k, v] of Object.entries(parsed || {})) {
        const n = Number(v);
        if (isFinite(n) && n > 0) { rates[k] = n; overrides[k] = true; }
      }
    }
  } catch {}

  return { rates, overrides };
}

async function buildPriceBundle(env) {
  const btc = await fetchBtcUsd();
  if (!btc) return null;
  const { rates, overrides } = await fetchFxRates(env);
  return { ...btc, rates, rateOverrides: overrides, ts: Date.now() };
}

async function refreshPriceCache(env, redis) {
  const data = await buildPriceBundle(env);
  if (!data) return null;
  // @upstash/redis SET takes an options OBJECT, not ioredis positional args.
  await redis.set("btcprice:cache", JSON.stringify(data), { ex: PRICE_FRESH_TTL });
  await redis.set("btcprice:stale", JSON.stringify(data), { ex: PRICE_STALE_TTL });
  return data;
}

/* ── Braiins Pool polling ─────────────────────────────────────────────────
   Antpool gives every Hashrial user their own sub-account, so the Antpool
   poller can ask it for per-user numbers directly. Braiins is the opposite
   model: ALL hashrate points at one aggregate account and Braiins knows
   nothing about individual Hashrial users. Attribution has to happen here.

   What makes it work is the worker label. The proxy authorizes miners as
   `hashrial.{user}_{worker}` (poolConfig.js, sharded:false), so Braiins'
   own per-worker rows carry the Hashrial username inside the label. Parse
   the label back out and the aggregate becomes per-user.

   Revenue is split by shares_24h — actual work accepted — not by hashrate,
   which is itself a derived average. The 2% fee needs no separate arithmetic:
   the proxy already routes every 50th share to a `fee.*` worker label, so
   those shares sit outside the user set and are excluded from the split.

   ⚠️ Field names below are from Braiins' published docs, NOT from a verified
   live response. CLAUDE.md records that trusting Antpool's docs over a real
   response meant zero worker rows were written and all hashrate read 0 for
   months. So this validates the shape before writing anything and aborts
   loudly rather than persisting zeros. Run scripts/verify-braiins.js with a
   real token before enabling. */

const BRAIINS_BASE = "https://pool.braiins.com";

async function braiinsFetch(env, path) {
  try {
    const r = await fetch(BRAIINS_BASE + path, {
      headers: { "Pool-Auth-Token": env.BRAIINS_TOKEN, "User-Agent": "hashrial-pool/1.0" },
    });
    if (!r.ok) { console.error(`[braiins] ${path} HTTP ${r.status}`); return null; }
    return await r.json();
  } catch (e) {
    console.error(`[braiins] ${path} threw: ${e.message}`);
    return null;
  }
}

// Payloads are documented as nested under the coin key. Probe both that and
// the bare root so an envelope change surfaces as a validation failure rather
// than as silent zeros.
function braiinsUnwrap(j, key) {
  if (!j || typeof j !== "object") return null;
  const root = (j.btc && typeof j.btc === "object") ? j.btc : j;
  if (!key) return root;
  return root[key] ?? null;
}

// `hashrial.alice_rig01` / `alice_rig01` -> { username: "alice", worker: "rig01" }
// Fee-routed shares carry a `fee.` prefix and belong to no user.
export function parseBraiinsWorkerLabel(label, accountName) {
  if (!label || typeof label !== "string") return null;
  let s = label;
  if (accountName && s.startsWith(accountName + ".")) s = s.slice(accountName.length + 1);
  // Fee-routed shares. "fee-" is the current marker from poolConfig.js; the
  // hyphen cannot occur in a username (^[a-z0-9_]{3,20}$) so it can never be
  // mistaken for a real user. "fee." and a bare "fee" are still recognised so
  // shares submitted before the marker changed are not attributed to a phantom
  // user and silently paid out.
  if (s.startsWith("fee-") || s.startsWith("fee.") || s === "fee") return { fee: true };
  const i = s.indexOf("_");
  if (i <= 0 || i === s.length - 1) return null;
  return { username: s.slice(0, i), worker: s.slice(i + 1) };
}

/* Returns null (writing nothing) unless the response carries the fields this
   depends on. A partial write here misstates what users are owed. */
export function buildBraiinsAttribution(profileJson, workersJson, accountName) {
  const profile = braiinsUnwrap(profileJson);
  const workersRoot = braiinsUnwrap(workersJson, "workers") || braiinsUnwrap(workersJson);
  if (!profile || !workersRoot || typeof workersRoot !== "object") {
    console.error("[braiins] unexpected envelope — refusing to write");
    return null;
  }
  for (const f of ["current_balance", "all_time_reward", "today_reward"]) {
    if (profile[f] === undefined) {
      console.error(`[braiins] profile is missing "${f}" — refusing to write`);
      return null;
    }
  }

  const rows = [];
  let totalShares = 0, sawShareField = false;
  for (const [label, w] of Object.entries(workersRoot)) {
    if (!w || typeof w !== "object") continue;
    const parsed = parseBraiinsWorkerLabel(label, accountName);
    if (!parsed || parsed.fee) continue;
    if (w.shares_24h !== undefined) sawShareField = true;
    const shares = Number(w.shares_24h || 0);
    totalShares += shares;
    rows.push({
      username: parsed.username,
      worker: parsed.worker,
      shares,
      // Braiins states hash_rate_unit alongside the values; normalising to a
      // number here without honouring it would silently mix Gh/s with Th/s.
      unit: w.hash_rate_unit || null,
      hs_5m: Number(w.hash_rate_5m || 0),
      hs_60m: Number(w.hash_rate_60m || 0),
      hs_24h: Number(w.hash_rate_24h || 0),
      state: w.state || null,
      lastShare: w.last_share ? Number(w.last_share) : null,
    });
  }

  if (rows.length && !sawShareField) {
    console.error('[braiins] no worker carried "shares_24h" — refusing to split revenue');
    return null;
  }

  return {
    account: {
      balance: Number(profile.current_balance || 0),
      allTime: Number(profile.all_time_reward || 0),
      today: Number(profile.today_reward || 0),
    },
    rows,
    totalShares,
  };
}

/* Braiins reports each worker's rate with an explicit hash_rate_unit. Coercing
   those numbers without honouring it would mix Gh/s and Th/s in one column —
   a 1000x error in what a user appears to be contributing, and therefore in
   what they get paid. Everything is normalised to TH/s, which is what the
   dashboard's formatter assumes. */
const HASH_UNIT_TO_TH = {
  "h/s": 1e-12, "kh/s": 1e-9, "mh/s": 1e-6, "gh/s": 1e-3,
  "th/s": 1, "ph/s": 1e3, "eh/s": 1e6,
};
export function toTeraHash(value, unit) {
  const n = Number(value || 0);
  if (!isFinite(n)) return 0;
  if (!unit) return n; // already TH/s by convention
  const f = HASH_UNIT_TO_TH[String(unit).trim().toLowerCase()];
  if (f === undefined) { console.error(`[braiins] unknown hash_rate_unit "${unit}" — treating as TH/s`); return n; }
  return n * f;
}

/* Polls Braiins and writes per-user rows derived from the aggregate account.
   Exactly TWO upstream requests per run: Braiins documents a limit of roughly
   one request per five seconds and warns that sustained overuse can get the
   caller's IP banned, so this must never scale with user count. */
async function pollBraiins(env, adminDb) {
  if ((env.ACTIVE_POOL || "").trim().toLowerCase() !== "braiins") return;
  if (!env.BRAIINS_TOKEN) { console.error("[braiins] ACTIVE_POOL=braiins but BRAIINS_TOKEN is unset — nothing will be polled"); return; }

  const account = env.BRAIINS_ACCOUNT || "hashrial";
  const [profileJson, workersJson] = await Promise.all([
    braiinsFetch(env, "/accounts/profile/json/btc/"),
    braiinsFetch(env, "/accounts/workers/json/btc"),
  ]);

  const attr = buildBraiinsAttribution(profileJson, workersJson, account);
  if (!attr) return; // already logged; writes nothing rather than zeros

  // username -> id, one query rather than one per worker.
  const names = [...new Set(attr.rows.map(r => r.username))];
  if (!names.length) { console.error("[braiins] no worker label resolved to a user — check the naming scheme"); return; }
  const { data: users, error: uErr } = await adminDb.from("users").select("id, username").in("username", names);
  if (uErr) { console.error("[braiins] user lookup failed:", uErr.message); return; }
  const idByName = new Map((users || []).map(u => [u.username, u.id]));

  const unresolved = names.filter(n => !idByName.has(n));
  if (unresolved.length) console.error(`[braiins] ${unresolved.length} label(s) matched no Hashrial user: ${unresolved.slice(0, 5).join(", ")}`);

  // Group per user — a user may run several rigs.
  const byUser = new Map();
  for (const r of attr.rows) {
    const id = idByName.get(r.username);
    if (!id) continue;
    if (!byUser.has(id)) byUser.set(id, []);
    byUser.get(id).push(r);
  }

  const nowIso = new Date().toISOString();
  const workerRows = [], hashRows = [], earnRows = [];

  for (const [userId, rigs] of byUser) {
    let shares = 0, h5 = 0, h60 = 0, h24 = 0, online = 0;
    for (const r of rigs) {
      const t5 = toTeraHash(r.hs_5m, r.unit);
      const t60 = toTeraHash(r.hs_60m, r.unit);
      const t24 = toTeraHash(r.hs_24h, r.unit);
      shares += r.shares; h5 += t5; h60 += t60; h24 += t24;
      // Braiins states: ok / low / off / dis. `low` is a live-but-degraded rig,
      // which the dashboard renders as its own state rather than as offline.
      const status = r.state === "ok" || r.state === "low" ? "online" : "offline";
      if (status === "online") online++;
      workerRows.push({
        user_id: userId, worker_name: r.worker, status,
        last_seen: r.lastShare ? new Date(r.lastShare * 1000).toISOString() : nowIso,
      });
      hashRows.push({ user_id: userId, worker_name: r.worker, hs_10m: t5, hs_1h: t60, hs_1d: t24, accepted: r.shares, stale: 0 });
    }
    hashRows.push({ user_id: userId, worker_name: null, hs_10m: h5, hs_1h: h60, hs_1d: h24, accepted: shares, stale: 0, active_workers: online });

    // Revenue split. Braiins knows one account; this is the only place a user's
    // share of it is decided, which is why it keys on work accepted rather than
    // on hashrate (itself an average).
    const frac = attr.totalShares > 0 ? shares / attr.totalShares : 0;
    earnRows.push({
      user_id: userId,
      balance: +(attr.account.balance * frac).toFixed(12),
      earn_24h: +(attr.account.today * frac).toFixed(12),
      earn_total: +(attr.account.allTime * frac).toFixed(12),
      paid_out: 0,
    });
  }

  const w = await adminDb.from("workers").upsert(workerRows, { onConflict: "user_id,worker_name" });
  if (w.error) console.error("[braiins] workers upsert:", w.error.message);
  const h = await adminDb.from("hashrate_history").insert(hashRows);
  if (h.error) console.error("[braiins] hashrate insert:", h.error.message);
  const e = await adminDb.from("earnings_history").insert(earnRows);
  if (e.error) console.error("[braiins] earnings insert:", e.error.message);

  console.log(`[braiins] ${byUser.size} users, ${workerRows.length} workers, ${attr.totalShares} shares split`);
}

export default {
  // Cron Trigger entrypoint. Without this nothing ever populates the price
  // cache and /public/btcprice returns 503 forever.
  async scheduled(event, env, ctx) {
    let redis;
    try {
      redis = new Redis({ url: env.UPSTASH_REDIS_URL, token: env.UPSTASH_REDIS_TOKEN });
    } catch {
      redis = null;
    }
    const adminDb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    ctx.waitUntil(Promise.allSettled([
      redis ? refreshPriceCache(env, redis) : Promise.resolve(),
      pollBraiins(env, adminDb),
    ]).then(rs => rs.forEach(r => r.status === "rejected" && console.error("[cron]", r.reason?.message || r.reason))));
  },

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

    /* Rate limiting is bucketed by what an endpoint can be ABUSED for, not by
       its URL prefix.

       Everything under /auth/ previously shared one 10-per-15-minutes bucket.
       But /auth/me is a token check that Layout fires on EVERY mount, so simply
       using the app burned the allowance and then locked the user out of
       logging in — with the misleading message "Too many attempts". That was
       latent for as long as rate limiting silently did nothing; enforcing it
       correctly is what exposed the misconfiguration.

       Only endpoints that accept credentials or send mail get the strict
       bucket. Session checks are ordinary reads. */
    const CREDENTIAL_ROUTES = [
      "/auth/login", "/auth/register", "/auth/forgot-password",
      "/auth/reset-password", "/auth/change-password", "/auth/resend-verification",
      "/auth/verify-email",
    ];
    const isCredentialRoute = CREDENTIAL_ROUTES.includes(path);

    if (isCredentialRoute) {
      // Per-endpoint, so exhausting password-reset cannot also block login.
      if (!(await checkRateLimit(redis, `rl:cred:${path}:${ip}`, 10, 900))) {
        return err("Too many attempts. Try again in 15 minutes.", 429, env, request);
      }
    } else if (!(await checkRateLimit(redis, `rl:api:${ip}`, 120, 60))) {
      return err("Too many requests.", 429, env, request);
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
        // Cold cache — build it inline rather than 503ing until the next cron.
        const built = await buildPriceBundle(env);
        if (built) {
          ctx.waitUntil(
            Promise.all([
              redis.set("btcprice:cache", JSON.stringify(built), { ex: PRICE_FRESH_TTL }),
              redis.set("btcprice:stale", JSON.stringify(built), { ex: PRICE_STALE_TTL }),
            ]).catch(() => {})
          );
          return json(built, 200, env, request);
        }
        return json({ error: "Price unavailable" }, 503, env, request);
      } catch { return json({ error: "Failed" }, 500, env, request); }
    }

    if (path === "/pool/stats" && method === "GET") {
      try {
        const c = await redis.get("pool:stats");
        if (c) return json(typeof c === "string" ? JSON.parse(c) : c, 200, env, request);
        // Errors here were previously discarded, so a broken query was
        // indistinguishable from an empty pool and the endpoint just 500'd.
        const { count: u, error: uErr } = await adminDb.from("users").select("*", { count: "exact", head: true });
        if (uErr) console.error("[pool/stats] users count:", uErr.message || JSON.stringify(uErr));
        const { count: w, error: wErr } = await adminDb.from("workers").select("*", { count: "exact", head: true }).eq("status", "online");
        if (wErr) console.error("[pool/stats] workers count:", wErr.message || JSON.stringify(wErr));
        if (uErr && wErr) return json({ error: "Pool stats unavailable" }, 503, env, request);
        const d = { totalUsers: u || 0, activeWorkers: w || 0 };
        await redis.set("pool:stats", JSON.stringify(d), { ex: 60 });
        return json(d, 200, env, request);
      } catch (e) {
        console.error("[pool/stats] threw:", e.message);
        return json({ error: "Failed" }, 500, env, request);
      }
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
        const verifyUrl = `${env.SITE_URL}/verify-email?token=${vToken}`;
        // ctx.waitUntil keeps this alive past the response — without it a
        // Worker can freeze the execution context the instant json()
        // returns, silently dropping the send.
        ctx.waitUntil(sendEmail(env, {
          to: email,
          subject: "Verify your Hashrial account",
          html: `<p>Welcome to Hashrial.</p><p><a href="${verifyUrl}">Click here to verify your email</a>. This link expires in 24 hours.</p><p>If you didn't create this account, you can ignore this email.</p>`,
        }));
        // FIX: previously returned verificationToken directly here — same
        // issue as the Express API. Anyone could self-verify without the
        // token ever reaching the actual email address it's meant to
        // confirm control of. Only the console log below should carry it
        // until real email sending is wired up.
        // The send is fire-and-forget, so the response cannot report delivery.
        // It can at least report whether a sender is configured at all, so the
        // UI stops promising an email that provably cannot leave.
        return json({
          token,
          user: { id: u.id, username: u.username, email: u.email },
          emailSent: !!(env.RESEND_API_KEY && env.EMAIL_FROM),
        }, 200, env, request);
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
          const resetUrl = `${env.SITE_URL}/reset-password?token=${token}`;
          ctx.waitUntil(sendEmail(env, {
            to: email,
            subject: "Reset your Hashrial password",
            html: `<p>Someone requested a password reset for your Hashrial account.</p><p><a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
          }));
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
        // NOTE: no explicit blacklist entry needed. password_changed_at was
        // just set above, and checkTokenBlacklist now rejects any token whose
        // iat predates it — every previously-issued token for this user is
        // invalidated the next time it's used, across every device.
        return json({ ok: true }, 200, env, request);
      } catch (e) { return err("Failed", 500, env, request); }
    }

    /* Re-issue a verification link. Registration's email is fire-and-forget, so
       any failure — an unset key, an unverified sender domain, a transient
       bounce — used to leave the account permanently unreachable with no way
       back except editing the database by hand. */
    if (path === "/auth/resend-verification" && method === "POST") {
      const { email } = body || {};
      if (!email) return err("email required", 400, env, request);
      // Tighter than the general auth limit: this endpoint sends mail, so
      // abuse costs sender reputation, not just CPU.
      if (!(await checkRateLimit(redis, `rl:resendverify:${ip}`, 3, 3600))) {
        return err("Too many requests. Try again in an hour.", 429, env, request);
      }
      try {
        const { data: us } = await adminDb.from("users")
          .select("id, email, email_verified").eq("email", email).limit(1);
        const u = us?.[0];
        if (u && !u.email_verified) {
          // Retire outstanding tokens so only the newest link is live.
          await adminDb.from("email_verification_tokens")
            .update({ used: true }).eq("user_id", u.id).eq("used", false);
          const vToken = randomToken();
          const vHash = await hashToken(vToken);
          await adminDb.from("email_verification_tokens").insert({
            user_id: u.id, token_hash: vHash,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          });
          const verifyUrl = `${env.SITE_URL}/verify-email?token=${vToken}`;
          ctx.waitUntil(sendEmail(env, {
            to: u.email,
            subject: "Verify your Hashrial account",
            html: `<p>Here is a fresh verification link for your Hashrial account.</p><p><a href="${verifyUrl}">Verify your email</a>. This link expires in 24 hours and replaces any earlier link.</p><p>If you didn't request this, you can ignore it.</p>`,
          }));
        }
        // Identical response whether or not the account exists or is already
        // verified — otherwise this is an account-existence oracle.
        return json({ ok: true, message: "If that account exists and is unverified, a new link is on its way." }, 200, env, request);
      } catch (e) {
        console.error(`[resend-verification] ${e.message}`);
        return err("Failed", 500, env, request);
      }
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
        // NOTE: same as reset-password — password_changed_at above is what
        // revokes every existing session now, via checkTokenBlacklist's iat
        // comparison. The previous DELETE here was backwards (it erased
        // revoked entries rather than adding one) and didn't invalidate
        // anything regardless.
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
        // FIX: was N+1 — one hashrate_history query per worker inside
        // Promise.all, so 50 workers = 50 concurrent Supabase queries on
        // every cache miss. Express solves this with LEFT JOIN LATERAL,
        // which Supabase's JS client can't express; this does one query
        // over a 15min window (comfortably covers the ~2min poll) and
        // groups to latest-per-worker in memory. Same result, 1 query.
        const since = new Date(Date.now() - 900000).toISOString();
        const { data: allStats } = await userSupabase
          .from("hashrate_history")
          .select("worker_name,hs_10m,hs_1h,hs_1d,accepted,stale,ts")
          .eq("user_id", user.id)
          .gte("ts", since)
          .order("ts", { ascending: false });
        const latestByWorker = {};
        for (const row of (allStats || [])) {
          if (!latestByWorker[row.worker_name]) latestByWorker[row.worker_name] = row;
        }
        const r = (w || []).map(w2 => ({ ...w2, ...(latestByWorker[w2.worker_name] || {}) }));
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
        if (!(await isValidBtcAddress(addr))) return err("Invalid Bitcoin address (checksum validation failed)", 400, env, request);
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
        // FIX: @upstash/redis's SET takes an options OBJECT (ex, nx as
        // properties), not positional ioredis-style string arguments. The
        // previous call ("EX", 5, "NX") didn't match that API at all, so
        // this atomic lock likely wasn't providing the guarantee it's here
        // for — either erroring out or silently succeeding as a plain
        // unconditional SET with no NX guard and no expiry.
        const lockSet = await redis.set(lockKey, lockValue, { ex: 5, nx: true });
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
