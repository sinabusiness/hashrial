"use strict";
const crypto = require("crypto");
const https  = require("https");

const ANTPOOL_API_BASE  = process.env.ANTPOOL_API_BASE  || "https://antpool.com/api";
const POLL_INTERVAL_MS  = parseInt(process.env.API_POLL_INTERVAL_MS || "120000");
const MAX_CONCURRENCY   = 3;
const CYCLE_TIMEOUT_MS  = Math.floor(POLL_INTERVAL_MS * 0.8);

let pollRunning = false;

// ── Antpool HMAC auth ─────────────────────────────────────────
function makeAuth(userId) {
    const apiKey    = process.env.ANTPOOL_API_KEY;
    const apiSecret = process.env.ANTPOOL_API_SECRET;
    const nonce     = crypto.randomBytes(16).toString("hex");
    const sig       = crypto.createHmac("sha256", apiSecret)
        .update(userId + apiKey + nonce).digest("hex").toUpperCase();
    return { key: apiKey, nonce, signature: sig, coin: process.env.COIN_TYPE || "BTC" };
}

// ── HTTP POST helper (no external deps) ──────────────────────
function antpoolPost(endpoint, body) {
    return new Promise((resolve, reject) => {
        const formBody = Object.keys(body)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(body[k])}`).join("&");
        const url = new URL(`${ANTPOOL_API_BASE}/${endpoint}`);
        const options = {
            hostname: url.hostname,
            path:     url.pathname + url.search,
            method:   "POST",
            timeout:  10000,
            headers:  {
                "Content-Type":   "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(formBody),
            },
        };
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error("antpool parse error")); }
            });
        });
        req.on("error",   reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("antpool timeout")); });
        req.write(formBody);
        req.end();
    });
}

// ── Poll one user ─────────────────────────────────────────────
async function pollUser(pg, redis, user) {
    const antpoolUserId = process.env.ANTPOOL_USER_ID || "hashrial";
    try {
        // 1. Account overview (balance + earnings)
        const acct = await antpoolPost("account.htm", {
            ...makeAuth(antpoolUserId),
            userId: user.username,
        });
        const acctData = acct?.data || {};

        // 2. Worker hashrate
        const workers = await antpoolPost("workers.htm", {
            ...makeAuth(antpoolUserId),
            userId: user.username,
            pageEnable: 0,
        });
        const workerRows = workers?.data?.workers || [];

        // 3. Persist earnings snapshot
        const balance    = parseFloat(acctData.balance       || 0);
        const earn24h    = parseFloat(acctData.earn24Hours    || 0);
        const earnTotal  = parseFloat(acctData.totalAmount    || 0);
        const paidOut    = parseFloat(acctData.paidAmount     || 0);
        await pg.query(
            `INSERT INTO earnings_history (user_id, balance, earn_24h, earn_total, paid_out)
             VALUES ($1,$2,$3,$4,$5)`,
            [user.id, balance, earn24h, earnTotal, paidOut]
        );

        // 4. Persist account-level hashrate snapshot
        const hs10m = parseFloat(acctData.hsLast10m  || 0);
        const hs1h  = parseFloat(acctData.hsLast1h   || 0);
        const hs1d  = parseFloat(acctData.hsLast1d   || 0);
        const activeWorkers = parseInt(acctData.activeWorker || 0);
        await pg.query(
            `INSERT INTO hashrate_history (user_id, worker_name, hs_10m, hs_1h, hs_1d, active_workers)
             VALUES ($1, NULL, $2, $3, $4, $5)`,
            [user.id, hs10m, hs1h, hs1d, activeWorkers]
        );

        // 5. Persist per-worker rows + update workers table
        for (const w of workerRows) {
            const wName  = w.worker_name  || w.workerId || "unknown";
            const wHs10m = parseFloat(w.hsLast10m || 0);
            const wHs1h  = parseFloat(w.hsLast1h  || 0);
            const wHs1d  = parseFloat(w.hsLast1d  || 0);
            const wAcc   = parseInt(w.shares || 0);
            const wStale = parseInt(w.staleShares || 0);
            const status = wHs10m > 0 ? "online" : "offline";

            // Upsert worker row
            await pg.query(
                `INSERT INTO workers (user_id, worker_name, status, last_seen)
                 VALUES ($1,$2,$3,NOW())
                 ON CONFLICT (user_id, worker_name)
                 DO UPDATE SET status=$3, last_seen=NOW()`,
                [user.id, wName, status]
            );

            // Insert hashrate snapshot
            await pg.query(
                `INSERT INTO hashrate_history (user_id, worker_name, hs_10m, hs_1h, hs_1d, accepted, stale)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [user.id, wName, wHs10m, wHs1h, wHs1d, wAcc, wStale]
            );
        }

        // 6. Cache overview in Redis for fast dashboard response
        const overviewKey = `pool:overview:${user.username}`;
        await redis.set(overviewKey, JSON.stringify({
            earnings: { balance, earn24h, earnTotal, paidOut },
            hashrate: { hs_10m: hs10m, hs_1h: hs1h, hs_1d: hs1d, active_workers: activeWorkers, accepted: 0, stale: 0 },
        }), "EX", Math.floor(POLL_INTERVAL_MS / 1000) + 30);

        // Invalidate workers cache so next request is fresh
        await redis.del(`pool:workers:${user.username}`);

        console.log(`[poller] ${user.username}: balance=${balance} BTC, hs10m=${hs10m} TH/s, workers=${workerRows.length}`);
    } catch (e) {
        console.error(`[poller] ${user.username} error:`, e.message);
    }
}

// ── Run one full poll cycle with bounded concurrency ─────────
async function runPoll(pg, redis) {
    if (pollRunning) { console.warn("[poller] Skipping cycle — previous still running"); return; }
    pollRunning = true;

    const timer = setTimeout(() => {
        console.error("[poller] Cycle timeout — forcing unlock");
        pollRunning = false;
    }, CYCLE_TIMEOUT_MS);

    try {
        const { rows: users } = await pg.query("SELECT id, username FROM users");
        // Process in batches of MAX_CONCURRENCY
        for (let i = 0; i < users.length; i += MAX_CONCURRENCY) {
            const batch = users.slice(i, i + MAX_CONCURRENCY);
            await Promise.all(batch.map(u => pollUser(pg, redis, u)));
        }

        // Update public pool stats cache
        const w = await pg.query("SELECT COUNT(*) FROM workers WHERE status='online'");
        const u = await pg.query("SELECT COUNT(*) FROM users");
        await redis.set("pool:stats", JSON.stringify({
            totalUsers:    parseInt(u.rows[0].count),
            activeWorkers: parseInt(w.rows[0].count),
        }), "EX", 120);
    } catch (e) {
        console.error("[poller] Cycle error:", e.message);
    } finally {
        clearTimeout(timer);
        pollRunning = false;
    }
}

function startAntpoolPoller(pg, redis) {
    // Initial run after 5s to let DB settle
    setTimeout(() => runPoll(pg, redis), 5000);
    setInterval(() => runPoll(pg, redis), POLL_INTERVAL_MS);
    console.log(`[poller] Started — interval ${POLL_INTERVAL_MS / 1000}s, concurrency ${MAX_CONCURRENCY}`);
}

module.exports = { startAntpoolPoller };
