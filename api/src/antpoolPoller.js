"use strict";
const crypto = require("crypto");
const https  = require("https");

const ANTPOOL_API_BASE  = process.env.ANTPOOL_API_BASE  || "https://antpool.com/api";
const POLL_INTERVAL_MS  = parseInt(process.env.API_POLL_INTERVAL_MS || "120000");
const MAX_CONCURRENCY   = 5;
const CYCLE_TIMEOUT_MS  = Math.floor(POLL_INTERVAL_MS * 0.9);

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

// ── Sanity limits ──────────────────────────────────────────────
const MAX_HASHRATE_THS = 1000000; // 1 EH/s — sanity cap
const MAX_EARNINGS_BTC = 1000000; // Sanity cap
const MAX_WORKERS_PER_USER = 5000; // Sanity cap

// ── Poll one user ─────────────────────────────────────────────
async function pollUser(pg, redis, user) {
    const poolIndex = user.pool_index || 1;
    const subAccountPrefix = `hashrial${poolIndex}`;
    try {
        // 1. Account overview (balance + earnings)
        // Antpool sub-account format: hashrial{poolIndex}.username
        const subAccount = `${subAccountPrefix}.${user.username}`;
        const acct = await antpoolPost("account.htm", {
            ...makeAuth(subAccountPrefix),
            userId: subAccount,
        });
        const acctData = acct?.data || {};

        // Validate response sanity
        if (acct?.code !== undefined && acct.code !== 0) {
            console.error(`[poller] ${user.username}: Antpool returned error code ${acct.code}`);
            return;
        }

        // 2. Worker hashrate
        const workers = await antpoolPost("workers.htm", {
            ...makeAuth(subAccountPrefix),
            userId: subAccount,
            pageEnable: 0,
        });
        const workerRows = (workers?.data?.workers || []).slice(0, MAX_WORKERS_PER_USER);

        // 3. Persist earnings snapshot
        const rawBalance  = parseFloat(acctData.balance       || 0);
        const rawEarn24h  = parseFloat(acctData.earn24Hours    || 0);
        const rawEarnTotal = parseFloat(acctData.totalAmount    || 0);
        const rawPaidOut  = parseFloat(acctData.paidAmount     || 0);

        // Sanity checks: reject absurd values
        const balance    = isFinite(rawBalance)    && rawBalance >= 0 && rawBalance < MAX_EARNINGS_BTC ? rawBalance : 0;
        const earn24h    = isFinite(rawEarn24h)    && rawEarn24h >= 0 && rawEarn24h < MAX_EARNINGS_BTC ? rawEarn24h : 0;
        const earnTotal  = isFinite(rawEarnTotal)  && rawEarnTotal >= 0 && rawEarnTotal < MAX_EARNINGS_BTC ? rawEarnTotal : 0;
        const paidOut    = isFinite(rawPaidOut)    && rawPaidOut >= 0 && rawPaidOut < MAX_EARNINGS_BTC ? rawPaidOut : 0;

        if (rawBalance !== balance || rawEarn24h !== earn24h) {
            console.warn(`[poller] ${user.username}: Sanity check triggered (balance: ${rawBalance}, earn24h: ${rawEarn24h}) — clamped`);
        }

        await pg.query(
            `INSERT INTO earnings_history (user_id, balance, earn_24h, earn_total, paid_out)
             VALUES ($1,$2,$3,$4,$5)`,
            [user.id, balance, earn24h, earnTotal, paidOut]
        );

        // 4. Persist account-level hashrate snapshot
        const rawHs10m = parseFloat(acctData.hsLast10m  || 0);
        const rawHs1h  = parseFloat(acctData.hsLast1h   || 0);
        const rawHs1d  = parseFloat(acctData.hsLast1d   || 0);
        const hs10m = isFinite(rawHs10m) && rawHs10m >= 0 && rawHs10m < MAX_HASHRATE_THS ? rawHs10m : 0;
        const hs1h  = isFinite(rawHs1h)  && rawHs1h >= 0  && rawHs1h < MAX_HASHRATE_THS  ? rawHs1h  : 0;
        const hs1d  = isFinite(rawHs1d)  && rawHs1d >= 0  && rawHs1d < MAX_HASHRATE_THS  ? rawHs1d  : 0;
        const activeWorkers = Math.max(0, Math.min(MAX_WORKERS_PER_USER, parseInt(acctData.activeWorker || 0)));

        await pg.query(
            `INSERT INTO hashrate_history (user_id, worker_name, hs_10m, hs_1h, hs_1d, active_workers)
             VALUES ($1, NULL, $2, $3, $4, $5)`,
            [user.id, hs10m, hs1h, hs1d, activeWorkers]
        );

        // 5. Persist per-worker rows + update workers table
        let processedWorkers = 0;
        for (const w of workerRows) {
            const wName  = (w.worker_name  || w.workerId || "").toString().slice(0, 128);
            if (!wName || wName === "unknown" || wName === "") continue; // Skip unnamed workers
            if (processedWorkers >= MAX_WORKERS_PER_USER) break;

            const rawWHs10m = parseFloat(w.hsLast10m || 0);
            const rawWHs1h  = parseFloat(w.hsLast1h  || 0);
            const rawWHs1d  = parseFloat(w.hsLast1d  || 0);
            const wHs10m = isFinite(rawWHs10m) && rawWHs10m >= 0 && rawWHs10m < MAX_HASHRATE_THS ? rawWHs10m : 0;
            const wHs1h  = isFinite(rawWHs1h)  && rawWHs1h >= 0  && rawWHs1h < MAX_HASHRATE_THS  ? rawWHs1h  : 0;
            const wHs1d  = isFinite(rawWHs1d)  && rawWHs1d >= 0  && rawWHs1d < MAX_HASHRATE_THS  ? rawWHs1d  : 0;
            const wAcc   = Math.max(0, parseInt(w.shares || 0));
            const wStale = Math.max(0, parseInt(w.staleShares || 0));
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
            processedWorkers++;
        }

        // Clean up stale workers not seen in the last poll
        if (processedWorkers > 0) {
            await pg.query(
                `UPDATE workers SET status='offline'
                 WHERE user_id=$1 AND status='online'
                 AND last_seen < NOW() - INTERVAL '5 minutes'`,
                [user.id]
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
        // Priority 1: Users with online workers (poll every cycle)
        const { rows: activeUsers } = await pg.query(`
            SELECT DISTINCT u.id, u.username, u.pool_index
            FROM users u
            INNER JOIN workers w ON w.user_id = u.id AND w.status = 'online'
        `);

        // Priority 2: Users active in last 24h but no online workers (poll every 10th cycle)
        const { rows: dormantUsers } = await pg.query(`
            SELECT DISTINCT u.id, u.username, u.pool_index
            FROM users u
            LEFT JOIN workers w ON w.user_id = u.id AND w.status = 'online'
            WHERE w.id IS NULL
              AND u.last_login > NOW() - INTERVAL '24 hours'
            LIMIT 100
        `);

        const users = [...activeUsers, ...dormantUsers];
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
